// watcher/pages.js - the few pages behind email links. Server-rendered, no scripts, strict headers.
// Every page that acts is a GET that only shows, plus a POST that acts: mail scanners that prefetch
// links cannot confirm a registration or start a rescue by visiting it.

import * as K from '../core/kaspa.js';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export function page(cfg, title, inner) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
:root{--bg:#f5f7fa;--card:#fff;--line:#e5e9f0;--ink:#1a202c;--soft:#334155;--quiet:#64748b;--brand:#1a365d;--danger:#b91c1c;--okbg:#f0fdf4;--okline:#bbf7d0;--warnbg:#fff7ed;--warnline:#fed7aa}
@media (prefers-color-scheme:dark){:root{--bg:#0f141b;--card:#161d27;--line:#253041;--ink:#e6edf6;--soft:#c4cfdc;--quiet:#8b98a9;--brand:#9cc1ff;--okbg:#0f2a1c;--okline:#1f5a3a;--warnbg:#2a1d0f;--warnline:#5a3a1a}}
body{margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--ink)}
.wrap{max-width:560px;margin:0 auto;padding:32px 16px}.top{text-align:center;margin-bottom:18px;font-weight:700;color:var(--brand)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:14px}
h1{font-size:22px;margin:0 0 10px}p{font-size:15px;line-height:1.55;color:var(--soft);margin:0 0 12px}
.mono{font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all;background:var(--bg);border-radius:8px;padding:10px}
.big{font-size:32px;font-weight:700;margin:6px 0;font-variant-numeric:tabular-nums}.quiet{font-size:13px;color:var(--quiet)}
button{display:block;width:100%;padding:14px;border-radius:12px;border:0;background:var(--brand);color:#fff;font:inherit;font-size:16px;font-weight:600;cursor:pointer}
@media (prefers-color-scheme:dark){button{color:#0f141b}}
button.danger{background:var(--danger);color:#fff}.ok{background:var(--okbg);border-color:var(--okline)}.bad{background:var(--warnbg);border-color:var(--warnline)}
</style></head><body><div class="wrap"><div class="top">Kaspa Vault watcher · ${esc(cfg.name)}</div>${inner}
<p class="quiet" style="text-align:center">This watcher's key can only send vault money to the vault's own backup wallet.</p></div></body></html>`;
}

export const SECURITY_HEADERS = {
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store'
};

const hours = d => { const h = Number(d) / 36000; return h >= 48 && h % 24 === 0 ? `${h / 24} days` : h >= 1 ? `${Math.round(h * 10) / 10} hours` : `${Math.round(h * 60)} minutes`; };

export const pages = {
    expired: cfg => page(cfg, 'Link expired', `<div class="card"><h1>This link has expired or was already used</h1><p>Links from the watcher work once, for a limited time. If you still need something, start again from the vault page.</p></div>`),
    confirm: (cfg, r, action) => page(cfg, 'Confirm', `<div class="card"><h1>Watch this vault?</h1>
<p>Emails go to <b>${esc(r.email)}</b>. The moment a withdrawal starts, you get one with a button that moves everything to the backup wallet below.</p>
<p><b>Vault</b></p><p class="mono">${esc(r.vaultAddress)}</p>
<p><b>Backup wallet</b>. Check that this is a wallet you own and can open:</p><p class="mono">${esc(r.rescueAddress)}</p>
<p>Every withdrawal waits <b>${esc(hours(r.delayDaa))}</b>.</p>
<form method="post" action="${esc(action)}"><button type="submit">Yes, watch it</button></form></div>`),
    confirmed: (cfg, v) => page(cfg, 'Watching', `<div class="card ok"><h1>Your vault is being watched</h1><p>You will get an email the moment a withdrawal starts. A confirmation is on its way to your inbox, with a link to stop the emails if you ever want to.</p><p class="mono">${esc(v.vaultAddress)}</p></div>`),
    rescue: (cfg, v, coins, action) => {
        const sum = l => l.reduce((a, c) => a + c.amount, 0n);
        const total = sum(coins.air) + sum(coins.vault);
        if (total === 0n) return page(cfg, 'Nothing to move', `<div class="card ok"><h1>Nothing to move</h1><p>There is no money in the vault, and nothing on its way out. If you expected some, it may already be in your backup wallet or in the vault's wallet.</p></div>`);
        return page(cfg, 'Move everything to your backup wallet', `<div class="card"><h1>Move everything to your backup wallet?</h1>
<p>Press the button and all the money in the vault, including anything on its way out, goes to the backup wallet you chose when you set the vault up. Nothing else can receive it.</p>
<div class="big">${esc(K.kasStr(total))} KAS</div>
<p class="quiet">On its way out: ${esc(K.kasStr(sum(coins.air)))} KAS (${coins.air.length} coin${coins.air.length === 1 ? '' : 's'}). Still in the vault: ${esc(K.kasStr(sum(coins.vault)))} KAS (${coins.vault.length} coin${coins.vault.length === 1 ? '' : 's'}).</p>
<p><b>Goes to</b></p><p class="mono">${esc(v.rescueAddress)}</p>
<form method="post" action="${esc(action)}"><button class="danger" type="submit">Yes, move it all to my backup wallet</button></form>
<p class="quiet" style="margin-top:12px">If the withdrawal was yours, close this page and do nothing.</p></div>`);
    },
    rescued: (cfg, v, r) => page(cfg, 'Moving', `<div class="card ${r.remaining ? 'bad' : 'ok'}"><h1>${r.remaining ? 'Started' : 'Done'}: ${esc(K.kasStr(r.total))} KAS ${r.remaining ? 'is on its way' : 'went'} to your backup wallet</h1>
<p class="mono">${esc(v.rescueAddress)}</p>
<p>${r.txids.map(x => `<a class="mono" href="https://explorer.kaspa.org/txs/${esc(x)}">${esc(x.slice(0, 16))}…</a>`).join('<br>') || 'No transaction was needed.'}</p>
${r.remaining ? `<p>${r.remaining} coin(s) could not be moved yet${r.errors.length ? ` (${esc(r.errors.join('; '))})` : ''}. The watcher keeps trying on its own and emails you when they are moved.</p>` : ''}
<p>Open your backup wallet to see the money. If someone else started a withdrawal, they have your vault's key: do not put money back into this vault.</p></div>`),
    unsubscribe: (cfg, v, email, action) => page(cfg, 'Stop emails', `<div class="card"><h1>Stop emails about this vault?</h1><p><b>${esc(email)}</b> will no longer hear about withdrawals from</p><p class="mono">${esc(v.vaultAddress)}</p><p>Without these emails nobody may notice a withdrawal you did not make.</p><form method="post" action="${esc(action)}"><button class="danger" type="submit">Stop the emails</button></form></div>`),
    unsubscribed: cfg => page(cfg, 'Stopped', `<div class="card"><h1>Emails stopped</h1><p>This address will not hear about the vault any more.</p></div>`),
    error: (cfg, msg) => page(cfg, 'Error', `<div class="card bad"><h1>Something went wrong</h1><p>${esc(msg)}</p><p>Try the link again in a minute.</p></div>`)
};
