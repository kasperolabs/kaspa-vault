#!/usr/bin/env node
// test/dev-world.js - everything on one machine, no money: a simulated chain, a mock kaspad (JSON
// wRPC), a real watcher with a log mailbox, and a small control API. For developing and drilling the
// widget and the CLI without touching mainnet.
//
//   node test/dev-world.js [--realtime] [--delay 3000]
//
//   kaspad (mock)   ws://127.0.0.1:18210
//   watcher         http://127.0.0.1:7399
//   control         http://127.0.0.1:7398
//       POST /fund     { address, kas }      create a coin at an address
//       POST /advance  { daa }               move the clock forward (DAA, 10 per second)
//       GET  /mail                           every email the watcher sent (newest last)
//       GET  /ledger                         every transaction the chain accepted
//       GET  /balance/<address>              what an address holds
//
// --realtime advances the DAA 10 per second like mainnet.

import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import WebSocket, { WebSocketServer } from '../watcher/node_modules/ws/wrapper.mjs';
import * as K from '../core/kaspa.js';
import { wrpcJsonProvider } from '../core/provider-wrpc.js';
import { readConfig } from '../watcher/config.js';
import { openStore } from '../watcher/store.js';
import { createMailer } from '../watcher/mail.js';
import { createWatcher } from '../watcher/watcher.js';
import { simChain, mockKaspad } from './sim-chain.js';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const chain = simChain();
const kaspad = await mockKaspad(chain, { WebSocketServer });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kv-devworld-'));
const guardianPriv = K.randomPrivateKey();
const cfg = readConfig({
    GUARDIAN_PRIVKEY: guardianPriv, PUBLIC_URL: 'http://127.0.0.1:7399', SITE_URL: 'http://127.0.0.1:8080', MAIL_TRANSPORT: 'log',
    DATA_DIR: dataDir, MIN_DELAY_DAA: opt('--delay', '3000'), KASPA_NODES: kaspad.url, POLL_MS: '5000', REGISTER_PER_IP_HOUR: '1000', WATCHER_NAME: 'dev-world'
});
const provider = wrpcJsonProvider({ url: kaspad.url, WebSocket });
const mailer = createMailer(cfg);
const w = createWatcher({ cfg, provider, mailer, store: openStore(dataDir), log: { log: m => console.log(m), error: (...a) => console.error(...a) } });
http.createServer(w.handle).listen(7399, '127.0.0.1');
await w.poll();                                  // healthy from the first page load
setInterval(() => w.poll(), cfg.pollMs);
if (argv.includes('--realtime')) setInterval(() => chain.advance(10n), 1000);

const send = (res, s, o) => { res.writeHead(s, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(JSON.stringify(o, (k, v) => typeof v === 'bigint' ? v.toString() : v, 1)); };
http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    let body = ''; for await (const c of req) body += c;
    const b = body ? JSON.parse(body) : {};
    if (req.method === 'POST' && req.url === '/fund') { chain.fund(b.address, b.kas); return send(res, 200, { ok: true, balance: K.kasStr(chain.balance(b.address)) }); }
    if (req.method === 'POST' && req.url === '/advance') { chain.advance(BigInt(b.daa)); await w.poll(); return send(res, 200, { daa: chain.daa() }); }
    if (req.url === '/mail') return send(res, 200, mailer.outbox.map(m => ({ to: m.to, subject: m.subject, text: m.text, at: m.at })));
    if (req.url === '/ledger') return send(res, 200, chain.ledger);
    if (req.url.startsWith('/balance/')) { const a = decodeURIComponent(req.url.slice(9)); return send(res, 200, { address: a, kas: K.kasStr(chain.balance(a)), coins: chain.count(a) }); }
    send(res, 404, { error: 'not found' });
}).listen(7398, '127.0.0.1');

// the real-node wRPC port for tools: also expose the mock on a fixed port
const fixed = new WebSocketServer({ port: 18210, host: '127.0.0.1' });
fixed.on('connection', client => {
    const upstream = new WebSocket(kaspad.url);
    const queue = [];
    upstream.on('open', () => { for (const m of queue) upstream.send(m); queue.length = 0; });
    client.on('message', m => upstream.readyState === 1 ? upstream.send(String(m)) : queue.push(String(m)));
    upstream.on('message', m => client.send(String(m)));
    client.on('close', () => upstream.close());
});

console.log(`dev world up (no money anywhere)
  kaspad (mock)  ws://127.0.0.1:18210
  watcher        http://127.0.0.1:7399     guardian ${cfg.guardianPub}, min delay ${cfg.minDelayDaa} DAA
  control        http://127.0.0.1:7398     POST /fund {address,kas}, POST /advance {daa}, GET /mail, GET /ledger
  data           ${dataDir}`);
