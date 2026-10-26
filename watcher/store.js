// watcher/store.js - the watcher's state as plain JSON files in DATA_DIR. Small on purpose: this box
// should stay simple enough to audit by reading it, and the files are its whole memory.
//
//   vaults.json    vault address -> { card, addresses, delay, subscribers[], alerted{}, rescue }
//   pending.json   token hash -> an unconfirmed registration (expires)
//   tokens.json    token hash -> a one-time link (rescue, unsubscribe)
//
// Writes go to a temp file and are renamed into place, so a crash never leaves half a file.
// Tokens are stored as SHA-256 hashes; the raw token only ever exists in the email.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function openStore(dir) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = n => path.join(dir, n);
    const load = (n, d) => { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch (e) { return d; } };
    const save = (n, v) => {
        const tmp = file(n) + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(v, null, 1), { mode: 0o600 });
        fs.renameSync(tmp, file(n));
    };
    let vaults = load('vaults.json', {}), pending = load('pending.json', {}), tokens = load('tokens.json', {});
    const hash = t => crypto.createHash('sha256').update(String(t)).digest('hex');
    const newToken = () => crypto.randomBytes(24).toString('hex');
    const now = () => Date.now();

    function sweep() {
        let changed = false;
        for (const [k, v] of Object.entries(pending)) if (v.expiresAt < now()) { delete pending[k]; changed = true; }
        if (changed) save('pending.json', pending);
        changed = false;
        for (const [k, v] of Object.entries(tokens)) if (v.expiresAt < now()) { delete tokens[k]; changed = true; }
        if (changed) save('tokens.json', tokens);
    }

    return {
        dir,
        // ---- vaults ----
        vault: addr => vaults[String(addr).toLowerCase()] || null,
        vaults: () => Object.values(vaults),
        watched: () => Object.values(vaults).filter(v => v.subscribers.length > 0),
        putVault(v) { vaults[v.vaultAddress] = v; save('vaults.json', vaults); return v; },
        patchVault(addr, fields) { const v = vaults[addr]; if (!v) return null; Object.assign(v, fields); save('vaults.json', vaults); return v; },
        saveVaults() { save('vaults.json', vaults); },
        vaultsOfEmail: email => Object.values(vaults).filter(v => v.subscribers.some(s => s.email === email)),

        // ---- pending registrations ----
        addPending(rec, ttlMs) {
            sweep();
            const t = newToken();
            pending[hash(t)] = { ...rec, createdAt: new Date().toISOString(), expiresAt: now() + ttlMs };
            save('pending.json', pending);
            return t;
        },
        pending: t => { sweep(); const r = pending[hash(t)]; return r && r.expiresAt >= now() ? r : null; },
        takePending(t) { const k = hash(t); const r = pending[k]; delete pending[k]; save('pending.json', pending); return r || null; },
        pendingCount: () => { sweep(); return Object.keys(pending).length; },
        /** Drop unconfirmed requests for this vault and email (a fresh link replaces them). */
        dropPendingFor(vaultAddress, email) {
            let n = 0;
            for (const [k, p] of Object.entries(pending)) if (p.vaultAddress === vaultAddress && p.email === email) { delete pending[k]; n++; }
            if (n) save('pending.json', pending);
            return n;
        },
        pendingFor: (vaultAddress, email) => Object.values(pending).filter(p => p.vaultAddress === vaultAddress && p.email === email && p.expiresAt >= now()).length,

        // ---- one-time links ----
        addToken(rec, ttlMs) {
            sweep();
            const t = newToken();
            tokens[hash(t)] = { ...rec, expiresAt: now() + ttlMs };
            save('tokens.json', tokens);
            return t;
        },
        token: (t, kind) => { if (!/^[0-9a-f]{48}$/.test(String(t || ''))) return null; sweep(); const r = tokens[hash(t)]; return r && r.kind === kind && r.expiresAt >= now() ? r : null; },
        dropTokens(fn) { let n = 0; for (const [k, v] of Object.entries(tokens)) if (fn(v)) { delete tokens[k]; n++; } if (n) save('tokens.json', tokens); return n; },
        sweep
    };
}
