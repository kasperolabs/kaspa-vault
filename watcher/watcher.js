// watcher/watcher.js - the guardian for kaspa-vault, as a request handler plus a poll loop.
//
//   const w = createWatcher({ cfg, provider, mailer, store })
//   http.createServer(w.handle); setInterval(w.poll, cfg.pollMs)
//
// Trust model (no site, no backend, no shared secret):
//   - Anyone may ask to have a vault watched, but the request must be signed by the vault's hot key
//     (only the owner's browser or wallet has it), and the email must be confirmed by a link.
//   - A vault may have several confirmed emails. Nothing the hot key signs can remove an email;
//     only that email's own link can. So a thief holding the hot key can add themselves, but the
//     owner keeps hearing about every withdrawal.
//   - The watcher derives everything from the card: the covenants are rebuilt from the keys and the
//     delay, so it watches exactly what the owner will spend from. It refuses cards that name another
//     guardian, another network, or a delay shorter than MIN_DELAY_DAA.
//   - Its key can only move vault money to that vault's own backup wallet (the contracts' rule, and
//     checked again before every signature).
//
// HTTP:
//   GET  /v1/guardian                   public facts the vault builder needs (CORS)
//   POST /v1/register                   { card, email, time, signature }   (CORS)
//   GET  /v1/status/:vaultAddress       { watched } (CORS)
//   POST /v1/lost                       { vaultAddress, email }: email a rescue link to a confirmed address (CORS)
//   GET|POST /confirm/:token            confirm an email
//   GET|POST /rescue/:token             move everything to the backup wallet
//   GET|POST /unsubscribe/:token        stop emails for one address
//   GET  /health

import * as K from '../core/kaspa.js';
import { openCard, makeCard, registrationMessage } from '../core/card.js';
import { VaultClient } from '../core/vault.js';
import * as S from '../core/spend.js';
import { pages, SECURITY_HEADERS } from './pages.js';

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/;
const LONG = 10 * 365 * 24 * 3600 * 1000;
const RESCUE_LINK_MS = 24 * 3600 * 1000;

function fail(status, code, message) { const e = new Error(message); e.status = status; e.code = code; return e; }

export function createWatcher({ cfg, provider, mailer, store, log = console }) {
    const guardian = S.keySigner(cfg.guardianPriv);
    if (guardian.publicKey !== cfg.guardianPub) throw new Error('guardian key mismatch');
    const built = new Map();               // vault address -> openCard() result (pure, cached)
    const busy = new Set();                // vault addresses with a rescue in progress
    const state = { lastPoll: null, lastPollError: null, pollFailures: 0, pollAlerted: false, polling: false, startedAt: new Date().toISOString() };
    const hits = new Map();                // rate limiting: key -> [ms]

    const vaultOf = v => { if (!built.has(v.vaultAddress)) built.set(v.vaultAddress, openCard(v.card)); return built.get(v.vaultAddress); };

    function limited(key, max, windowMs) {
        const now = Date.now();
        const list = (hits.get(key) || []).filter(t => now - t < windowMs);
        if (list.length >= max) { hits.set(key, list); return true; }
        list.push(now); hits.set(key, list);
        return false;
    }

    // ---------- registration ----------
    async function register(body, ip) {
        if (limited(`reg:${ip}`, cfg.limits.registerPerIpHour, 3600000) || limited('reg:*', cfg.limits.registerPerHour, 3600000)) throw fail(429, 'RATE', 'Too many requests; try again later');
        const email = String(body.email || '').trim().toLowerCase();
        if (email.length > 254 || !EMAIL.test(email)) throw fail(400, 'EMAIL', 'That email address does not look right');
        let opened;
        try { opened = openCard(body.card); } catch (e) { throw fail(400, 'CARD', 'Vault card refused: ' + e.message); }
        const info = opened.info;
        if (info.network !== cfg.network) throw fail(400, 'NETWORK', `This watcher watches ${cfg.network} vaults`);
        if (info.guardian !== cfg.guardianPub) throw fail(400, 'GUARDIAN', 'This vault names another watcher\'s key');
        if (BigInt(info.delayDaa) < cfg.minDelayDaa) throw fail(400, 'DELAY', `This watcher needs a waiting time of at least ${Number(cfg.minDelayDaa) / 36000} hours`);
        const t = Date.parse(body.time);
        if (!Number.isFinite(t) || Date.now() - t > cfg.limits.signatureMaxAgeMs || t - Date.now() > 120000) throw fail(400, 'TIME', 'The signed request is too old; try again');
        const msg = registrationMessage({ guardian: cfg.guardianPub, vaultAddress: info.vaultAddress, email, time: body.time });
        const hot = String(opened.vault.constructorArgs.find(a => a.name === 'hot').value);
        if (!K.verifyMessage(msg, String(body.signature || '').toLowerCase().replace(/^0x/, ''), hot)) throw fail(400, 'SIGNATURE', 'The request is not signed by this vault\'s key');

        const existing = store.vault(info.vaultAddress);
        if (existing && existing.subscribers.some(s => s.email === email)) return { status: 'watching', vaultAddress: info.vaultAddress };
        if (store.pendingFor(info.vaultAddress, email)) return { status: 'pending', vaultAddress: info.vaultAddress, note: 'A confirmation email is already on its way' };
        if (existing && existing.subscribers.length >= cfg.limits.subscribersPerVault) throw fail(409, 'FULL', 'This vault already has the most email addresses this watcher allows');
        if (!existing && store.watched().length >= cfg.limits.vaults) { mailer.admin('vault limit reached', `MAX_VAULTS ${cfg.limits.vaults} reached; a registration was refused`); throw fail(503, 'FULL', 'This watcher is full right now'); }
        if (store.vaultsOfEmail(email).length >= cfg.limits.vaultsPerEmail) throw fail(409, 'FULL', 'This email address already watches the most vaults allowed');
        if (store.pendingCount() >= cfg.limits.pending) throw fail(503, 'FULL', 'Too many unconfirmed requests right now; try again later');

        const rec = {
            vaultAddress: info.vaultAddress, airlockAddress: info.airlockAddress, hotAddress: info.hotAddress, rescueAddress: info.rescueAddress,
            delayDaa: String(info.delayDaa), network: info.network, email, card: makeCard(opened), ip
        };
        const token = store.addPending(rec, cfg.limits.pendingTtlMs);
        await mailer.confirm({ to: email, vault: rec, token });
        log.log(`[watcher] registration for ${info.vaultAddress} by ${email} (${ip}); confirmation sent`);
        return { status: 'pending', vaultAddress: info.vaultAddress };
    }

    async function confirm(token) {
        const r = store.pending(token);
        if (!r) return null;
        store.takePending(token);
        let v = store.vault(r.vaultAddress);
        if (!v) {
            if (store.watched().length >= cfg.limits.vaults) throw fail(503, 'FULL', 'This watcher is full right now');
            v = {
                vaultAddress: r.vaultAddress, airlockAddress: r.airlockAddress, hotAddress: r.hotAddress, rescueAddress: r.rescueAddress,
                delayDaa: r.delayDaa, network: r.network, card: r.card, createdAt: new Date().toISOString(),
                subscribers: [], alerted: {}, released: {}, rescue: null
            };
        }
        // the address determines the keys and delay, so a second card for the same address is the same vault
        if (v.subscribers.some(s => s.email === r.email)) return v;
        if (v.subscribers.length >= cfg.limits.subscribersPerVault) throw fail(409, 'FULL', 'This vault already has the most email addresses this watcher allows');
        v.subscribers.push({ email: r.email, confirmedAt: new Date().toISOString() });
        store.putVault(v);
        const unsub = store.addToken({ kind: 'unsubscribe', vaultAddress: v.vaultAddress, email: r.email }, LONG);
        mailer.watching({ to: r.email, vault: v, unsubToken: unsub }).catch(e => log.error('[watcher] watching email failed:', e.message));
        mailer.admin(`now watching ${v.vaultAddress}`, `${r.email}\nvault   ${v.vaultAddress}\nairlock ${v.airlockAddress}\nbackup  ${v.rescueAddress}\ndelay   ${v.delayDaa} DAA\nsubscribers ${v.subscribers.length}`);
        log.log(`[watcher] watching ${v.vaultAddress} for ${r.email} (${v.subscribers.length} address(es))`);
        return v;
    }

    function unsubscribe(token) {
        const t = store.token(token, 'unsubscribe');
        if (!t) return null;
        const v = store.vault(t.vaultAddress);
        if (!v) return null;
        v.subscribers = v.subscribers.filter(s => s.email !== t.email);
        store.putVault(v);
        store.dropTokens(x => x.vaultAddress === t.vaultAddress && x.email === t.email);
        mailer.unsubscribed({ to: t.email, vault: v }).catch(() => {});
        log.log(`[watcher] ${t.email} stopped emails for ${v.vaultAddress} (${v.subscribers.length} left)`);
        return v;
    }

    async function lost(body, ip) {
        if (limited(`lost:${ip}`, cfg.limits.emergencyPerIpHour, 3600000)) throw fail(429, 'RATE', 'Too many requests; try again later');
        const email = String(body.email || '').trim().toLowerCase();
        const v = store.vault(String(body.vaultAddress || '').trim().toLowerCase());
        // the same answer whether or not the pair exists, so the endpoint does not reveal who watches what
        if (v && v.subscribers.some(s => s.email === email) && !limited(`lost:${v.vaultAddress}:${email}`, 3, 3600000)) {
            const token = store.addToken({ kind: 'rescue', vaultAddress: v.vaultAddress, email, why: 'requested' }, RESCUE_LINK_MS);
            await mailer.rescueLink({ to: email, vault: v, token });
            log.log(`[watcher] rescue link sent to ${email} for ${v.vaultAddress} (requested from ${ip})`);
        }
        return { status: 'sent-if-registered' };
    }

    // ---------- rescue ----------
    async function rescue(v, who) {
        if (busy.has(v.vaultAddress)) return { busy: true, total: 0n, txids: [], remaining: 1, errors: ['a rescue is already running'] };
        busy.add(v.vaultAddress);
        try {
            store.patchVault(v.vaultAddress, { rescue: { ...(v.rescue || {}), requestedAt: (v.rescue && v.rescue.requestedAt) || new Date().toISOString(), by: who, doneAt: null } });
            const client = new VaultClient(vaultOf(v), { provider });
            if (client.info.rescueAddress !== v.rescueAddress) throw new Error('backup wallet mismatch; refusing');
            const r = await client.emergency({ guardian });
            const snap = await client.snapshot();
            // the node can list a coin for a moment after our transaction spent it; those are not "left"
            const spent = new Set(r.moved.flatMap(m => m.coins.map(c => `${c.txid}:${c.index}`)));
            const remaining = [...snap.vaultCoins, ...snap.airlockCoins].filter(c => !spent.has(`${c.txid}:${c.index}`)).length;
            const total = r.moved.reduce((a, m) => a + m.amount, 0n);
            const txids = r.moved.map(m => m.txid);
            const errors = r.failed.map(f => f.error);
            const rs = store.vault(v.vaultAddress).rescue || {};
            store.patchVault(v.vaultAddress, { rescue: { ...rs, attempts: (rs.attempts || 0) + 1, lastError: errors.join('; ').slice(0, 500) || null, doneAt: remaining ? null : new Date().toISOString(), lastTxids: txids } });
            if (txids.length) {
                for (const s of store.vault(v.vaultAddress).subscribers) mailer.moved({ to: s.email, vault: v, amount: total, txids, remaining }).catch(e => log.error('[watcher] moved email failed:', e.message));
                mailer.admin(`rescue on ${v.vaultAddress} (${who})`, `${K.kasStr(total)} KAS -> ${v.rescueAddress}\n${txids.join('\n')}\n${errors.join('\n')}${remaining ? `\n${remaining} coin(s) remaining, retrying` : ''}`);
            }
            if (!remaining) store.dropTokens(x => x.kind === 'rescue' && x.vaultAddress === v.vaultAddress);
            log.log(`[watcher] rescue ${v.vaultAddress} (${who}): moved ${K.kasStr(total)} KAS in ${txids.length} tx, ${remaining} coin(s) left${errors.length ? `; errors: ${errors.join('; ')}` : ''}`);
            return { total, txids, remaining, errors };
        } finally { busy.delete(v.vaultAddress); }
    }

    // ---------- the loop ----------
    function pollResult(err) {
        if (!err) {
            if (state.pollAlerted) mailer.admin('polling recovered', `Polls succeed again after ${state.pollFailures} failure(s).`);
            Object.assign(state, { lastPoll: new Date().toISOString(), lastPollError: null, pollFailures: 0, pollAlerted: false });
            return;
        }
        state.pollFailures++;
        state.lastPollError = String(err).slice(0, 300);
        log.error(`[watcher] poll failed (${state.pollFailures} in a row): ${state.lastPollError}`);
        if (state.pollFailures >= cfg.pollFailAlert && !state.pollAlerted) {
            state.pollAlerted = true;
            mailer.admin(`BLIND: ${state.pollFailures} polls failed in a row`, `Last error: ${state.lastPollError}\nLast good poll: ${state.lastPoll || 'never'}\nNodes: ${provider.name}\nWhile this lasts no withdrawal is noticed and no rescue or release is pushed.`);
        }
    }

    async function poll() {
        if (state.polling) return;
        state.polling = true;
        try {
            const vaults = store.watched();
            if (!vaults.length) { pollResult(null); return; }
            const daa = await provider.virtualDaa();
            const byAirlock = new Map(vaults.map(v => [v.airlockAddress, v]));
            const airlocks = [...byAirlock.keys()];
            const coins = [];
            for (let i = 0; i < airlocks.length; i += 200) coins.push(...await provider.coins(airlocks.slice(i, i + 200)));
            const feeRate = await provider.feeRate();

            for (const c of coins) {
                const v = byAirlock.get(c.address);
                if (!v) continue;
                const op = `${c.txid}:${c.index}`;
                const left = BigInt(c.blockDaaScore) + BigInt(v.delayDaa) - daa;
                if (!v.alerted[op]) {
                    const arrives = new Date(Date.now() + Number(left > 0n ? left : 0n) * 100);
                    v.alerted[op] = { at: new Date().toISOString(), amount: c.amount.toString(), daa: c.blockDaaScore.toString() };
                    store.saveVaults();                // recorded before emailing: a crash re-alerts nobody twice
                    for (const s of v.subscribers) {
                        const token = store.addToken({ kind: 'rescue', vaultAddress: v.vaultAddress, email: s.email, why: op }, Math.max(Number(left > 0n ? left : 0n) * 100 + 3600000, RESCUE_LINK_MS));
                        mailer.alert({ to: s.email, vault: v, amount: c.amount, arrives, token }).catch(e => log.error('[watcher] alert email failed:', e.message));
                    }
                    mailer.admin(`withdrawal started on ${v.vaultAddress}`, `${K.kasStr(c.amount)} KAS, arrives ${arrives.toISOString()}\nsubscribers: ${v.subscribers.length}`);
                    log.log(`[watcher] withdrawal of ${K.kasStr(c.amount)} KAS started on ${v.vaultAddress}; alerted ${v.subscribers.length} address(es)`);
                }
                // release what has waited long enough, unless the owner asked for a rescue
                const due = BigInt(c.blockDaaScore) + BigInt(v.delayDaa) + S.SEQ_MARGIN_DAA <= daa;
                if (cfg.release && due && !v.released[op] && !(v.rescue && !v.rescue.doneAt)) {
                    try {
                        const pair = vaultOf(v);
                        const b = S.covenantSpend({ manifest: pair.airlock, entry: 'release', coins: [c], daa, feeRate });
                        if (b.destination !== v.hotAddress) throw new Error('release would not pay the hot wallet; refusing');
                        const signed = await S.sign(b, {});
                        const txid = await provider.submit(signed.tx, signed.entries);
                        v.released[op] = { txid, at: new Date().toISOString() };
                        store.saveVaults();
                        for (const s of v.subscribers) mailer.released({ to: s.email, vault: v, amount: signed.amountOut, txid }).catch(() => {});
                        log.log(`[watcher] released ${K.kasStr(signed.amountOut)} KAS from ${v.airlockAddress} to ${v.hotAddress} (${txid})`);
                    } catch (e) {
                        if (e.code === 'SPENT') { v.released[op] = { txid: null, at: new Date().toISOString(), note: 'gone before we released it' }; store.saveVaults(); }
                        else if (e.code !== 'NOT_READY' && e.code !== 'SEQUENCE_LOCK') log.error(`[watcher] release of ${op} failed: ${e.message}`);
                    }
                }
            }
            pollResult(null);
        } catch (e) {
            pollResult(e.message || String(e));
        } finally {
            state.polling = false;
        }
        // unfinished rescues: keep trying until both addresses are empty
        for (const v of store.vaults().filter(x => x.rescue && x.rescue.requestedAt && !x.rescue.doneAt)) {
            try { await rescue(v, 'retry'); } catch (e) { log.error(`[watcher] rescue retry ${v.vaultAddress}: ${e.message}`); }
        }
    }

    // ---------- HTTP ----------
    function clientIp(req) {
        const remote = (req.socket && req.socket.remoteAddress) || '';
        const local = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
        if (cfg.trustProxy === 'cloudflare' && req.headers['cf-connecting-ip']) return String(req.headers['cf-connecting-ip']);
        if (cfg.trustProxy !== 'none' && local && req.headers['x-real-ip']) return String(req.headers['x-real-ip']);
        return remote;
    }
    function cors(req, res) {
        const o = req.headers.origin;
        if (!o) return;
        if (cfg.corsOrigins.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
        else if (cfg.corsOrigins.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '600');
    }
    const json = (res, status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(JSON.stringify(obj, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    };
    const html = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS }); res.end(body); };
    function readBody(req, limit = 32768) {
        return new Promise((resolve, reject) => {
            let size = 0; const chunks = [];
            req.on('data', c => { size += c.length; if (size > limit) { reject(fail(413, 'SIZE', 'Request too large')); req.destroy(); } else chunks.push(c); });
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            req.on('error', reject);
        });
    }

    async function handle(req, res) {
        try {
            const url = new URL(req.url, 'http://x');
            const p = url.pathname.replace(/\/+$/, '') || '/';
            const ip = clientIp(req);
            if (p.startsWith('/v1/')) {
                cors(req, res);
                if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
            }
            if (req.method === 'GET' && p === '/health') return json(res, 200, { ok: !state.pollFailures, name: cfg.name, version: cfg.version, network: cfg.network, guardian: cfg.guardianPub, watching: store.watched().length, lastPoll: state.lastPoll, pollFailures: state.pollFailures, lastPollError: state.lastPollError, nodes: provider.name, startedAt: state.startedAt });
            if (req.method === 'GET' && p === '/v1/guardian') return json(res, 200, { pubkey: cfg.guardianPub, network: cfg.network, name: cfg.name, version: cfg.version, minDelayDaa: cfg.minDelayDaa.toString(), publicUrl: cfg.publicUrl, siteUrl: cfg.siteUrl, release: cfg.release });
            if (req.method === 'POST' && p === '/v1/register') {
                let body;
                try { body = JSON.parse(await readBody(req)); } catch (e) { if (e.status) throw e; throw fail(400, 'JSON', 'Send JSON'); }
                const r = await register(body, ip);
                return json(res, r.status === 'pending' ? 202 : 200, r);
            }
            if (req.method === 'POST' && p === '/v1/lost') {
                let body;
                try { body = JSON.parse(await readBody(req)); } catch (e) { if (e.status) throw e; throw fail(400, 'JSON', 'Send JSON'); }
                return json(res, 202, await lost(body, ip));
            }
            let m;
            if (req.method === 'GET' && (m = p.match(/^\/v1\/status\/(kaspa(?:test)?:[a-z0-9]{40,120})$/))) {
                const v = store.vault(m[1]);
                return json(res, 200, { vaultAddress: m[1], watched: !!(v && v.subscribers.length), delayDaa: v ? v.delayDaa : null, lastPoll: state.lastPoll });
            }
            if ((m = p.match(/^\/confirm\/([0-9a-f]{48})$/))) {
                const r = store.pending(m[1]);
                if (!r) return html(res, 404, pages.expired(cfg));
                if (req.method === 'GET') return html(res, 200, pages.confirm(cfg, r, `/confirm/${m[1]}`));
                if (req.method === 'POST') { await readBody(req); const v = await confirm(m[1]); return v ? html(res, 200, pages.confirmed(cfg, v)) : html(res, 404, pages.expired(cfg)); }
            }
            if ((m = p.match(/^\/rescue\/([0-9a-f]{48})$/))) {
                const t = store.token(m[1], 'rescue');
                const v = t && store.vault(t.vaultAddress);
                if (!v || !v.subscribers.some(s => s.email === t.email)) return html(res, 404, pages.expired(cfg));
                if (req.method === 'GET') {
                    let coins;
                    try { const snap = await new VaultClient(vaultOf(v), { provider }).snapshot(); coins = { air: snap.airlockCoins.map(c => ({ amount: c.amount })), vault: snap.vaultCoins.map(c => ({ amount: c.amount })) }; }
                    catch (e) { return html(res, 503, pages.error(cfg, 'Could not read the network: ' + e.message)); }
                    return html(res, 200, pages.rescue(cfg, v, coins, `/rescue/${m[1]}`));
                }
                if (req.method === 'POST') {
                    await readBody(req);
                    log.log(`[watcher] rescue requested for ${v.vaultAddress} by ${t.email} (${ip})`);
                    store.patchVault(v.vaultAddress, { rescue: { requestedAt: new Date().toISOString(), by: t.email, doneAt: null, attempts: 0 } });
                    try { const r = await rescue(store.vault(v.vaultAddress), t.email); return html(res, 200, pages.rescued(cfg, v, r)); }
                    catch (e) { log.error(`[watcher] rescue ${v.vaultAddress}: ${e.message}`); return html(res, 500, pages.error(cfg, `${e.message}. The watcher keeps trying on its own.`)); }
                }
            }
            if ((m = p.match(/^\/unsubscribe\/([0-9a-f]{48})$/))) {
                const t = store.token(m[1], 'unsubscribe');
                const v = t && store.vault(t.vaultAddress);
                if (!v) return html(res, 404, pages.expired(cfg));
                if (req.method === 'GET') return html(res, 200, pages.unsubscribe(cfg, v, t.email, `/unsubscribe/${m[1]}`));
                if (req.method === 'POST') { await readBody(req); unsubscribe(m[1]); return html(res, 200, pages.unsubscribed(cfg)); }
            }
            if (p === '/') return json(res, 200, { name: cfg.name, about: 'Kaspa Vault watcher', site: cfg.siteUrl });
            return json(res, 404, { error: 'not found' });
        } catch (e) {
            const status = e.status || 500;
            if (status >= 500) log.error('[watcher] request failed:', e.message);
            if (!res.headersSent) json(res, status, { error: e.message, code: e.code || 'ERROR' });
        }
    }

    return { handle, poll, rescue, register, confirm, unsubscribe, lost, state, store };
}
