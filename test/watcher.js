#!/usr/bin/env node
// test/watcher.js - the watcher end to end: real HTTP, real JSON wRPC provider against a mock kaspad
// (which judges submissions like rusty-kaspa's serde, storage mass commitment included), a strict
// simulated chain, and the mail outbox read back like an inbox.
//
// Usage: node test/watcher.js

import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import WebSocket, { WebSocketServer } from '../watcher/node_modules/ws/wrapper.mjs';
import * as K from '../core/kaspa.js';
import * as S from '../core/spend.js';
import { buildVault, describe } from '../core/contracts.js';
import { makeCard, registrationMessage } from '../core/card.js';
import { VaultClient } from '../core/vault.js';
import { wrpcJsonProvider } from '../core/provider-wrpc.js';
import { readConfig } from '../watcher/config.js';
import { openStore } from '../watcher/store.js';
import { createMailer } from '../watcher/mail.js';
import { createWatcher } from '../watcher/watcher.js';
import { simChain, mockKaspad } from './sim-chain.js';

let pass = 0, fail = 0;
const ok = (c, what) => { if (c) pass++; else { fail++; console.error('FAIL ' + what); } };

const keys = () => { const priv = K.randomPrivateKey(); return { priv, pub: K.xOnlyPublicKey(priv) }; };
const guardianKey = keys(), hot = keys(), rescue = keys(), thief = keys(), otherGuardian = keys();
const DELAY = 3000n;

// ---- the world ----
const chain = simChain();
const kaspad = await mockKaspad(chain, { WebSocketServer });
const wrpc = wrpcJsonProvider({ url: kaspad.url, WebSocket });
// like a real node right after a submit: for a moment it still lists the coins the new transaction spent
const lag = { on: false, seen: new Map(), stale: new Set() };
const provider = { ...wrpc, name: wrpc.name, close: () => wrpc.close(),
    coins: async addrs => { const k = addrs.join(','); if (lag.stale.has(k)) { lag.stale.delete(k); return lag.seen.get(k); } const c = await wrpc.coins(addrs); lag.seen.set(k, c); return c; },
    submit: async (tx, entries) => { const id = await wrpc.submit(tx, entries); if (lag.on) for (const k of lag.seen.keys()) lag.stale.add(k); return id; } };
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kv-watcher-'));
const silent = { log: () => {}, error: (...a) => process.env.VERBOSE && console.error(...a) };

const server = http.createServer((req, res) => w.handle(req, res));
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const cfg = readConfig({
    GUARDIAN_PRIVKEY: guardianKey.priv, PUBLIC_URL: base, MAIL_TRANSPORT: 'log', DATA_DIR: dataDir, NETWORK: 'mainnet',
    MIN_DELAY_DAA: String(DELAY), KASPA_NODES: kaspad.url, ADMIN_EMAIL: 'admin@example.com', REGISTER_PER_IP_HOUR: '6'
});
const mailer = createMailer(cfg);
const store = openStore(dataDir);
const w = createWatcher({ cfg, provider, mailer, store, log: silent });

const inbox = to => mailer.outbox.filter(m => m.to === to);
const lastLink = (to, kind) => { const m = [...inbox(to)].reverse().find(x => x.text.includes(`/${kind}/`)); const r = m && m.text.match(new RegExp(`/${kind}/([0-9a-f]{48})`)); return r && r[1]; };
async function call(method, p, body, headers = {}) {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': body && typeof body !== 'string' ? 'application/json' : 'application/x-www-form-urlencoded', ...headers }, body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await r.text();
    let data = null; try { data = JSON.parse(text); } catch (e) { data = text; }
    return { status: r.status, data, headers: r.headers };
}

// ---- the owner's vault ----
const pair = buildVault({ hot: hot.pub, guardian: guardianKey.pub, rescue: rescue.pub, delayDaa: DELAY.toString() });
const info = describe(pair);
for (const a of [info.vaultAddress, info.airlockAddress, info.hotAddress, info.rescueAddress]) chain.know(a);
const card = makeCard({ ...pair, watcher: { url: base } });
const signedRegistration = (email, signerPriv = hot.priv, c = card, time = new Date().toISOString(), guardian = guardianKey.pub) => ({
    card: c, email, time, signature: K.signMessage(registrationMessage({ guardian, vaultAddress: c.addresses.vault, email, time }), signerPriv)
});
const OWNER = 'owner@example.com', PARTNER = 'partner@example.com', STRANGER = 'stranger@example.com';
let ipn = 0;
const ip = () => ({ 'X-Real-IP': `10.0.0.${++ipn}` });

// ---- public facts ----
const g = await call('GET', '/v1/guardian', null, { Origin: 'https://kaspavault.com' });
ok(g.status === 200 && g.data.pubkey === guardianKey.pub && g.data.minDelayDaa === DELAY.toString(), '/v1/guardian names the guardian key and the minimum delay');
ok(g.headers.get('access-control-allow-origin') === '*', '/v1/guardian answers browsers (CORS)');

// ---- registrations the watcher must refuse ----
const refused = async (body, code, what) => { const r = await call('POST', '/v1/register', body, ip()); ok(r.status >= 400 && r.data.code === code, `${what}: expected ${code}, got ${r.status} ${JSON.stringify(r.data)}`); };
await refused(signedRegistration(OWNER, rescue.priv), 'SIGNATURE', 'signed by the backup wallet instead of the vault key');
await refused(signedRegistration(OWNER, thief.priv), 'SIGNATURE', 'signed by a stranger');
await refused({ ...signedRegistration(OWNER), email: STRANGER }, 'SIGNATURE', 'email swapped after signing');
await refused(signedRegistration(OWNER, hot.priv, card, new Date(Date.now() - 3600000).toISOString()), 'TIME', 'a signature an hour old (replay)');
const foreign = makeCard(buildVault({ hot: hot.pub, guardian: otherGuardian.pub, rescue: rescue.pub, delayDaa: DELAY.toString() }));
await refused(signedRegistration(OWNER, hot.priv, foreign), 'GUARDIAN', 'a vault built for another watcher');
const quick = makeCard(buildVault({ hot: hot.pub, guardian: guardianKey.pub, rescue: rescue.pub, delayDaa: '600' }));
await refused(signedRegistration(OWNER, hot.priv, quick), 'DELAY', 'a 1-minute waiting time');
const test10 = makeCard(buildVault({ hot: hot.pub, guardian: guardianKey.pub, rescue: rescue.pub, delayDaa: DELAY.toString(), network: 'testnet-10' }));
await refused(signedRegistration(OWNER, hot.priv, test10), 'NETWORK', 'a testnet vault on a mainnet watcher');
const forged = JSON.parse(JSON.stringify(card)); forged.addresses.rescue = K.p2pkAddress('mainnet', thief.pub);
await refused(signedRegistration(OWNER, hot.priv, forged), 'CARD', 'a card whose backup address was edited');
await refused(signedRegistration('not an email'), 'EMAIL', 'a bad email address');
ok(mailer.outbox.length === 0, 'no email was sent for any refused registration');

// ---- register, confirm by link ----
let r = await call('POST', '/v1/register', signedRegistration(OWNER), ip());
ok(r.status === 202 && r.data.status === 'pending', 'a signed registration is accepted as pending');
const confirmMail = inbox(OWNER)[0];
ok(confirmMail && confirmMail.text.includes(info.rescueAddress) && confirmMail.text.includes(info.vaultAddress), 'the confirmation email shows the vault and the backup wallet');
const firstTok = lastLink(OWNER, 'confirm');
r = await call('POST', '/v1/register', signedRegistration(OWNER), ip());
ok(r.data.status === 'pending' && inbox(OWNER).length === 2 && lastLink(OWNER, 'confirm') !== firstTok, 'asking again sends a fresh link (the first may never have arrived)');
ok((await call('GET', `/confirm/${firstTok}`)).status === 404, 'the fresh link replaces the old one');
for (let i = 0; i < 3; i++) await call('POST', '/v1/register', signedRegistration(OWNER), ip());
ok(inbox(OWNER).length === 4, `at most 3 fresh links an hour for one vault and address (${inbox(OWNER).length - 1} sent)`);
const ctok = lastLink(OWNER, 'confirm');
r = await call('GET', `/confirm/${ctok}`);
ok(r.status === 200 && String(r.data).includes(info.rescueAddress), 'the confirm page shows the backup wallet');
ok(r.headers.get('content-security-policy') && r.headers.get('referrer-policy') === 'no-referrer', 'pages carry strict security headers');
ok((await call('GET', `/v1/status/${info.vaultAddress}`)).data.watched === false, 'visiting the confirm link (a mail scanner) does not confirm');
r = await call('POST', `/confirm/${ctok}`, '');
ok(r.status === 200 && (await call('GET', `/v1/status/${info.vaultAddress}`)).data.watched === true, 'pressing Confirm starts watching');
ok(inbox(OWNER).some(m => m.subject.includes('being watched')), 'the owner gets the "being watched" email');
ok((await call('POST', `/confirm/${ctok}`, '')).status === 404, 'a confirm link works once');

// a second address for the same vault (the owner's partner), and a stranger who cannot sign
r = await call('POST', '/v1/register', signedRegistration(PARTNER), ip());
await call('POST', `/confirm/${lastLink(PARTNER, 'confirm')}`, '');
ok(store.vault(info.vaultAddress).subscribers.length === 2, 'a second confirmed address on the same vault');
await refused(signedRegistration(STRANGER, thief.priv), 'SIGNATURE', 'a stranger cannot subscribe to someone else\'s vault');

// ---- money in, a withdrawal the owner made: alert, then the watcher releases it ----
const owner = new VaultClient(pair, { provider });
const hotSigner = S.keySigner(hot.priv);
chain.fund(info.hotAddress, 500);
await owner.deposit({ signer: hotSigner, amount: K.kasToSompi('200') });
await owner.deposit({ signer: hotSigner, amount: K.kasToSompi('50') });
chain.advance(30n);
ok(kaspad.calls.includes('submitTransaction'), 'deposits went through the JSON wRPC provider (storage mass commitment accepted)');
const snap1 = await owner.snapshot();
await owner.withdraw({ signer: hotSigner, coins: [snap1.vaultCoins.find(c => c.amount === K.kasToSompi('50'))] });
await w.poll();
ok(inbox(OWNER).some(m => m.subject.startsWith('Withdrawal started')) && inbox(PARTNER).some(m => m.subject.startsWith('Withdrawal started')), 'both addresses get the withdrawal alert');
const alertsBefore = mailer.outbox.filter(m => m.subject.startsWith('Withdrawal started')).length;
await w.poll();
ok(mailer.outbox.filter(m => m.subject.startsWith('Withdrawal started')).length === alertsBefore, 'one alert per withdrawal, not one per poll');
const hotBefore = chain.balance(info.hotAddress);
chain.advance(DELAY - 10n);
await w.poll();
ok(chain.balance(info.hotAddress) === hotBefore, 'the watcher does not release early');
chain.advance(10n + S.SEQ_MARGIN_DAA);
await w.poll();
ok(chain.balance(info.hotAddress) > hotBefore + K.kasToSompi('49.99') && chain.balance(info.airlockAddress) === 0n, 'after the delay the watcher releases it to the vault\'s wallet');
ok(inbox(OWNER).some(m => m.subject.startsWith('Withdrawal complete')), 'and emails that it landed');

// ---- a withdrawal the owner did NOT make: the button moves everything to the backup wallet ----
await owner.withdraw({ signer: hotSigner, coins: (await owner.snapshot()).vaultCoins });      // "the thief", holding the hot key
await owner.deposit({ signer: hotSigner, amount: K.kasToSompi('100') });                         // and money still in the vault
chain.advance(30n);
await w.poll();
const rtok = lastLink(OWNER, 'rescue');
r = await call('GET', `/rescue/${rtok}`);
ok(r.status === 200 && String(r.data).includes(info.rescueAddress) && String(r.data).includes('299.'), 'the rescue page shows everything (vault + on its way out) and where it goes');
ok(chain.balance(info.vaultAddress) > 0n, 'opening the rescue page moves nothing');
lag.on = true;
r = await call('POST', `/rescue/${rtok}`, '');
lag.on = false; lag.stale.clear();
ok(r.status === 200 && !String(r.data).includes('could not be moved'), 'a node still listing the just-spent coins does not make the rescue look unfinished');
ok(r.status === 200 && chain.balance(info.vaultAddress) === 0n && chain.balance(info.airlockAddress) === 0n, 'pressing the button empties the vault and the airlock');
ok(chain.balance(info.rescueAddress) > K.kasToSompi('299.9'), `the backup wallet holds ${K.kasStr(chain.balance(info.rescueAddress))} KAS`);
ok(inbox(OWNER).some(m => m.subject.startsWith('Done')) && inbox(PARTNER).some(m => m.subject.startsWith('Done')), 'both addresses are told it is done');
ok(chain.ledger.slice(-2).every(t => t.to.every(a => a === info.rescueAddress)), 'every guardian transaction paid the backup wallet and nothing else');
chain.advance(DELAY * 2n);
await w.poll();
ok(chain.balance(info.hotAddress) < K.kasToSompi('300'), 'nothing was released to the hot wallet after the rescue');

// ---- lost access: a rescue link on request, only to a confirmed address ----
await owner.deposit({ signer: hotSigner, amount: K.kasToSompi('20') });
const before = mailer.outbox.length;
r = await call('POST', '/v1/lost', { vaultAddress: info.vaultAddress, email: STRANGER }, ip());
ok(r.status === 202 && mailer.outbox.length === before, 'a lost-access request for an unknown address sends nothing (same answer either way)');
r = await call('POST', '/v1/lost', { vaultAddress: info.vaultAddress, email: OWNER }, ip());
ok(r.status === 202 && inbox(OWNER).at(-1).subject === 'Your vault rescue link', 'a lost-access request for the owner emails the owner a rescue link');
await call('POST', `/rescue/${lastLink(OWNER, 'rescue')}`, '');
ok(chain.balance(info.vaultAddress) === 0n, 'the requested rescue link works without any withdrawal in progress (lost device)');

// ---- unsubscribe takes only that address ----
const utok = (inbox(PARTNER).find(m => m.subject.includes('being watched')).text.match(/unsubscribe\/([0-9a-f]{48})/) || [])[1];
ok((await call('GET', `/unsubscribe/${utok}`)).status === 200 && store.vault(info.vaultAddress).subscribers.length === 2, 'the unsubscribe page alone changes nothing');
await call('POST', `/unsubscribe/${utok}`, '');
const subs = store.vault(info.vaultAddress).subscribers.map(s => s.email);
ok(subs.length === 1 && subs[0] === OWNER, 'unsubscribing removes only that address');

// ---- limits ----
for (let i = 0; i < 7; i++) r = await call('POST', '/v1/register', signedRegistration(`x${i}@example.com`), { 'X-Real-IP': '10.9.9.9' });
ok(r.status === 429, 'registrations are rate-limited per address');
ok((await call('GET', '/rescue/' + 'ab'.repeat(24))).status === 404, 'a made-up rescue token gets nothing');
const health = await call('GET', '/health');
ok(health.data.ok && health.data.watching === 1 && health.data.guardian === guardianKey.pub, 'health reports one vault watched');

// ---- the files on disk ----
const disk = fs.readFileSync(path.join(dataDir, 'tokens.json'), 'utf8') + fs.readFileSync(path.join(dataDir, 'pending.json'), 'utf8');
ok(!disk.includes(rtok) && !disk.includes(ctok), 'raw tokens never touch the disk (only their hashes)');
ok((fs.statSync(path.join(dataDir, 'vaults.json')).mode & 0o077) === 0, 'data files are private to the watcher user');

server.close(); wrpc.close(); await kaspad.close();
console.log(`chain: ${chain.ledger.length} transactions; mail: ${mailer.outbox.length} emails; wRPC calls: ${kaspad.calls.length}`);
console.log(`\n${fail ? 'FAILED' : 'PASSED'}: ${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
