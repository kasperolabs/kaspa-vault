// site.js - the small amount of script the kaspavault.com pages (other than the vault itself) use:
// watcher status lights, "Check a vault" and "Check this website" on verify.html.
// Bundled by tools/build-widget.js into site/site.js. Reads only; never signs, never stores.

import { openCard, manifestFiles } from '../../core/card.js';
import { restProvider } from '../../core/provider.js';
import * as K from '../../core/kaspa.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kas = sompi => { const [w, f = ''] = K.kasStr(BigInt(sompi)).split('.'); const fr = f.replace(/0+$/, ''); return `${Number(w).toLocaleString('en-US')}.${(fr.length < 2 ? (fr + '00').slice(0, 2) : fr)} KAS`; };
const NODE = 'https://api.kaspa.org';
const EXPLORER = 'https://explorer.kaspa.org/addresses/';
const STUDIO = 'https://silverscriptstudio.com/v/';

// ---------- watcher lights: <span data-watcher="https://…" data-guardian="hex"></span> ----------
async function light(el) {
    const url = el.dataset.watcher.replace(/\/+$/, '');
    let state = 'offline', note = 'cannot be reached';
    try {
        const g = await (await fetch(`${url}/v1/guardian`, { cache: 'no-store' })).json();
        if (el.dataset.guardian && g.pubkey !== el.dataset.guardian) { state = 'offline'; note = 'answers with an unexpected key'; }
        else if (g.healthy === false) { state = 'stale'; note = 'online, not reading the network right now'; }
        else {
            state = 'online';
            const ago = g.lastPoll ? Math.round((Date.now() - Date.parse(g.lastPoll)) / 1000) : null;
            note = ago != null ? `read the network ${ago < 90 ? `${ago}s` : `${Math.round(ago / 60)} min`} ago` : 'online';
        }
    } catch (e) { /* offline */ }
    el.className = `light light-${state}`;
    el.innerHTML = `<i></i>${state === 'online' ? 'Online' : state === 'stale' ? 'Behind' : 'Offline'}<small>${esc(note)}</small>`;
}
function lights() { document.querySelectorAll('[data-watcher]').forEach(light); }
lights();
setInterval(() => { if (document.visibilityState === 'visible') lights(); }, 20000);

// ---------- copy buttons: <button data-copy="#id"> ----------
document.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const src = $(b.dataset.copy);
    try { await navigator.clipboard.writeText(src.textContent.trim()); const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = t; }, 1500); } catch (err) { /* select manually */ }
});

// ---------- verify: check a vault card ----------
const known = () => [...document.querySelectorAll('[data-known-watcher]')].map(el => ({ name: el.dataset.name, url: el.dataset.knownWatcher, key: el.dataset.key }));

async function checkCard(file) {
    const out = $('#vault-result');
    out.hidden = false;
    out.innerHTML = '<p class="muted">Reading…</p>';
    let card;
    try {
        const json = JSON.parse(await file.text());
        // a backup file holds the words too: only its card is read, the words are never touched
        card = json && json.format === 'kaspa-vault-backup/1' ? json.card : json;
    } catch (e) { out.innerHTML = '<div class="bad">That file is not JSON.</div>'; return; }
    let opened;
    try { opened = openCard(card); }
    catch (e) { out.innerHTML = `<div class="bad"><b>This card does not add up.</b> ${esc(e.message)}. Do not put money into a vault made from it.</div>`; return; }
    const i = opened.info;
    const w = known().find(x => x.key === i.guardian);
    let bal = '';
    try {
        const coins = await restProvider({ url: NODE }).coins([i.vaultAddress, i.airlockAddress]);
        const sum = a => coins.filter(c => c.address === a).reduce((s, c) => s + c.amount, 0n);
        bal = `<dt>In the vault</dt><dd>${esc(kas(sum(i.vaultAddress)))}</dd><dt>On its way out</dt><dd>${esc(kas(sum(i.airlockAddress)))}</dd>`;
    } catch (e) { bal = '<dt>Balances</dt><dd>the network could not be read right now</dd>'; }
    const days = Number(i.delayDaa) / 864000;
    out.innerHTML = `
        <div class="good"><b>This card adds up.</b> The addresses below were rebuilt in your browser from the card's three keys and the published contracts, and they match the card.</div>
        <dl class="kv">
            <dt>Vault</dt><dd><a href="${EXPLORER}${esc(i.vaultAddress)}" target="_blank" rel="noopener">${esc(i.vaultAddress)}</a></dd>
            <dt>On its way out</dt><dd><a href="${EXPLORER}${esc(i.airlockAddress)}" target="_blank" rel="noopener">${esc(i.airlockAddress)}</a></dd>
            <dt>Spending wallet</dt><dd>${esc(i.hotAddress)}</dd>
            <dt>Backup wallet</dt><dd>${esc(i.rescueAddress)}</dd>
            <dt>Waiting time</dt><dd>${Number.isInteger(days) ? `${days} day${days === 1 ? '' : 's'}` : `${Math.round(Number(i.delayDaa) / 600)} minutes`} (${esc(i.delayDaa)} DAA)</dd>
            <dt>Watcher key</dt><dd>${esc(i.guardian)}</dd>
            ${bal}
        </dl>
        ${w ? `<div class="good">The watcher key is <b>${esc(w.name)}</b>'s. Its status right now: <span data-watcher="${esc(w.url)}" data-guardian="${esc(w.key)}"></span></div>`
            : '<div class="warn"><b>This vault names a watcher this site does not know.</b> That is fine if you run it or trust who does: that key is the only one that can move this vault to its backup wallet. If someone else gave you this card, make sure the backup wallet above is yours.</div>'}
        <p><b>Check the backup wallet line above.</b> It is the only place money can go in an emergency. It must be a wallet whose recovery words you have.</p>
        <p class="row"><button class="btn line" id="dl-ksm">Download the two contract files (.ksm)</button>
        <a class="btn line" href="${STUDIO}${esc(i.vaultAddress)}" target="_blank" rel="noopener">See it in SilverScript Studio</a></p>
        <p class="muted">With the files: <code>npx kaspa-ksm@1.0.2 verify Vault-${esc(i.vaultAddress.split(':')[1].slice(0, 8))}.ksm</code> checks them on your own computer, with no website involved.</p>`;
    $('#dl-ksm').addEventListener('click', () => manifestFiles({ vault: opened.vault, airlock: opened.airlock }).forEach((f, n) => setTimeout(() => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.text], { type: 'application/json' })); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }, n * 400)));
    lights();
}
const cardInput = $('#card-file');
if (cardInput) cardInput.addEventListener('change', () => cardInput.files[0] && checkCard(cardInput.files[0]));

// ---------- verify: the code this website serves ----------
async function hashServed() {
    const el = $('#served-hash');
    if (!el) return;
    try {
        const buf = await (await fetch('/kaspa-vault.min.js', { cache: 'no-store' })).arrayBuffer();
        const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
        el.textContent = K.bytesToHex(d);
    } catch (e) { el.textContent = 'could not be read'; }
}
hashServed();

// ---------- verify: lost access -> a rescue link to a confirmed email ----------
const lostGo = $('#lost-go');
if (lostGo) lostGo.addEventListener('click', async () => {
    const out = $('#lost-result');
    const vaultAddress = $('#lost-addr').value.trim().toLowerCase(), email = $('#lost-email').value.trim().toLowerCase();
    if (!/^kaspa(test)?:p[a-z0-9]{40,}$/.test(vaultAddress)) { out.innerHTML = '<div class="bad">That is not a vault address (it starts with kaspa:p).</div>'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { out.innerHTML = '<div class="bad">That email address does not look right.</div>'; return; }
    lostGo.disabled = true;
    const w = known()[0];
    try {
        const r = await fetch(`${w.url}/v1/lost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vaultAddress, email }) });
        if (!r.ok) { let d = {}; try { d = await r.json(); } catch (e) { d = {}; } throw new Error(d.error || `the watcher answered ${r.status}`); }
        out.innerHTML = `<div class="good">If ${esc(email)} is confirmed for that vault at ${esc(w.name)}, a rescue link is on its way. The button in it sends everything to the vault's backup wallet.</div>`;
    } catch (e) { out.innerHTML = `<div class="bad">${esc(e.message)}</div>`; }
    finally { lostGo.disabled = false; }
});
