#!/usr/bin/env node
// watcher/node-check.js - before going live, check every node in KASPA_NODES the way the watcher
// will use it. Moves no money.
//
//   1. connect, read the virtual DAA score and the fee estimate
//   2. read the coins of a busy address and check every script against its address
//   3. submit a transaction that spends a coin that does not exist: the node must refuse it, and the
//      transaction id it names must be the one this code computed (it parsed exactly what we built,
//      storage mass commitment included)
//
//   node node-check.js                     every node in KASPA_NODES (.env)
//   node node-check.js ws://127.0.0.1:18110

import WebSocket from 'ws';
import { loadDotEnv } from './config.js';
import { restProvider } from '../core/provider.js';
import { wrpcJsonProvider } from '../core/provider-wrpc.js';
import * as K from '../core/kaspa.js';
import * as S from '../core/spend.js';

const env = { ...loadDotEnv(), ...process.env };
const nodes = (process.argv[2] || env.KASPA_NODES || 'ws://127.0.0.1:18110,https://api.kaspa.org').split(',').map(s => s.trim()).filter(Boolean);
const network = env.NETWORK || 'mainnet';
const BUSY = network === 'mainnet' ? 'kaspa:qqkqkzjvr7zwxxmjxjkmxxdwju9kjs6e9u82uh59z07vgaks6gg62v8707g73' : null;
let bad = 0;

for (const url of nodes) {
    const p = /^wss?:/.test(url) ? wrpcJsonProvider({ url, WebSocket, timeoutMs: 15000 }) : restProvider({ url });
    console.log(`\n${p.name}`);
    try {
        const daa = await p.virtualDaa();
        console.log(`  ok    virtual DAA ${daa}`);
        console.log(`  ok    fee rate ${await p.feeRate()} sompi/gram`);
        if (BUSY) { const c = await p.coins([BUSY]); console.log(`  ok    ${c.length} coins read, every script matches its address`); }
        const priv = K.randomPrivateKey(), me = K.addressOfKey(network, priv);
        const fake = [{ address: me, txid: K.randomPrivateKey(), index: 0, amount: 1234567890123n, blockDaaScore: 1n, spk: K.scriptPublicKey(me) }];
        const signed = await S.sign(S.payment({ coins: fake, from: me, to: me, amount: 98765432101n }), S.keySigner(priv));
        try { await p.submit(signed.tx, signed.entries); console.log('  FAIL  the node accepted a spend of a coin that does not exist'); bad++; }
        catch (e) {
            const m = String(e.message).match(/transaction ([0-9a-f]{64})/i) || String(e.message).match(/([0-9a-f]{64})/);
            if (m && m[1] === signed.txid) console.log(`  ok    submit format: the node refused a made-up coin and named our id ${signed.txid.slice(0, 16)}…`);
            else { console.log(`  ??    the node refused, but its message does not name our id: ${String(e.message).slice(0, 200)}`); bad++; }
        }
    } catch (e) { console.log(`  FAIL  ${e.message}`); bad++; }
    if (p.close) p.close();
}
console.log(bad ? `\n${bad} problem(s)` : '\nall nodes usable');
process.exit(bad ? 1 : 0);
