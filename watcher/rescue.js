#!/usr/bin/env node
// watcher/rescue.js - the emergency without the server. Moves everything in one vault to its backup
// wallet from any machine that has the guardian key and the vault card (or a vault this watcher knows).
// No email, no HTTP. Use it when the watcher box is gone, or to do a rescue by hand.
//
//   node rescue.js --vault kaspa:p...                a vault in DATA_DIR/vaults.json
//   node rescue.js --card vault-card.json            the owner's vault card
//   options: --key <64 hex>        guardian key (default GUARDIAN_PRIVKEY from .env)
//            --node <url>          ws://host:18110 (JSON wRPC) or https://api.kaspa.org (REST); default KASPA_NODES
//            --dry                 show what would move; sign and send nothing
//            --yes                 skip the confirmation prompt
//
// The contracts only let the guardian key pay the vault's own backup wallet, so the worst this
// script can do is exactly what it says.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import WebSocket from 'ws';
import { loadDotEnv } from './config.js';
import { openStore } from './store.js';
import { openCard } from '../core/card.js';
import { VaultClient } from '../core/vault.js';
import { keySigner } from '../core/spend.js';
import { restProvider, fallbackProvider } from '../core/provider.js';
import { wrpcJsonProvider } from '../core/provider-wrpc.js';
import * as K from '../core/kaspa.js';

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const flag = n => argv.includes(n);
const die = m => { console.error('rescue: ' + m); process.exit(1); };
const env = { ...loadDotEnv(), ...process.env };

const priv = String(opt('--key') || env.GUARDIAN_PRIVKEY || '').toLowerCase();
if (!/^[0-9a-f]{64}$/.test(priv)) die('guardian key missing: --key <hex> or GUARDIAN_PRIVKEY in .env');
const guardian = keySigner(priv);

let card;
if (opt('--card')) card = JSON.parse(fs.readFileSync(opt('--card'), 'utf8'));
else if (opt('--vault')) {
    const v = openStore(path.resolve(path.dirname(fileURLToPath(import.meta.url)), env.DATA_DIR || 'data')).vault(opt('--vault'));
    if (!v) die(`no vault ${opt('--vault')} in the data folder`);
    card = v.card;
} else die('say which vault: --vault kaspa:p… or --card vault-card.json');

const pair = openCard(card);
if (pair.info.guardian !== guardian.publicKey) die(`this key is not the guardian of that vault (vault names ${pair.info.guardian.slice(0, 12)}…)`);
const nodes = String(opt('--node') || env.KASPA_NODES || 'https://api.kaspa.org').split(',').map(s => s.trim()).filter(Boolean);
const provider = fallbackProvider(nodes.map(u => /^wss?:/.test(u) ? wrpcJsonProvider({ url: u, WebSocket }) : restProvider({ url: u })));
const client = new VaultClient(pair, { provider });

const snap = await client.snapshot();
const sum = l => l.reduce((a, c) => a + c.amount, 0n);
console.log(`vault    ${pair.info.vaultAddress}`);
console.log(`airlock  ${pair.info.airlockAddress}`);
console.log(`backup   ${pair.info.rescueAddress}`);
console.log(`node     ${provider.name}${flag('--dry') ? '   (dry run)' : ''}`);
console.log(`on its way out: ${K.kasStr(sum(snap.airlockCoins))} KAS in ${snap.airlockCoins.length} coin(s); in the vault: ${K.kasStr(sum(snap.vaultCoins))} KAS in ${snap.vaultCoins.length} coin(s)`);
if (!snap.airlockCoins.length && !snap.vaultCoins.length) { console.log('nothing to move'); process.exit(0); }
if (flag('--dry')) process.exit(0);
if (!flag('--yes')) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const a = await new Promise(r => rl.question(`Move ${K.kasStr(sum(snap.airlockCoins) + sum(snap.vaultCoins))} KAS to ${pair.info.rescueAddress}? type MOVE: `, x => { rl.close(); r(x); }));
    if (a.trim() !== 'MOVE') die('aborted');
}
const r = await client.emergency({ guardian });
for (const m of r.moved) console.log(`  ${m.entry.padEnd(8)} ${K.kasStr(m.amount)} KAS  https://explorer.kaspa.org/txs/${m.txid}`);
for (const f of r.failed) console.log(`  FAILED ${f.entry}: ${f.error}`);
console.log(r.failed.length ? 'some coins did not move; run it again' : 'done');
process.exit(r.failed.length ? 2 : 0);
