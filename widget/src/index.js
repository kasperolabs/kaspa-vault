// <kaspa-vault> - a savings vault for Kaspa, as one drop-in element.
//
//   <script type="module" src="kaspa-vault.js"></script>
//   <kaspa-vault watcher="https://watch.kaspavault.com"></kaspa-vault>
//
// Attributes
//   watcher      the watcher's URL (required). It alerts by email and holds the guardian key,
//                which can only ever move money to the user's own backup wallet.
//   guardian     optional: the watcher's public key, pinned. If the watcher answers with another
//                key, nothing is created (a site should always pin it).
//   node         optional, comma-separated: Kaspa REST APIs (https://) or kaspad JSON wRPC
//                (ws:// or wss://), tried in order. Default: the public REST API of the network.
//   delays       optional: waiting times offered, in days (default "1,3,7").
//   storage-key  optional: where this browser keeps the vault (default "kaspa-vault").
//
// Everything that signs happens in this page: the vault's wallet is made here (12 standard
// recovery words, encrypted with the user's password) and its key never leaves the browser.
// Events: "kaspa-vault-change" { detail: { vaultAddress, vault, pending, spending } } (sompi strings).

import STYLE from './style.js';
import qrcode from 'qrcode-generator';
import * as K from '../../core/kaspa.js';
import { buildVault } from '../../core/contracts.js';
import { makeCard, openCard, manifestFiles, registrationMessage } from '../../core/card.js';
import { VaultClient } from '../../core/vault.js';
import { keySigner } from '../../core/spend.js';
import { restProvider, fallbackProvider } from '../../core/provider.js';
import { wrpcJsonProvider } from '../../core/provider-wrpc.js';
import * as W from '../../core/wallet.js';
import { WALLETS, proveWith, canSendFrom, sendFrom } from './wallets.js';

export const VERSION = '0.1.0';
const RECORD = 'kaspa-vault-widget/1';
const REFRESH_MS = 15000;
const KEY_TTL_MS = 5 * 60 * 1000;
const DAA_PER_DAY = 864000;
const NODES = { mainnet: 'https://api.kaspa.org', 'testnet-10': 'https://api-tn10.kaspa.org' };
const EXPLORER = { mainnet: 'https://explorer.kaspa.org/txs/', 'testnet-10': 'https://explorer-tn10.kaspa.org/txs/' };

// ---------- small helpers ----------
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = a => { const s = String(a || ''); const i = s.indexOf(':'); const b = s.slice(i + 1); return b.length <= 14 ? s : `${s.slice(0, i + 1)}${b.slice(0, 5)}…${b.slice(-6)}`; };
function kas(sompi, unit = true) {
    const s = K.kasStr(BigInt(sompi || 0n));
    const [w, f = ''] = s.split('.');
    const frac = f.replace(/0+$/, '');
    const shown = (frac.length < 2 ? (frac + '00').slice(0, 2) : frac);
    return `${Number(w).toLocaleString('en-US')}.${shown}${unit ? ' KAS' : ''}`;
}
function parseKas(str) {
    const s = String(str || '').replace(/,/g, '').trim();
    if (!/^\d+(\.\d{1,8})?$/.test(s)) return null;
    const v = K.kasToSompi(s);
    return v > 0n ? v : null;
}
function dayWord(daa) {
    const d = Number(daa) / DAA_PER_DAY;
    if (d >= 1 && Number.isInteger(d)) return d === 1 ? 'one day' : `${d} days`;
    const min = Math.round(Number(daa) / 600);
    return min < 120 ? `${min} minutes` : `${Math.round(min / 60)} hours`;
}
function when(ms) {
    if (ms <= 0) return 'any moment now';
    if (ms < 3600000) return `in ${Math.max(1, Math.ceil(ms / 60000))} min`;
    const dt = new Date(Date.now() + ms), now = new Date();
    const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (dt.toDateString() === now.toDateString()) return `today at ${time}`;
    if (new Date(now.getTime() + 86400000).toDateString() === dt.toDateString()) return `tomorrow at ${time}`;
    return `${dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${time}`;
}
function friendly(e) {
    const m = String((e && e.message) || e || 'Something went wrong');
    const c = e && e.code;
    if (c === 'BAD_PASSWORD') return 'That password does not open this vault.';
    if (c === 'NO_COINS') return 'There is nothing there to move yet.';
    if (c === 'SPENT') return 'The network already moved these coins. Refreshing.';
    if (c === 'SEQUENCE_LOCK') return 'The waiting time is not over yet.';
    if (c === 'AMOUNT' && e.max != null) return `That would leave less than 0.5 KAS behind, which the network does not keep. Press "All of it" to move everything, or move at most ${kas(e.max > 50000000n ? e.max - 50000000n : 0n)}.`;
    if (c === 'FEE' || /insufficient|not enough|fee/i.test(m)) return `Not enough for this and the network fee. (${m})`;
    if (/Failed to fetch|NetworkError|timed out|ECONNREFUSED|connection/i.test(m)) return 'The Kaspa network could not be reached. Check your connection and try again.';
    return m.charAt(0).toUpperCase() + m.slice(1);
}
const icon = {
    vault: '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true"><rect x="6" y="9" width="44" height="38" rx="7" fill="var(--kv-accent-soft)" stroke="var(--kv-accent)" stroke-width="2.4"/><circle cx="28" cy="28" r="9" stroke="var(--kv-accent)" stroke-width="2.4"/><path d="M28 19v3M28 34v3M19 28h3M34 28h3" stroke="var(--kv-accent)" stroke-width="2.4" stroke-linecap="round"/><path d="M14 47v3M42 47v3" stroke="var(--kv-accent)" stroke-width="2.4" stroke-linecap="round"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="#1d4ed8" stroke-width="1.8"/><path d="M10 6v4l3 2" stroke="#1d4ed8" stroke-width="1.8" stroke-linecap="round"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="3" y="7" width="12" height="9" rx="2" stroke="#334155" stroke-width="1.6"/><path d="M6 7V5a3 3 0 016 0v2" stroke="#334155" stroke-width="1.6"/></svg>',
    ok: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#16a34a"/><path d="M6 10.5l2.5 2.5L14 7.5" stroke="#fff" stroke-width="2" fill="none"/></svg>',
    bell: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3a5 5 0 00-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 00-5-5zM8 16a2 2 0 004 0" stroke="#b45309" stroke-width="1.7" stroke-linejoin="round"/></svg>'
};
function qrSvg(text) {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function randomHex(n) { return K.bytesToHex(globalThis.crypto.getRandomValues(new Uint8Array(n))); }

// ---------- the element ----------
export class KaspaVault extends HTMLElement {
    #root; #secret = { words: null, priv: null, until: 0 }; #draft = null; #shown = null; #timer = null; #refreshing = null; #releasing = false;

    constructor() {
        super();
        this.#root = this.attachShadow({ mode: 'open' });
        this.s = { phase: 'loading', guardian: null, rec: null, opened: null, snap: null, watched: null, watcherDown: false, nodeDown: false, setup: null, sheet: null, error: null };
        this.#root.addEventListener('click', e => this.#onClick(e));
        this.#root.addEventListener('input', e => this.#onInput(e));
        this.#root.addEventListener('submit', e => e.preventDefault());
        this.#root.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.s.sheet && !this.s.busy) { this.#closeSheet(); }
            if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox])')) {
                const go = e.target.closest('.kv-sheet, .kv-step-body, .kv-card')?.querySelector('[data-enter]');
                if (go && !go.disabled) { e.preventDefault(); go.click(); }
            }
        });
    }

    connectedCallback() {
        this.#paint();
        this.#start();
        this._vis = () => { if (document.visibilityState === 'visible') this.refresh(); };
        document.addEventListener('visibilitychange', this._vis);
    }
    disconnectedCallback() {
        clearInterval(this.#timer);
        document.removeEventListener('visibilitychange', this._vis);
        this.#forget();
    }

    // ---------- config ----------
    // always the page's own watcher: a card never redirects this page to another server
    get watcherUrl() { return String(this.getAttribute('watcher') || '').replace(/\/+$/, ''); }
    get storageKey() { return this.getAttribute('storage-key') || 'kaspa-vault'; }
    get network() { return (this.s.rec && this.s.rec.card.network) || (this.s.guardian && this.s.guardian.network) || 'mainnet'; }
    #delays() {
        const min = this.s.guardian ? Number(this.s.guardian.minDelayDaa) : DAA_PER_DAY;
        const days = String(this.getAttribute('delays') || '1,3,7').split(',').map(Number).filter(d => d > 0 && d <= 30);
        const out = days.map(d => d * DAA_PER_DAY).filter(d => d >= min);
        if (min < DAA_PER_DAY) out.unshift(min);              // a test watcher: offer its minimum, labeled
        return out;
    }
    #provider() {
        if (this._provider) return this._provider;
        const given = this.getAttribute('node') || NODES[this.network];
        if (!given) throw new Error(`No Kaspa node is set for ${this.network}; add the node attribute.`);
        const list = String(given).split(',').map(s => s.trim()).filter(Boolean);
        const ps = list.map(u => (/^wss?:/i.test(u) ? wrpcJsonProvider({ url: u }) : restProvider({ url: u })));
        this._provider = ps.length === 1 ? ps[0] : fallbackProvider(ps);
        return this._provider;
    }
    #explorer(txid) { const b = EXPLORER[this.network]; return b ? `${b}${txid}` : null; }

    // ---------- storage ----------
    #load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            const rec = raw ? JSON.parse(raw) : null;
            return rec && rec.format === RECORD ? rec : null;
        } catch (e) { return null; }
    }
    #save(rec) {
        try { localStorage.setItem(this.storageKey, JSON.stringify(rec)); }
        catch (e) { this.#toast('This browser would not save the vault. Download the vault card and keep your recovery words.', true); }
    }

    // ---------- the key: unlocked with the password, kept for a few minutes ----------
    #locked() { return !(this.#secret.priv && Date.now() < this.#secret.until); }
    #forget() { this.#secret = { words: null, priv: null, until: 0 }; }
    // force: ask for the password even inside the 5 minutes (recovery words, Send). Never extended by use.
    async #unlock(password, { force = false } = {}) {
        if (!force && !this.#locked()) return this.#secret;
        if (!password) throw Object.assign(new Error('Enter your password.'), { code: 'NEED_PW' });
        const { words } = await W.unlock(this.s.rec.box, password);
        const w = W.walletFromWords(words, { network: this.network });
        if (w.publicKey !== this.s.rec.card.keys.hot) throw Object.assign(new Error('These words do not belong to this vault'), { code: 'MISMATCH' });
        this.#secret = { words, priv: w.privateKey, until: Date.now() + KEY_TTL_MS };
        return this.#secret;
    }
    async #signer(form, opts) {
        const pw = form && form.querySelector('[name=password]');
        const sec = await this.#unlock(pw ? pw.value : '', opts);
        return keySigner(sec.priv);
    }

    // ---------- start ----------
    async #start() {
        const rec = this.#load();
        if (rec) {
            try {
                const opened = openCard(rec.card);
                this.s = { ...this.s, rec, opened, phase: 'account' };
                this.client = new VaultClient({ vault: opened.vault, airlock: opened.airlock }, { provider: this.#provider() });
            } catch (e) {
                this.s = { ...this.s, phase: 'error', error: 'The vault saved in this browser does not add up: ' + e.message };
                return this.#paint();
            }
            this.#paint();
            this.#loadGuardian().then(() => this.#paint()).catch(e => { this.s.guardianProblem = e.message; this.#paint(); });
            await this.refresh();
            this.#timer = setInterval(() => { if (document.visibilityState === 'visible') this.refresh(); }, REFRESH_MS);
            return;
        }
        try {
            await this.#loadGuardian();
            this.s.phase = 'welcome';
        } catch (e) {
            this.s.phase = 'error';
            this.s.error = e.message;
        }
        this.#paint();
    }

    async #loadGuardian() {
        const url = this.watcherUrl;
        if (!url) throw new Error('This page has no watcher set (the watcher attribute).');
        let g;
        try { g = await (await fetch(`${url}/v1/guardian`, { cache: 'no-store' })).json(); }
        catch (e) { throw new Error(`The watcher at ${url} cannot be reached right now. Nothing was created; try again later.`); }
        if (!/^[0-9a-f]{64}$/.test(String(g.pubkey))) throw new Error('The watcher did not name its key.');
        const pinned = (this.getAttribute('guardian') || '').trim().toLowerCase();
        if (pinned && pinned !== g.pubkey) throw new Error(`The watcher answered with key ${g.pubkey.slice(0, 12)}…, but this page expects ${pinned.slice(0, 12)}…. Nothing was created. If you run this page, check the guardian attribute.`);
        this.s.guardian = g;
        return g;
    }

    /** Re-read balances and the watcher. Safe to call any time. */
    async refresh() {
        if (this.s.phase !== 'account' || !this.client) return;
        if (this.#refreshing) return this.#refreshing;
        this.#refreshing = (async () => {
            try {
                this.s.snap = await this.client.snapshot();
                this.s.nodeDown = false;
            } catch (e) { this.s.nodeDown = true; }
            try {
                const r = await fetch(`${this.watcherUrl}/v1/status/${this.s.opened.info.vaultAddress}`, { cache: 'no-store' });
                const d = await r.json();
                this.s.watched = !!d.watched; this.s.watcherDown = false; this.s.lastPoll = d.lastPoll;
            } catch (e) { this.s.watcherDown = true; }
            // a withdrawal past its waiting time: anyone may finish it, so this page does too
            if (this.s.snap && this.s.snap.pending.some(p => p.ready) && !this.#releasing) {
                this.#releasing = true;
                this.client.release().then(r => { if (r.released.length) setTimeout(() => this.refresh(), 2000); }).catch(() => {}).finally(() => { this.#releasing = false; });
            }
            this.#emit();
            if (!this.s.sheet && !this.#typing()) this.#paint();
        })().finally(() => { this.#refreshing = null; });
        return this.#refreshing;
    }
    #typing() { const a = this.#root.activeElement; return !!(a && a.matches('input, textarea')); }
    #emit() {
        const b = this.s.snap && this.s.snap.balances;
        if (!b) return;
        this.dispatchEvent(new CustomEvent('kaspa-vault-change', { bubbles: true, composed: true, detail: { vaultAddress: this.s.opened.info.vaultAddress, vault: String(b.vault), pending: String(b.pending), spending: String(b.hot) } }));
    }

    // ---------- painting ----------
    #paint() {
        const s = this.s;
        let body = '';
        if (s.phase === 'loading') body = `<div class="kv-card kv-center kv-muted">Loading…</div>`;
        else if (s.phase === 'error') body = `<div class="kv-card"><h2>The vault can't start</h2><p>${esc(s.error)}</p></div>`;
        else if (s.phase === 'welcome') body = this.#welcomeHtml();
        else if (s.phase === 'setup') body = this.#setupHtml();
        else if (s.phase === 'restore') body = this.#restoreHtml();
        else if (s.phase === 'account') body = this.#accountHtml();
        const net = this.network !== 'mainnet' ? `<span class="kv-net">${esc(this.network)}</span>` : '';
        const keep = this.#keepInputs();
        this.#root.innerHTML = `<style>${STYLE}</style><div class="kv">
            <div class="kv-head"><div><h1 class="kv-title">Vault</h1><p class="kv-sub">Money you don't want to spend by accident.</p></div>${net}</div>
            ${body}
            <p class="kv-small-print">kaspa-vault ${VERSION} · open source · your keys stay in this browser</p>
        </div>${s.sheet ? this.#sheetHtml() : ''}${s.toast ? `<div class="kv-toast ${s.toast.bad ? 'kv-toast-bad' : ''}" role="status">${esc(s.toast.text)}</div>` : ''}`;
        this.#restoreInputs(keep);
    }
    // keep what the user typed across a repaint (by name)
    #keepInputs() {
        const out = {};
        this.#root.querySelectorAll('input[name], textarea[name]').forEach(el => { if (el.type !== 'file') out[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
        const a = this.#root.activeElement;
        out.__focus = a && a.name ? a.name : null;
        return out;
    }
    #restoreInputs(keep) {
        this.#root.querySelectorAll('input[name], textarea[name]').forEach(el => {
            if (!(el.name in keep) || el.dataset.fresh !== undefined) return;
            if (el.type === 'checkbox') el.checked = keep[el.name]; else if (el.type !== 'file') el.value = keep[el.name];
        });
        if (keep.__focus) { const f = this.#root.querySelector(`[name="${keep.__focus}"]`); if (f) f.focus(); }
        const auto = this.#root.querySelector('[autofocus]');
        if (auto && !keep.__focus) auto.focus();
        this.#syncButtons();
    }
    #toast(text, bad) {
        this.s.toast = { text, bad: !!bad };
        this.#paint();
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => { this.s.toast = null; if (!this.#typing()) this.#paint(); else this.#root.querySelector('.kv-toast')?.remove(); }, bad ? 6000 : 3500);
    }

    // ---------- welcome ----------
    #welcomeHtml() {
        const g = this.s.guardian;
        return `
        <div class="kv-card">
            <div class="kv-hero">${icon.vault}
                <div><h2>A vault works like a safe deposit box</h2>
                <p>Putting money in is instant. Taking it out takes a waiting time you choose, and you get an email the moment it starts. If it wasn't you, one button sends everything to your backup wallet instead. Nobody else can move it anywhere, including this website.</p></div>
            </div>
            <div class="kv-hints">
                <div><b>1. Your vault's wallet</b>Made in this browser. You write down 12 words.</div>
                <div><b>2. A backup wallet</b>Kasware, Kastle or Kaspire. Emergencies go there, nowhere else.</div>
                <div><b>3. A waiting time</b>The time you have to say "this wasn't me".</div>
            </div>
            <div class="kv-gap"><button class="kv-btn" data-act="setup-start">Open a vault</button></div>
            <p class="kv-center kv-gap"><button class="kv-link" data-act="restore-start">I already have a vault (recovery words and vault card)</button></p>
        </div>
        <p class="kv-center kv-muted">Watched by ${esc(g ? g.name : this.watcherUrl)}</p>`;
    }

    // ---------- setup ----------
    #setupHtml() {
        const st = this.s.setup;
        const step = (n, title, sum, open, inner) => `
            <div class="kv-card"><div class="kv-step">
                <div class="kv-num ${st.step > n ? 'kv-num-done' : st.step < n ? 'kv-num-todo' : ''}">${st.step > n ? '✓' : n}</div>
                <div class="kv-step-body"><h2>${title}</h2>${st.step > n && sum ? `<div class="kv-step-sum">${sum}</div>` : ''}${open ? inner : ''}</div>
            </div></div>`;
        const s1 = st.sub === 'password' ? `
                <p class="kv-muted">This password opens your vault in this browser. It is never sent anywhere.</p>
                <label class="kv-label">Password</label><input class="kv-input" type="password" name="pw1" autocomplete="new-password" autofocus>
                <label class="kv-label">Same password again</label><input class="kv-input" type="password" name="pw2" autocomplete="new-password">
                <div class="kv-err" data-err>${esc(st.err || '')}</div>
                <button class="kv-btn" data-act="setup-password" data-enter data-need="pw1,pw2">Make my vault's wallet</button>`
            : st.sub === 'words' ? `
                <p>These 12 words are your vault's wallet. Write them down or save them somewhere private, in this order. With them, any Kaspa wallet app (Kasware, Kastle, Kaspium) opens it, even if this website is gone.</p>
                <div class="kv-words">${this.#draft.words.split(' ').map(w => `<span>${esc(w)}</span>`).join('')}</div>
                <p class="kv-center"><button class="kv-link" data-act="copy-draft-words">Copy the words</button></p>
                <label class="kv-check"><input type="checkbox" name="wrote"><span>I saved the 12 words somewhere only I can reach. Anyone who has them can start a withdrawal.</span></label>
                <button class="kv-btn" data-act="setup-words" data-need="wrote">Next</button>`
            : `
                <p>Just to be sure they are written correctly:</p>
                <div class="kv-quiz">
                    <div><label class="kv-label">Word ${st.quiz[0] + 1}</label><input class="kv-input" name="q1" autocomplete="off" autocapitalize="off" spellcheck="false" autofocus></div>
                    <div><label class="kv-label">Word ${st.quiz[1] + 1}</label><input class="kv-input" name="q2" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
                </div>
                <div class="kv-err" data-err>${esc(st.err || '')}</div>
                <button class="kv-btn" data-act="setup-quiz" data-enter data-need="q1,q2">Check</button>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-show-words">Show the words again</button></p>`;
        const s2 = st.backup ? `
                <div class="kv-ok">${icon.ok}<div>Backup wallet ${st.backup.how === 'typed' ? '(typed in)' : `confirmed by ${esc(st.backup.how)}`}<br><span class="kv-mono">${esc(st.backup.address)}</span></div></div>
                <button class="kv-btn" data-act="setup-backup-ok">Use this wallet</button>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-backup-change">Pick another</button></p>`
            : st.typing ? `
                <p class="kv-muted">Paste your backup wallet's address. It must be a standard kaspa:q address.</p>
                <input class="kv-input kv-mono" name="backupAddr" placeholder="kaspa:q…" autocomplete="off" spellcheck="false" autofocus>
                <div class="kv-warn">Nobody can check a typed address is yours. If one character is wrong, an emergency would send your money to a stranger. Connecting the wallet is safer.</div>
                <label class="kv-check"><input type="checkbox" name="typedOk"><span>I checked every character. This wallet is mine and I have its recovery words.</span></label>
                <div class="kv-err" data-err>${esc(st.err || '')}</div>
                <button class="kv-btn" data-act="setup-backup-typed" data-need="backupAddr,typedOk">Use this address</button>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-backup-change">Connect a wallet instead</button></p>`
            : `
                <p class="kv-muted">If a withdrawal ever starts that you didn't start, your money goes here and nowhere else. Use a wallet you already have, with its recovery words written down.</p>
                <div class="kv-wallets">${WALLETS.map(w => { const on = w.present(); return `
                    <button class="kv-wallet" data-act="setup-backup-ext" data-wallet="${w.id}" ${on ? '' : 'disabled'}>
                        <span class="kv-wallet-ic" style="background:${w.color}">${w.name[0]}</span>
                        <span class="kv-wallet-t"><b>${w.name}</b><span>${on ? 'Signs a short note. Free, moves nothing.' : 'Not installed in this browser'}</span></span>›</button>`; }).join('')}</div>
                <div class="kv-err" data-err>${esc(st.err || '')}</div>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-backup-type">My wallet is on my phone: type its address</button></p>`;
        const s3 = `
                <p class="kv-muted">Taking money out of the vault always takes this long. It is your time to notice and press "this wasn't me". It can't be changed later.</p>
                <div class="kv-tiles">${this.#delays().map(d => `
                    <button class="kv-tile ${String(st.delayDaa) === String(d) ? 'kv-tile-sel' : ''}" data-act="setup-delay" data-daa="${d}">
                        <b>${d < DAA_PER_DAY ? `Test: ${dayWord(d)}` : dayWord(d).replace(/^one/, '1')}</b><span>${d < DAA_PER_DAY ? 'For trying it out with small amounts' : d === DAA_PER_DAY ? 'Most people pick this' : d <= 3 * DAA_PER_DAY ? 'Time to notice on a busy week' : 'Long-term savings'}</span></button>`).join('')}</div>
                <button class="kv-btn" data-act="setup-delay-ok" ${st.delayDaa ? '' : 'disabled'}>Next</button>`;
        const s4 = `
                <p class="kv-muted">The watcher, ${esc(this.s.guardian.name)}, emails this address the moment a withdrawal starts. You confirm it once by a link.</p>
                <input class="kv-input" type="email" name="email" placeholder="you@example.com" autocomplete="email" autofocus>
                <label class="kv-check"><input type="checkbox" name="final"><span>I understand: taking money out takes ${esc(dayWord(st.delayDaa))}, emergencies go to <span class="kv-mono">${esc(short(st.backup && st.backup.address))}</span>, and my 12 words plus the vault card are how I get back in.</span></label>
                <div class="kv-err" data-err>${esc(st.err || '')}</div>
                <button class="kv-btn" data-act="setup-create" data-enter data-need="email,final" ${st.busy ? 'disabled' : ''}>${st.busy ? esc(st.busy) : 'Open my vault'}</button>`;
        return step(1, "Your vault's wallet", 'Made in this browser, 12 words written down', st.step === 1, s1) +
            step(2, 'Your backup wallet', st.backup ? `<span class="kv-mono">${esc(short(st.backup.address))}</span>` : '', st.step === 2, s2) +
            step(3, 'Waiting time', st.delayDaa ? esc(dayWord(st.delayDaa)) : '', st.step === 3, s3) +
            step(4, 'Email for alerts', '', st.step === 4, s4) +
            `<p class="kv-center"><button class="kv-link" data-act="setup-cancel">Cancel</button></p>`;
    }

    // ---------- restore ----------
    #restoreHtml() {
        const r = this.s.restore || {};
        const info = r.info;
        return `
        <div class="kv-card">
            <h2>Open your vault in this browser</h2>
            <p class="kv-muted">Choose your backup file (kaspa-vault-backup-….json), or your vault card and then type your 12 recovery words.</p>
            <label class="kv-label">Backup file or vault card</label>
            <input class="kv-input" type="file" name="cardFile" accept=".json,application/json" data-act-change="restore-file">
            ${info ? `<dl class="kv-kv">
                <dt>Vault</dt><dd>${esc(info.vaultAddress)}</dd>
                <dt>Backup wallet</dt><dd>${esc(info.rescueAddress)}</dd>
                <dt>Waiting time</dt><dd>${esc(dayWord(info.delayDaa))}</dd>
            </dl>
            <label class="kv-check"><input type="checkbox" name="backupMine"><span>The backup wallet above is mine. (If it isn't, this card is not yours: stop here.)</span></label>` : ''}
            <label class="kv-label">Recovery words</label>
            <textarea class="kv-input" name="words" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="word1 word2 …"></textarea>
            <label class="kv-label">New password for this browser</label><input class="kv-input" type="password" name="pw1" autocomplete="new-password">
            <label class="kv-label">Same password again</label><input class="kv-input" type="password" name="pw2" autocomplete="new-password">
            <div class="kv-err" data-err>${esc(r.err || '')}</div>
            <button class="kv-btn" data-act="restore-go" data-enter data-need="backupMine,words,pw1,pw2" ${r.busy || !info ? 'disabled' : ''}>${r.busy ? 'Opening…' : 'Open my vault'}</button>
            <p class="kv-center kv-gap"><button class="kv-link" data-act="restore-cancel">Cancel</button></p>
        </div>`;
    }

    // ---------- account ----------
    #accountHtml() {
        const { snap, opened, rec } = this.s;
        const info = opened.info;
        const day = dayWord(info.delayDaa);
        let banners = '';
        if (this.s.watcherDown) banners += `<div class="kv-banner">${icon.bell}<div><b>The watcher can't be reached right now</b>Your money is safe and taking it out still works; alerts wait until the watcher is back.</div></div>`;
        else if (this.s.watched === false && !rec.email) banners += `<div class="kv-banner">${icon.bell}<div><b>Alerts are off</b>Nobody will email you when a withdrawal starts. Turn alerts on before you put money in.<br><button class="kv-btn kv-btn-small" data-act="sheet" data-sheet="alerts">Turn on alerts</button></div></div>`;
        else if (this.s.watched === false) banners += `<div class="kv-banner">${icon.bell}<div><b>Confirm your email to turn on alerts</b>We sent a link to ${esc(rec.email)}. Alerts start when you press it. Nothing there? Check spam, or <button class="kv-link" data-act="sheet" data-sheet="alerts">send it again</button>.</div></div>`;
        const g = this.s.guardian;
        if (this.s.guardianProblem) banners += `<div class="kv-banner">${icon.bell}<div><b>This page's watcher can't be confirmed</b>${esc(this.s.guardianProblem)}</div></div>`;
        else if (g && g.pubkey !== rec.card.keys.guardian) banners += `<div class="kv-banner">${icon.bell}<div><b>This page's watcher does not guard your vault</b>Your vault names key ${esc(rec.card.keys.guardian.slice(0, 12))}…; the watcher here answers with ${esc(g.pubkey.slice(0, 12))}…. Alerts and rescues come only from your vault's own watcher.</div></div>`;
        const mustSave = rec.cardSaved === false;
        if (mustSave) banners += `<div class="kv-banner">${icon.bell}<div><b>Save your backup before you put money in</b>The words open the wallet; the vault card tells any Kaspa tool where your vault is and who guards it. Words alone can't find the vault if this browser forgets it. The backup file holds both; keep it private.<br><button class="kv-btn kv-btn-small" data-act="backup">Download backup file</button> <button class="kv-link" data-act="card">or the vault card only</button></div></div>`;
        if (this.s.nodeDown) banners += `<div class="kv-banner">${icon.bell}<div><b>The Kaspa network can't be reached</b>Balances may be out of date. Retrying.</div></div>`;
        if (!snap) return banners + `<div class="kv-card kv-center kv-muted">Reading your vault…</div>`;
        const b = snap.balances;
        const strips = snap.pending.map(p => `
            <div class="kv-strip"><div class="kv-strip-ic">${icon.clock}</div><div>
                <b>${esc(kas(p.amount))} is on its way to your spending wallet</b>
                <p>Arrives ${esc(when(p.etaMs))}.${this.s.watched ? ' The watcher has emailed you.' : ''}</p>
                <button class="kv-link" data-act="sheet" data-sheet="notme">Didn't start this?</button>
            </div></div>`).join('');
        const coins = [...snap.vaultCoins].sort((x, y) => (BigInt(y.blockDaaScore) > BigInt(x.blockDaaScore) ? 1 : -1));
        const rows = coins.map(c => `
            <div class="kv-row"><div class="kv-row-ic">${icon.lock}</div>
                <div class="kv-row-t"><b>Deposit</b><span>takes ${esc(day)} to take out</span></div>
                <div class="kv-row-amt">${esc(kas(c.amount))}</div></div>`).join('');
        const protectedPill = this.s.watched
            ? `<div class="kv-pill" title="${esc(info.rescueAddress)}"><span class="kv-dot"></span>Protected · backup ${esc(short(info.rescueAddress))}</div>`
            : `<div class="kv-pill kv-pill-off"><span class="kv-dot"></span>Alerts not on yet</div>`;
        return `${banners}${strips}
        <div class="kv-card kv-balance">
            <div class="kv-lbl">In your vault</div>
            <div class="kv-amt">${esc(kas(b.vault, false))}<small>KAS</small></div>
            ${b.pending > 0n ? `<div class="kv-muted">+ ${esc(kas(b.pending))} on its way out</div>` : ''}
            ${protectedPill}
            <div class="kv-row2">
                <button class="kv-btn" data-act="sheet" data-sheet="add" ${mustSave ? 'disabled title="Save your vault card first"' : ''}>Add money</button>
                <button class="kv-btn kv-btn-line" data-act="sheet" data-sheet="out" ${snap.vaultCoins.length ? '' : 'disabled'}>Take money out</button>
            </div>
        </div>
        <div class="kv-card">
            <div class="kv-spend"><div class="kv-spend-t"><b>Spending wallet</b><span class="kv-muted">Withdrawals from the vault land here, ready to spend.</span></div>
                <div class="kv-spend-amt">${esc(kas(b.hot))}</div></div>
            <div class="kv-spend-btns">
                <button class="kv-btn kv-btn-line kv-btn-small" data-act="sheet" data-sheet="receive">Receive</button>
                <button class="kv-btn kv-btn-line kv-btn-small" data-act="sheet" data-sheet="send" ${snap.hotCoins.length ? '' : 'disabled'}>Send</button>
            </div>
        </div>
        <div class="kv-card">
            <h2>What's inside</h2>
            <p class="kv-muted" style="margin-bottom:6px">Taking money out always takes ${esc(day)}. Each deposit comes out whole.</p>
            ${rows || (snap.pending.length ? `<div class="kv-empty">The vault is empty right now. What is on its way out is shown at the top.</div>` : `<div class="kv-empty">Nothing in the vault yet. Press "Add money": straight from Kasware, or from any wallet or exchange to your vault address.</div>`)}
        </div>
        <div class="kv-foot">
            <button class="kv-link" data-act="sheet" data-sheet="how">How it's protected</button>
            <button class="kv-link" data-act="sheet" data-sheet="check">Check my vault</button>
            <button class="kv-link" data-act="card">Download vault card</button>
            <button class="kv-link" data-act="sheet" data-sheet="words">Recovery words</button>
            ${this.#locked() ? '' : '<button class="kv-link" data-act="lock">Lock</button>'}
            <button class="kv-link" data-act="sheet" data-sheet="remove">Remove from this browser</button>
        </div>`;
    }

    // ---------- sheets ----------
    #pw(force) { return force || this.#locked() ? `<label class="kv-label">Your password</label><input class="kv-input" type="password" name="password" autocomplete="current-password">` : ''; }
    #sheetHtml() {
        const sh = this.s.sheet, info = this.s.opened && this.s.opened.info, snap = this.s.snap;
        const close = (label = 'Cancel') => `<button class="kv-btn kv-btn-quiet" data-act="close">${label}</button>`;
        const err = `<div class="kv-err" data-err>${esc(sh.err || '')}</div>`;
        const busyLabel = (label) => (sh.busy ? esc(sh.busy) : label);
        let h = '';
        if (sh.kind === 'add') {
            const spend = snap ? snap.balances.hot : 0n;
            const ks = canSendFrom().length > 0;
            const way = sh.way || (ks ? 'kasware' : spend > 0n ? 'spending' : 'address');
            const tabs = [ks && ['kasware', 'From Kasware'], ['address', 'Any wallet or exchange'], spend > 0n && ['spending', 'From spending wallet']].filter(Boolean);
            const alertNote = this.s.watched ? '' : `<div class="kv-warn">Alerts are not on yet. Confirm the email from the watcher first, or nobody will tell you when a withdrawal starts.</div>`;
            const note = `<div class="kv-note">Taking it out again takes <b>${esc(dayWord(info.delayDaa))}</b>, and you get an email when it starts.</div>`;
            let body = '';
            if (way === 'kasware') body = `
                <p class="kv-muted">Kasware sends it straight into your vault. It asks you to approve.</p>
                <div class="kv-amt-in"><input name="ksAmount" inputmode="decimal" placeholder="0" autocomplete="off" autofocus><span>KAS</span></div>
                ${note}${err}
                <button class="kv-btn" data-act="do-kasware" data-enter data-need="ksAmount" ${sh.busy ? 'disabled' : ''}>${busyLabel('Send from Kasware')}</button>`;
            else if (way === 'address') body = `
                <p class="kv-muted">Send KAS to your vault's own address, from any Kaspa wallet or exchange. It shows up here once the network confirms it.</p>
                <div class="kv-qr"><div class="kv-qr-box">${qrSvg(info.vaultAddress)}</div><div class="kv-mono">${esc(info.vaultAddress)}</div></div>
                <button class="kv-btn kv-btn-line" data-act="copy" data-text="${esc(info.vaultAddress)}">Copy vault address</button>
                ${note}`;
            else body = `
                <p class="kv-muted">${esc(kas(spend))} in your spending wallet</p>
                <div class="kv-amt-in"><input name="amount" inputmode="decimal" placeholder="0" autocomplete="off" autofocus><span>KAS</span></div>
                <div class="kv-amt-row"><span class="kv-muted" data-hint></span><button class="kv-btn kv-btn-line kv-btn-small" data-act="amount-all">All of it</button></div>
                ${note}${this.#pw()}${err}
                <button class="kv-btn" data-act="do-add" data-enter data-need="amount${this.#locked() ? ',password' : ''}" ${sh.busy ? 'disabled' : ''}>${busyLabel('Add to vault')}</button>`;
            h = `<h3>Add money to your vault</h3>
                ${tabs.length > 1 ? `<div class="kv-tabs">${tabs.map(([k, l]) => `<button class="kv-tab ${k === way ? 'kv-tab-on' : ''}" data-act="add-way" data-way="${k}">${l}</button>`).join('')}</div>` : ''}
                ${alertNote}${body}${close(way === 'address' ? 'Close' : 'Cancel')}`;
        } else if (sh.kind === 'out') {
            const coins = sh.coins || [];
            h = `<h3>Take money out</h3><p class="kv-muted">It lands in your spending wallet after ${esc(dayWord(info.delayDaa))}.</p>
                <div class="kv-pick">${coins.map((c, i) => `<label><input type="checkbox" name="coin${i}" data-coin="${esc(c.txid)}:${c.index}" checked><span><b>${esc(kas(c.amount))}</b><span>deposit</span></span></label>`).join('')}</div>
                <div class="kv-note">You'll get an email now. If it wasn't you, that email has a button that sends everything to your backup wallet instead.</div>
                ${this.#pw()}${err}
                <button class="kv-btn" data-act="do-out" data-enter ${this.#locked() ? 'data-need="password"' : ''} ${sh.busy ? 'disabled' : ''}>${busyLabel('Start taking out')}</button>${close()}`;
        } else if (sh.kind === 'receive') {
            const addr = info.hotAddress;
            const ks = canSendFrom();
            h = `<h3>Your spending wallet</h3><p class="kv-muted">Withdrawals from the vault land here, ready to spend. You can also send KAS here from any wallet or exchange.</p>
                <div class="kv-qr"><div class="kv-qr-box">${qrSvg(addr)}</div><div class="kv-mono">${esc(addr)}</div></div>
                <button class="kv-btn kv-btn-line" data-act="copy" data-text="${esc(addr)}">Copy address</button>
                ${ks.length ? `<div class="kv-note"><b>From Kasware on this browser:</b>
                    <div class="kv-amt-in" style="margin-bottom:0"><input name="ksAmount" inputmode="decimal" placeholder="0" autocomplete="off"><span>KAS</span></div></div>
                    ${err}<button class="kv-btn" data-act="do-kasware" data-need="ksAmount" ${sh.busy ? 'disabled' : ''}>${busyLabel('Send from Kasware')}</button>` : ''}
                ${close('Close')}`;
        } else if (sh.kind === 'send') {
            h = `<h3>Send from your spending wallet</h3><p class="kv-muted">${esc(kas(snap ? snap.balances.hot : 0n))} there</p>
                <label class="kv-label">To</label><input class="kv-input kv-mono" name="to" placeholder="kaspa:…" autocomplete="off" spellcheck="false" autofocus>
                <div class="kv-amt-in"><input name="amount" inputmode="decimal" placeholder="0" autocomplete="off"><span>KAS</span></div>
                <div class="kv-amt-row"><span class="kv-muted" data-hint></span><button class="kv-btn kv-btn-line kv-btn-small" data-act="amount-all">All of it</button></div>
                ${this.#pw(true)}${err}
                <button class="kv-btn" data-act="do-send" data-enter data-need="to,amount,password" ${sh.busy ? 'disabled' : ''}>${busyLabel('Send')}</button>${close()}`;
        } else if (sh.kind === 'notme') {
            h = `<h3>Didn't start this withdrawal?</h3>
                <p>Then someone has your vault's wallet. The watcher can move everything in the vault, and everything on its way out, to your backup wallet <span class="kv-mono">${esc(short(info.rescueAddress))}</span>. Only there.</p>
                <div class="kv-note">Use the button in the alert email. Can't find it? We'll email a new one to ${esc(this.s.rec.email || 'your confirmed address')}. Then don't put money back into this vault: open a new one with new words.</div>
                ${err}${sh.done ? `<div class="kv-ok">${icon.ok}<div>Sent. Check ${esc(this.s.rec.email || 'your email')} and press the button in it.</div></div>${close('Close')}`
                : `<button class="kv-btn" data-act="do-lost" ${sh.busy ? 'disabled' : ''}>${busyLabel('Email me the rescue button')}</button>${close()}`}`;
        } else if (sh.kind === 'alerts') {
            h = `<h3>Turn on alerts</h3><p class="kv-muted">The watcher, ${esc(this.s.guardian ? this.s.guardian.name : this.watcherUrl)}, emails you the moment a withdrawal starts.</p>
                <label class="kv-label">Email</label><input class="kv-input" type="email" name="email" value="${esc(this.s.rec.email || '')}" data-fresh autocomplete="email" autofocus>
                ${this.#pw()}${err}
                <button class="kv-btn" data-act="do-alerts" data-enter data-need="email${this.#locked() ? ',password' : ''}" ${sh.busy ? 'disabled' : ''}>${busyLabel('Send the confirmation link')}</button>${close()}`;
        } else if (sh.kind === 'words') {
            h = sh.showing && this.#shown ? `<h3>Your recovery words</h3><p class="kv-muted">They open your vault's wallet in any Kaspa wallet app. Never type them into a website you don't trust.</p>
                <div class="kv-words">${this.#shown.split(' ').map(w => `<span>${esc(w)}</span>`).join('')}</div>
                <div class="kv-row2"><button class="kv-btn kv-btn-line" data-act="copy-words">Copy words</button><button class="kv-btn kv-btn-line" data-act="backup">Download backup file</button></div>
                <p class="kv-muted kv-gap">The backup file holds the words and the vault card together: everything needed to open this vault anywhere. Keep it as private as the words.</p>${close('Hide')}`
                : `<h3>Show recovery words</h3><p class="kv-muted">Make sure nobody can see your screen.</p>
                ${this.#pw(true)}${err}<button class="kv-btn" data-act="do-words" data-enter data-need="password">Show</button>${close()}`;
        } else if (sh.kind === 'check') {
            h = this.#checkHtml() + close('Close');
        } else if (sh.kind === 'how') {
            const day = dayWord(info.delayDaa);
            h = `<h3>How your vault is protected</h3>
                <div class="kv-note"><b>Money in the vault can only go two places:</b> your spending wallet, after ${esc(day)}; or your backup wallet, at any time. That is written into the vault itself, on the Kaspa network. No website, no watcher, nobody can change it.</div>
                <div class="kv-note"><b>The watcher</b> (${esc(this.s.guardian ? this.s.guardian.name : this.watcherUrl)}) emails you the moment a withdrawal starts. If it wasn't you, its button moves everything to your backup wallet. Its key can't send money anywhere else.</div>
                <div class="kv-note"><b>If someone steals your vault's wallet,</b> all they can do is start the ${esc(day)} clock. You get the email and press the button.</div>
                <div class="kv-note"><b>If this website disappears,</b> your 12 words and the vault card work the vault from any Kaspa tool. The watcher still finishes withdrawals and sends alerts.</div>
                ${close('Close')}`;
        } else if (sh.kind === 'remove') {
            h = `<h3>Remove the vault from this browser?</h3>
                <p>The money stays in the vault. To open it again here or anywhere else you need the <b>vault card</b> and your <b>12 recovery words</b>.</p>
                <button class="kv-btn kv-btn-line" data-act="card">Download the vault card first</button>
                <label class="kv-label">Type REMOVE to confirm</label><input class="kv-input" name="confirm" autocomplete="off">
                ${err}<button class="kv-btn" data-act="do-remove" data-need="confirm">Remove from this browser</button>${close()}`;
        } else if (sh.kind === 'done') {
            h = `<h3>${esc(sh.title)}</h3><p class="kv-muted">${esc(sh.text)}</p>
                <div class="kv-progress">${sh.steps.map((t, i) => `<div class="kv-pstep ${i < sh.at ? 'kv-pstep-done' : i === sh.at ? 'kv-pstep-now' : ''}"><span class="kv-pdot">${i < sh.at ? '✓' : i + 1}</span>${esc(t)}</div>`).join('')}</div>
                <p class="kv-muted">${sh.txids.map(t => { const u = this.#explorer(t); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t.slice(0, 12))}…</a>` : `<span class="kv-mono">${esc(t.slice(0, 16))}…</span>`; }).join(' · ')}</p>
                ${sh.failed ? `<div class="kv-err">${esc(sh.failed)}</div>` : ''}
                <button class="kv-btn" data-act="close">Done</button>`;
        }
        return `<div class="kv-overlay" data-act="overlay"><div class="kv-sheet" role="dialog" aria-modal="true">${h}</div></div>`;
    }

    #checkHtml() {
        const { opened, rec } = this.s;
        const info = opened.info, c = rec.card;
        const g = this.s.guardian;
        const live = g ? (g.pubkey === c.keys.guardian ? `${icon.ok}<div>The watcher answers with this key right now.</div>` : null) : null;
        return `<h3>Check my vault</h3>
            <div class="kv-ok">${icon.ok}<div>Rebuilt in this browser from the keys on your vault card: the addresses below are exactly what those keys and the published vault contracts produce.</div></div>
            ${live ? `<div class="kv-ok">${live}</div>` : g ? `<div class="kv-warn">The watcher now answers with a different key (${esc(g.pubkey.slice(0, 16))}…). Your vault still names ${esc(c.keys.guardian.slice(0, 16))}…, so only that key can rescue it. Contact the watcher's operator.</div>` : ''}
            <dl class="kv-kv">
                <dt>Vault</dt><dd>${esc(info.vaultAddress)}</dd>
                <dt>On its way out</dt><dd>${esc(info.airlockAddress)}</dd>
                <dt>Spending wallet</dt><dd>${esc(info.hotAddress)}</dd>
                <dt>Backup wallet</dt><dd>${esc(info.rescueAddress)}</dd>
                <dt>Watcher key</dt><dd>${esc(c.keys.guardian)}</dd>
                <dt>Waiting time</dt><dd>${esc(dayWord(info.delayDaa))} (${esc(info.delayDaa)} DAA)</dd>
            </dl>
            <p class="kv-muted">Check them yourself with the open-source tools: the two contract files below work with <span class="kv-mono">npx kaspa-ksm@1.0.2 verify</span>, and any Kaspa explorer shows what each address holds.</p>
            <button class="kv-btn kv-btn-line" data-act="ksm">Download the two contract files (.ksm)</button>`;
    }

    // ---------- events ----------
    #onInput(e) {
        const t = e.target;
        if (t.name === 'amount' || t.name === 'ksAmount') {
            const v = t.value.replace(/[^0-9.]/g, ''); const i = v.indexOf('.');
            const clean = i < 0 ? v : v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 8);
            if (clean !== t.value) t.value = clean;
            if (this.s.sheet) { this.s.sheet.all = false; if (this.s.sheet.err) this.#setErr(''); }
            this.#hint();
        }
        if (t.type === 'file' && t.dataset.actChange === 'restore-file') this.#restoreFile(t);
        this.#syncButtons();
    }
    #hint() {
        const el = this.#root.querySelector('[data-hint]'), a = this.#root.querySelector('[name=amount]');
        if (!el || !a) return;
        const v = parseKas(a.value), have = this.s.snap ? this.s.snap.balances.hot : 0n;
        el.textContent = this.s.sheet && this.s.sheet.all ? 'Everything there, minus the network fee' : v && v > have ? 'More than your spending wallet holds' : '';
    }
    #syncButtons() {
        this.#root.querySelectorAll('[data-need]').forEach(b => {
            if (b.dataset.busy) return;
            const need = b.dataset.need.split(',').filter(Boolean);
            const ok = need.every(n => { const el = this.#root.querySelector(`[name="${n}"]`); return !el || (el.type === 'checkbox' ? el.checked : el.value.trim() !== ''); });
            const busy = (this.s.sheet && this.s.sheet.busy) || (this.s.setup && this.s.setup.busy);
            b.disabled = !ok || !!busy;
        });
    }
    #val(n) { const el = this.#root.querySelector(`[name="${n}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }
    #setErr(msg) {
        if (this.s.sheet) this.s.sheet.err = msg; else if (this.s.setup) this.s.setup.err = msg; else if (this.s.restore) this.s.restore.err = msg;
        const el = this.#root.querySelector('[data-err]');
        if (el) el.textContent = msg || ''; else if (msg) this.#toast(msg, true);
    }

    async #onClick(e) {
        const el = e.target.closest('[data-act]');
        if (!el || el.disabled) return;
        const act = el.dataset.act;
        if (act === 'overlay') { if (e.target === el && !(this.s.sheet && this.s.sheet.busy)) this.#closeSheet(); return; }
        e.preventDefault();
        try { await this.#act(act, el); }
        catch (err) { this.#setErr(friendly(err)); }
    }

    #openSheet(kind, extra = {}) {
        // the coins a sheet offers are fixed when it opens; refreshes never change what a box means
        const coins = kind === 'out' && this.s.snap ? [...this.s.snap.vaultCoins] : null;
        this.s.sheet = { kind, coins, ...extra }; this.#paint();
    }
    #closeSheet() { this.s.sheet = null; this.#shown = null; this.#paint(); this.refresh(); }
    #sheetBusy(label) { this.s.sheet.busy = label; this.s.sheet.err = ''; this.#paint(); }

    async #act(act, el) {
        const s = this.s;
        switch (act) {
        // ---- setup ----
        case 'setup-start':
            s.setup = { step: 1, sub: 'password' }; s.phase = 'setup'; return this.#paint();
        case 'setup-cancel':
            s.setup = null; this.#draft = null; s.phase = 'welcome'; return this.#paint();
        case 'setup-password': {
            const a = this.#val('pw1'), b = this.#val('pw2');
            if (a.length < 8) return this.#setErr('Use at least 8 characters.');
            if (a !== b) return this.#setErr('The two passwords are not the same.');
            const words = W.newWords();
            const w = W.walletFromWords(words, { network: s.guardian.network });
            const pick = () => Math.floor(Math.random() * 12);
            let q1 = pick(), q2 = pick(); while (q2 === q1) q2 = pick();
            this.#draft = { password: a, words, wallet: w };
            Object.assign(s.setup, { sub: 'words', hotAddress: w.address, quiz: [Math.min(q1, q2), Math.max(q1, q2)], err: '' });
            return this.#paint();
        }
        case 'setup-words': s.setup.sub = 'quiz'; s.setup.err = ''; return this.#paint();
        case 'setup-show-words': s.setup.sub = 'words'; return this.#paint();
        case 'setup-quiz': {
            const ws = this.#draft.words.split(' ');
            const ok = this.#val('q1').trim().toLowerCase() === ws[s.setup.quiz[0]] && this.#val('q2').trim().toLowerCase() === ws[s.setup.quiz[1]];
            if (!ok) return this.#setErr('Those are not the right words. Check what you wrote, or show the words again.');
            Object.assign(s.setup, { step: 2, err: '', proof: `kaspa-vault: this is my backup wallet\nvault wallet: ${s.setup.hotAddress}\ncode: ${randomHex(8)}` });
            return this.#paint();
        }
        case 'setup-backup-ext': {
            s.setup.err = '';
            const btn = el; btn.disabled = true;
            const address = await proveWith(el.dataset.wallet, s.setup.proof, s.guardian.network).finally(() => { btn.disabled = false; });
            if (address === s.setup.hotAddress) return this.#setErr("That is the vault's own wallet. Pick another wallet as the backup.");
            s.setup.backup = { address, how: WALLETS.find(w => w.id === el.dataset.wallet).name };
            return this.#paint();
        }
        case 'setup-backup-type': s.setup.typing = true; s.setup.err = ''; return this.#paint();
        case 'setup-backup-typed': {
            const a = this.#val('backupAddr').trim().toLowerCase();
            const pub = W.pubkeyFromAddress(a);
            if (!pub || K.p2pkAddress(s.guardian.network, pub) !== a) return this.#setErr(`That is not a standard ${s.guardian.network === 'mainnet' ? 'kaspa:q' : 'kaspatest:q'} address.`);
            if (a === s.setup.hotAddress) return this.#setErr("That is the vault's own wallet. Use another wallet as the backup.");
            s.setup.backup = { address: a, how: 'typed' }; s.setup.typing = false;
            return this.#paint();
        }
        case 'setup-backup-change': s.setup.backup = null; s.setup.typing = false; s.setup.err = ''; return this.#paint();
        case 'setup-backup-ok': s.setup.step = 3; return this.#paint();
        case 'setup-delay': s.setup.delayDaa = el.dataset.daa; return this.#paint();
        case 'setup-delay-ok': s.setup.step = 4; return this.#paint();
        case 'setup-create': return this.#create();

        // ---- restore ----
        case 'restore-start': s.restore = {}; s.phase = 'restore'; return this.#paint();
        case 'restore-cancel': s.restore = null; s.phase = 'welcome'; return this.#paint();
        case 'restore-go': return this.#restoreGo();

        // ---- account ----
        case 'sheet': return this.#openSheet(el.dataset.sheet);
        case 'close': return this.#closeSheet();
        case 'lock': this.#forget(); this.#toast('Locked. Your password is needed for the next action.'); return;
        case 'copy': {
            try { await navigator.clipboard.writeText(el.dataset.text); this.#toast('Copied'); } catch (e) { this.#toast('Copy did not work; select the address instead', true); }
            return;
        }
        case 'copy-draft-words':
        case 'copy-words': {
            const w = act === 'copy-draft-words' ? this.#draft && this.#draft.words : this.#shown;
            try { await navigator.clipboard.writeText(w); this.#toast('Words copied. Paste them somewhere private.'); } catch (e) { this.#toast('Copy did not work; write them down instead', true); }
            return;
        }
        case 'backup': {
            // the words need the password unless just unlocked; the words sheet asks for it
            const words = this.#shown || (!this.#locked() && this.#secret.words);
            if (!words) return this.#openSheet('words');
            const c = s.rec.card;
            download(`kaspa-vault-backup-${s.opened.info.vaultAddress.split(':')[1].slice(0, 8)}.json`, JSON.stringify({
                format: 'kaspa-vault-backup/1',
                warning: 'PRIVATE. Anyone with these words can start withdrawals from this vault (the waiting time and the watcher still protect it). Keep this file as safe as the words.',
                words, card: c, howToOpen: 'kaspavault.com -> "I already have a vault" -> choose this file. Or import the words in Kasware/Kastle/Kaspium and use the card with any Kaspa tool.'
            }, null, 2));
            if (s.rec.cardSaved === false) { s.rec.cardSaved = true; this.#save(s.rec); }
            return this.#toast('Backup file saved. Keep it private.');
        }
        case 'card': {
            const c = s.rec.card;
            download(`kaspa-vault-card-${s.opened.info.vaultAddress.split(':')[1].slice(0, 8)}.json`, JSON.stringify(c, null, 2));
            if (s.rec.cardSaved === false) { s.rec.cardSaved = true; this.#save(s.rec); }
            return this.#toast('Vault card saved. Keep it with your recovery words.');
        }
        case 'ksm': {
            const files = manifestFiles({ vault: s.opened.vault, airlock: s.opened.airlock });
            files.forEach((f, i) => setTimeout(() => download(f.name, f.text), i * 400));
            return;
        }
        case 'amount-all': {
            s.sheet.all = true; this.#setErr('');
            const a = this.#root.querySelector('[name=amount]');
            if (a) { a.value = kas(s.snap.balances.hot, false).replace(/,/g, ''); }
            this.#hint(); this.#syncButtons();
            return;
        }
        case 'do-add': return this.#doAdd();
        case 'add-way': s.sheet.way = el.dataset.way; s.sheet.err = ''; s.sheet.all = false; return this.#paint();
        case 'do-out': return this.#doOut();
        case 'do-send': return this.#doSend();
        case 'do-kasware': return this.#doKasware();
        case 'do-lost': return this.#doLost();
        case 'do-alerts': return this.#doAlerts();
        case 'do-words': {
            s.sheet.busy = 'Checking…'; this.#paint();
            try { const sec = await this.#unlock(this.#val('password'), { force: true }); this.#shown = sec.words; s.sheet.showing = true; }
            finally { s.sheet.busy = null; }
            return this.#paint();
        }
        case 'do-remove': {
            if (this.#val('confirm').trim() !== 'REMOVE') return this.#setErr('Type REMOVE in capital letters.');
            try { localStorage.removeItem(this.storageKey); } catch (e) { /* gone anyway */ }
            this.#forget(); clearInterval(this.#timer);
            this.s = { phase: 'loading', guardian: null, rec: null, opened: null, snap: null, watched: null, setup: null, sheet: null };
            this.client = null; this._provider = null;
            return this.#start();
        }
        }
    }

    // ---------- the actions ----------
    async #create() {
        const st = this.s.setup;
        const email = String(this.#val('email')).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.#setErr('That email address does not look right.');
        st.busy = 'Opening your vault…'; st.err = ''; this.#paint();
        try {
            const g = await this.#loadGuardian();          // re-checked now, against the pin
            const d = this.#draft;
            const built = buildVault({ hot: d.wallet.publicKey, guardian: g.pubkey, rescue: W.pubkeyFromAddress(st.backup.address), delayDaa: String(st.delayDaa), network: g.network });
            const card = makeCard({ ...built, watcher: { url: this.watcherUrl, name: g.name } });
            const opened = openCard(card);
            if (opened.info.rescueAddress !== st.backup.address || opened.info.hotAddress !== d.wallet.address) throw new Error('The vault did not come out as expected; nothing was saved.');
            const box = await W.lock({ words: d.words }, d.password);
            const rec = { format: RECORD, box, card, email: null, registeredAt: null, cardSaved: false, createdAt: new Date().toISOString() };
            this.#save(rec);
            this.#secret = { words: d.words, priv: d.wallet.privateKey, until: Date.now() + KEY_TTL_MS };
            this.#draft = null;
            this.s = { ...this.s, rec, opened, phase: 'account', setup: null, watched: false };
            this.client = new VaultClient({ vault: opened.vault, airlock: opened.airlock }, { provider: this.#provider() });
            this.#paint();
            try { await this.#register(email); this.#toast('Your vault is open. Check your email to turn on alerts.'); }
            catch (e) { this.#toast('Your vault is open, but the alert sign-up failed: ' + friendly(e), true); }
            await this.refresh();
            clearInterval(this.#timer);
            this.#timer = setInterval(() => { if (document.visibilityState === 'visible') this.refresh(); }, REFRESH_MS);
        } catch (e) {
            st.busy = null; this.#paint(); this.#setErr(friendly(e));
        }
    }

    async #register(email) {
        const { rec, opened } = this.s;
        const time = new Date().toISOString();
        const message = registrationMessage({ guardian: rec.card.keys.guardian, vaultAddress: opened.info.vaultAddress, email, time });
        const signature = K.signMessage(message, this.#secret.priv);
        const r = await fetch(`${this.watcherUrl}/v1/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card: rec.card, email, time, signature }) });
        let d = {}; try { d = await r.json(); } catch (e) { d = {}; }
        if (!r.ok) throw new Error(d.error || `The watcher answered ${r.status}`);
        rec.email = email; rec.registeredAt = time;
        this.#save(rec);
        return d;
    }

    async #restoreFile(input) {
        const r = this.s.restore;
        r.err = ''; r.card = null; r.info = null;
        try {
            const file = JSON.parse(await input.files[0].text());
            const card = file && file.format === 'kaspa-vault-backup/1' ? file.card : file;
            r.info = openCard(card).info;          // the addresses its keys produce, never the file's own claims
            r.card = card;
            r.words = file && file.format === 'kaspa-vault-backup/1' && typeof file.words === 'string' ? file.words : null;
        } catch (e) { r.err = 'That file is not a vault card or backup file: ' + e.message; }
        this.#paint();
        const t = this.#root.querySelector('[name=words]');
        if (t && r.words) { t.value = r.words; this.#syncButtons(); }
    }
    async #restoreGo() {
        const r = this.s.restore;
        if (!r.card) return this.#setErr('Choose your vault card file first.');
        if (!this.#val('backupMine')) return this.#setErr('Confirm the backup wallet is yours.');
        const words = String(this.#val('words')).trim().toLowerCase().split(/\s+/).join(' ');
        const a = this.#val('pw1'), b = this.#val('pw2');
        if (!W.wordsOk(words)) return this.#setErr('Those recovery words are not valid. Check the spelling and the order.');
        if (a.length < 8) return this.#setErr('Use at least 8 characters for the password.');
        if (a !== b) return this.#setErr('The two passwords are not the same.');
        const w = W.walletFromWords(words, { network: r.card.network });
        if (w.publicKey !== r.card.keys.hot) return this.#setErr("These words don't open this vault. They belong to another wallet.");
        r.busy = true; this.#paint();
        try {
            // the card must name this page's watcher (and its pinned key): a card made by someone else,
            // with their own guardian, would let them empty the vault into their own "backup"
            const g = await this.#loadGuardian();
            if (r.card.network !== g.network) throw new Error(`This vault is on ${r.card.network}; this page works with ${g.network}.`);
            if (String(r.card.keys.guardian).toLowerCase() !== g.pubkey) throw new Error(`This vault is guarded by another watcher (key ${String(r.card.keys.guardian).slice(0, 12)}…), not ${g.name}. Open it on the site that made it, or with any Kaspa tool from the vault card.`);
            const box = await W.lock({ words }, a);
            const rec = { format: RECORD, box, card: r.card, email: null, registeredAt: null, cardSaved: true, createdAt: new Date().toISOString() };
            const opened = openCard(r.card);
            this.#save(rec);
            this.#secret = { words, priv: w.privateKey, until: Date.now() + KEY_TTL_MS };
            this.s = { ...this.s, rec, opened, phase: 'account', restore: null };
            this._provider = null;
            this.client = new VaultClient({ vault: opened.vault, airlock: opened.airlock }, { provider: this.#provider() });
            this.#paint();
            await this.refresh();
            clearInterval(this.#timer);
            this.#timer = setInterval(() => { if (document.visibilityState === 'visible') this.refresh(); }, REFRESH_MS);
        } catch (e) { r.busy = false; this.#paint(); this.#setErr(friendly(e)); }
    }

    #form() { return this.#root.querySelector('.kv-sheet'); }

    async #doAdd() {
        const sh = this.s.sheet;
        const amount = sh.all ? null : parseKas(this.#val('amount'));
        if (!sh.all && !amount) return this.#setErr('Enter the amount as a plain number, like 25 or 2.5');
        const form = this.#form();
        this.#sheetBusy('Checking…');
        try {
            const signer = await this.#signer(form);
            this.#sheetBusy('Moving…');
            const r = await this.client.deposit({ signer, ...(sh.all ? { all: true } : { amount }) });
            this.#done({ title: `${kas(r.amount)} into your vault`, text: `Network fee ${kas(r.fee)}.`, steps: ['Sent from your spending wallet', 'Confirming on the network', 'In your vault'], at: 1, txids: [r.txid], watch: 'deposit' });
        } catch (e) { sh.busy = null; this.#paint(); this.#setErr(friendly(e)); }
    }
    async #doOut() {
        const sh = this.s.sheet;
        const ticked = new Set([...this.#root.querySelectorAll('[data-coin]')].filter(b => b.checked).map(b => b.dataset.coin));
        const picked = (sh.coins || []).filter(c => ticked.has(`${c.txid}:${c.index}`));
        if (!picked.length) return this.#setErr('Pick at least one deposit.');
        const form = this.#form();
        this.#sheetBusy('Checking…');
        try {
            const signer = await this.#signer(form);
            this.#sheetBusy('Starting…');
            const r = await this.client.withdraw({ signer, coins: picked });
            if (!r.started.length) throw new Error(r.failed[0] ? r.failed[0].error : 'nothing could be started');
            const total = r.started.reduce((a, x) => a + x.amount, 0n);
            this.#done({
                title: `${kas(total)} on its way out`, text: `It lands in your spending wallet after ${dayWord(this.s.opened.info.delayDaa)}.`,
                steps: ['Withdrawal started', 'The watcher emails you', `Lands after ${dayWord(this.s.opened.info.delayDaa)}`], at: 1,
                txids: r.started.map(x => x.txid), failed: r.failed.length ? `${r.failed.length} part(s) could not start: ${r.failed[0].error}` : '', watch: 'withdraw'
            });
        } catch (e) { sh.busy = null; this.#paint(); this.#setErr(friendly(e)); }
    }
    async #doSend() {
        const sh = this.s.sheet;
        const to = String(this.#val('to')).trim().toLowerCase();
        try { K.scriptPublicKey(to); } catch (e) { return this.#setErr('That is not a Kaspa address.'); }
        if (K.networkOf(to) !== this.network) return this.#setErr(`That address is not on ${this.network}.`);
        const amount = sh.all ? null : parseKas(this.#val('amount'));
        if (!sh.all && !amount) return this.#setErr('Enter the amount as a plain number.');
        const form = this.#form();
        this.#sheetBusy('Checking…');
        try {
            const signer = await this.#signer(form, { force: true });
            this.#sheetBusy('Sending…');
            const r = await this.client.sendFromHot({ signer, to, ...(sh.all ? { all: true } : { amount }) });
            this.#done({ title: `${kas(r.amount)} sent`, text: `To ${short(to)}. Network fee ${kas(r.fee)}.`, steps: ['Sent', 'Confirmed'], at: 1, txids: [r.txid], watch: 'send' });
        } catch (e) { sh.busy = null; this.#paint(); this.#setErr(friendly(e)); }
    }
    async #doKasware() {
        const amount = parseKas(this.#val('ksAmount'));
        if (!amount) return this.#setErr('Enter the amount as a plain number.');
        this.#sheetBusy('Waiting for Kasware…');
        try {
            const toVault = this.s.sheet.kind === 'add';
            await sendFrom('kasware', toVault ? this.s.opened.info.vaultAddress : this.s.opened.info.hotAddress, amount);
            this.s.sheet = null; this.#toast(`${kas(amount)} sent from Kasware ${toVault ? 'into your vault' : 'to your spending wallet'}. It shows up here within a few seconds.`);
            setTimeout(() => this.refresh(), 3000);
        } catch (e) { this.s.sheet.busy = null; this.#paint(); this.#setErr(friendly(e)); }
    }
    async #doLost() {
        const { rec, opened } = this.s;
        if (!rec.email) return this.#setErr('No email is registered for this vault in this browser. Use the button in the alert email.');
        this.#sheetBusy('Asking the watcher…');
        try {
            const r = await fetch(`${this.watcherUrl}/v1/lost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vaultAddress: opened.info.vaultAddress, email: rec.email }) });
            if (!r.ok) { let d = {}; try { d = await r.json(); } catch (e) { d = {}; } throw new Error(d.error || `The watcher answered ${r.status}`); }
            this.s.sheet.busy = null; this.s.sheet.done = true; this.#paint();
        } catch (e) { this.s.sheet.busy = null; this.#paint(); this.#setErr(friendly(e)); }
    }
    async #doAlerts() {
        const email = String(this.#val('email')).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.#setErr('That email address does not look right.');
        await this.#unlock(this.#val('password'));
        this.#sheetBusy('Sending…');
        try {
            await this.#register(email);
            this.s.sheet = null; this.#toast(`Confirmation link sent to ${email}.`);
            this.refresh();
        } catch (e) { this.s.sheet.busy = null; this.#paint(); this.#setErr(friendly(e)); }
    }

    // a progress sheet that follows the network until its last step is reached
    #done(d) {
        // the step each kind reaches once its transaction shows up in a coin list
        const target = { deposit: 3, withdraw: 2, send: 2 }[d.watch];
        this.s.sheet = { kind: 'done', ...d };
        this.#paint();
        let n = 0;
        const tick = async () => {
            const sh = this.s.sheet;
            if (!sh || sh.kind !== 'done' || n++ > 40) return;
            try {
                const snap = await this.client.snapshot();
                this.s.snap = snap;
                const ids = new Set([...snap.vaultCoins, ...snap.airlockCoins, ...snap.hotCoins].map(c => c.txid));
                if (sh.txids.some(t => ids.has(t))) sh.at = target;
            } catch (e) { /* next tick */ }
            if (this.s.sheet !== sh) return;
            this.#paint();
            if (sh.at < target) setTimeout(tick, 3000);
        };
        setTimeout(tick, 2500);
    }
}

if (!customElements.get('kaspa-vault')) customElements.define('kaspa-vault', KaspaVault);
