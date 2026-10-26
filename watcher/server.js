#!/usr/bin/env node
// watcher/server.js - start the watcher: config, providers (local node first, public API second),
// mailer, store, HTTP on 127.0.0.1, and the poll loop.

import http from 'http';
import WebSocket from 'ws';
import { readConfig } from './config.js';
import { openStore } from './store.js';
import { createMailer } from './mail.js';
import { createWatcher } from './watcher.js';
import { restProvider, fallbackProvider } from '../core/provider.js';
import { wrpcJsonProvider } from '../core/provider-wrpc.js';

let cfg;
try { cfg = readConfig(); } catch (e) { console.error(e.message); process.exit(1); }

const providers = cfg.nodes.map(u => /^wss?:\/\//.test(u) ? wrpcJsonProvider({ url: u, WebSocket }) : restProvider({ url: u }));
const provider = fallbackProvider(providers, { onSwitch: (name, err) => console.error(`[watcher] using ${name} (${err && err.message})`) });
const store = openStore(cfg.dataDir);
const mailer = createMailer(cfg);
const w = createWatcher({ cfg, provider, mailer, store });

console.log(`[watcher] ${cfg.name} v${cfg.version}, ${cfg.network}, guardian ${cfg.guardianPub}`);
console.log(`[watcher] nodes ${provider.name}; mail ${cfg.mail.transport}; min delay ${cfg.minDelayDaa} DAA; release ${cfg.release ? 'on' : 'off'}`);
console.log(`[watcher] watching ${store.watched().length} vault(s); data in ${cfg.dataDir}`);

const server = http.createServer(w.handle);
server.headersTimeout = 15000;
server.requestTimeout = 20000;
server.listen(cfg.port, cfg.host, () => console.log(`[watcher] listening on ${cfg.host}:${cfg.port}, public ${cfg.publicUrl}`));

setTimeout(() => w.poll(), 3000);
setInterval(() => w.poll(), cfg.pollMs);
setInterval(() => store.sweep(), 3600000);

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { console.log(`[watcher] ${sig}, stopping`); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000); });
