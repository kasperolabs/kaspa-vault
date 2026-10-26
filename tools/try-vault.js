#!/usr/bin/env node
// tools/try-vault.js - a real vault from the command line, for drills before the widget exists.
//
// It keeps one file (try-vault.json, private) holding the vault's hot key and its card. Use small
// amounts. The backup wallet is yours (Kasware/Kastle/Kaspire address); the watcher is a live one.
//
//   node tools/try-vault.js new --watcher https://watch.kaspavault.com --backup kaspa:q... --email you@example.com [--delay 3000]
//   node tools/try-vault.js status                 balances, what is waiting, when it lands
//   node tools/try-vault.js address                where to send KAS to fund the vault's wallet
//   node tools/try-vault.js deposit 5|all          vault's wallet -> vault
//   node tools/try-vault.js withdraw all|<KAS>     vault -> airlock (the watcher emails you now)
//   node tools/try-vault.js release                airlock -> vault's wallet, after the waiting time
//   node tools/try-vault.js send kaspa:q... 5|all  vault's wallet -> anywhere (to get your KAS back)
//   node tools/try-vault.js lost                   ask the watcher to email you a rescue link
//   options: --file try-vault.json   --node https://api.kaspa.org | ws://127.0.0.1:18110
//
// --delay is in DAA (10 per second): 3000 = 5 minutes, 864000 = 24 hours. The watcher must allow it.

import fs from 'fs';
import { buildVault, describe, keyOf } from '../core/contracts.js';
import { makeCard, openCard, registrationMessage } from '../core/card.js';
import { VaultClient } from '../core/vault.js';
import { keySigner } from '../core/spend.js';
import { restProvider } from '../core/provider.js';
import * as K from '../core/kaspa.js';

const raw = process.argv.slice(2);
const opt = (n, d) => { const i = raw.indexOf(n); return i >= 0 ? raw[i + 1] : d; };
// positional words, wherever the --options sit (every option here takes one value)
const argv = raw.filter((a, i) => !a.startsWith('--') && !(i > 0 && raw[i - 1].startsWith('--')));
const cmd = argv[0];
const FILE = opt('--file', 'try-vault.json');
const die = m => { console.error('try-vault: ' + m); process.exit(1); };
const amountArg = a => (a === 'all' ? { all: true } : { amount: K.kasToSompi(a) });

async function provider() {
    const node = opt('--node', 'https://api.kaspa.org');
    if (/^wss?:/.test(node)) {
        const { wrpcJsonProvider } = await import('../core/provider-wrpc.js');
        const WebSocket = globalThis.WebSocket || (await import('../watcher/node_modules/ws/wrapper.mjs')).default;
        return wrpcJsonProvider({ url: node, WebSocket });
    }
    return restProvider({ url: node });
}
function load() {
    if (!fs.existsSync(FILE)) die(`no ${FILE}; start with: new --watcher … --backup … --email …`);
    const s = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const pair = openCard(s.card);
    return { s, pair, signer: keySigner(s.hotPriv) };
}
const eta = ms => ms <= 0 ? 'now' : ms < 3600000 ? `in ${Math.ceil(ms / 60000)} min` : `in ${(ms / 3600000).toFixed(1)} h`;

if (cmd === 'new') {
    if (fs.existsSync(FILE)) die(`${FILE} already exists; use --file for another vault`);
    const watcher = String(opt('--watcher', '')).replace(/\/+$/, '');
    const backup = opt('--backup'), email = opt('--email'), delay = opt('--delay', '864000');
    if (!watcher || !backup || !email) die('new needs --watcher, --backup and --email');
    const g = await (await fetch(`${watcher}/v1/guardian`)).json();
    if (!/^[0-9a-f]{64}$/.test(String(g.pubkey))) die('the watcher did not name a guardian key');
    console.log(`watcher  ${g.name} (${g.network}), guardian ${g.pubkey}, minimum delay ${g.minDelayDaa} DAA`);
    const hotPriv = K.randomPrivateKey();
    const pair = buildVault({ hot: K.xOnlyPublicKey(hotPriv), guardian: g.pubkey, rescue: keyOf(backup, 'backup'), delayDaa: delay, network: g.network });
    const card = makeCard({ ...pair, watcher: { url: watcher, name: g.name } });
    fs.writeFileSync(FILE, JSON.stringify({ hotPriv, card, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
    const time = new Date().toISOString();
    const signature = K.signMessage(registrationMessage({ guardian: g.pubkey, vaultAddress: card.addresses.vault, email, time }), hotPriv);
    const r = await fetch(`${watcher}/v1/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card, email, time, signature }) });
    const d = await r.json();
    console.log(`vault    ${card.addresses.vault}\nairlock  ${card.addresses.airlock}\nwallet   ${card.addresses.hot}   (fund this one)\nbackup   ${card.addresses.rescue}`);
    console.log(`delay    ${delay} DAA (${Number(delay) / 600} min)`);
    console.log(r.ok ? `watcher  ${d.status}: check ${email} and press Confirm` : `watcher  refused: ${d.error}`);
    console.log(`saved    ${FILE} (holds the vault's key; keep it private, delete it when done)`);
    process.exit(r.ok ? 0 : 1);
}

const { s, pair, signer } = load();
const v = new VaultClient(pair, { provider: await provider() });

if (cmd === 'status') {
    const x = await v.snapshot();
    console.log(`wallet   ${K.kasStr(x.balances.hot)} KAS   ${pair.info.hotAddress}`);
    console.log(`vault    ${K.kasStr(x.balances.vault)} KAS in ${x.vaultCoins.length} coin(s)   ${pair.info.vaultAddress}`);
    console.log(`waiting  ${K.kasStr(x.balances.pending)} KAS in ${x.pending.length} coin(s)`);
    for (const p of x.pending) console.log(`         ${K.kasStr(p.amount)} KAS lands ${eta(p.etaMs)}${p.ready ? ' (ready: run release)' : ''}`);
    const watcher = s.card.watcher && s.card.watcher.url;
    if (watcher) { try { const st = await (await fetch(`${watcher}/v1/status/${pair.info.vaultAddress}`)).json(); console.log(`watched  ${st.watched ? 'yes' : 'NO (confirm the email?)'}, watcher last polled ${st.lastPoll || 'never'}`); } catch (e) { console.log(`watched  could not reach ${watcher}`); } }
} else if (cmd === 'address') {
    console.log(pair.info.hotAddress);
} else if (cmd === 'deposit') {
    const r = await v.deposit({ signer, ...amountArg(argv[1] || 'all') });
    console.log(`deposited ${K.kasStr(r.amount)} KAS (fee ${K.kasStr(r.fee)})  https://explorer.kaspa.org/txs/${r.txid}`);
} else if (cmd === 'withdraw') {
    const x = await v.snapshot();
    const coins = !argv[1] || argv[1] === 'all' ? x.vaultCoins : VaultClient.pickCoins(x.vaultCoins, K.kasToSompi(argv[1]));
    const r = await v.withdraw({ signer, coins });
    for (const t of r.started) console.log(`started  ${K.kasStr(t.amount)} KAS (${t.coins.length} coin(s), fee ${K.kasStr(t.fee)})  https://explorer.kaspa.org/txs/${t.txid}`);
    for (const f of r.failed) console.log(`failed   ${f.error}`);
    if (r.started.length) console.log('the watcher should email you within a poll or two');
} else if (cmd === 'release') {
    const r = await v.release();
    for (const t of r.released) console.log(`released ${K.kasStr(t.amount)} KAS  https://explorer.kaspa.org/txs/${t.txid}`);
    for (const p of r.waiting) console.log(`waiting  ${K.kasStr(p.amount)} KAS lands ${eta(p.etaMs)}`);
    for (const f of r.failed) console.log(`failed   ${f.error}`);
    if (!r.released.length && !r.waiting.length) console.log('nothing waiting');
} else if (cmd === 'send') {
    const to = argv[1];
    if (!to) die('send needs an address');
    const r = await v.sendFromHot({ signer, to, ...amountArg(argv[2] || 'all') });
    console.log(`sent ${K.kasStr(r.amount)} KAS to ${to} (fee ${K.kasStr(r.fee)})  https://explorer.kaspa.org/txs/${r.txid}`);
} else if (cmd === 'lost') {
    const watcher = s.card.watcher && s.card.watcher.url;
    const email = opt('--email') || die('lost needs --email (the confirmed address)');
    const r = await fetch(`${watcher}/v1/lost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vaultAddress: pair.info.vaultAddress, email }) });
    console.log(r.ok ? `asked; if ${email} is confirmed for this vault, a rescue link is on its way` : `refused: ${(await r.json()).error}`);
} else {
    die('commands: new, status, address, deposit, withdraw, release, send, lost');
}
process.exit(0);
