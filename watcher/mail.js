// watcher/mail.js - every email the watcher sends. Plain text first, simple HTML beside it.
// MAIL_TRANSPORT=log writes to DATA_DIR/outbox.log instead of sending (testing, first installs).

import fs from 'fs';
import path from 'path';
import * as K from '../core/kaspa.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const hours = d => { const h = Number(d) / 36000; return h >= 48 && h % 24 === 0 ? `${h / 24} days` : h >= 1 ? `${Math.round(h * 10) / 10} hours` : `${Math.round(h * 60)} minutes`; };
const when = d => new Date(d).toUTCString().replace(' GMT', ' UTC');

function html(title, body, cfg) {
    return `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a202c">
<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="font-weight:700;color:#1a365d;margin-bottom:14px">Kaspa Vault watcher · ${esc(cfg.name)}</div>
<div style="background:#fff;border:1px solid #e5e9f0;border-radius:14px;padding:22px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${body}</div>
<p style="font-size:12px;color:#64748b;margin-top:14px">This watcher holds one key, and the vault contracts only let that key send your money to your own backup wallet. It cannot send it anywhere else. ${esc(cfg.siteUrl)}</p></div></body></html>`;
}
const p = t => `<p style="font-size:15px;line-height:1.55;color:#334155;margin:0 0 12px">${t}</p>`;
const mono = t => `<p style="font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all;background:#f8fafc;border-radius:8px;padding:10px;margin:0 0 12px">${esc(t)}</p>`;
const button = (href, label, color) => `<p style="margin:18px 0"><a href="${esc(href)}" style="display:inline-block;background:${color || '#1a365d'};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">${esc(label)}</a></p>`;

export function createMailer(cfg) {
    let transport = null;
    const outbox = [];
    async function send({ to, subject, text, htmlBody }) {
        const msg = { from: cfg.mail.from || `watcher@${new URL(cfg.publicUrl).host}`, to, subject, text, html: htmlBody };
        if (cfg.mail.transport === 'log') {
            outbox.push({ ...msg, at: new Date().toISOString() });
            fs.appendFileSync(path.join(cfg.dataDir, 'outbox.log'), `---- ${new Date().toISOString()} to ${to}\nSubject: ${subject}\n\n${text}\n`, { mode: 0o600 });
            return;
        }
        if (!transport) {
            const nodemailer = (await import('nodemailer')).default;
            transport = nodemailer.createTransport({ host: cfg.mail.host, port: cfg.mail.port, secure: cfg.mail.secure, auth: { user: cfg.mail.user, pass: cfg.mail.pass } });
        }
        await transport.sendMail(msg);
    }
    const W = cfg.publicUrl;

    return {
        outbox,
        confirm({ to, vault, token }) {
            const link = `${W}/confirm/${token}`;
            const text = `Someone asked this watcher to watch a Kaspa vault and email you about it.

Vault:          ${vault.vaultAddress}
Backup wallet:  ${vault.rescueAddress}
Waiting time:   ${hours(vault.delayDaa)} for every withdrawal

Check that the backup wallet is yours. It is the only place a rescue can send your money.

Confirm here: ${link}

If you did not ask for this, ignore this email. Nothing is watched until the link is used.`;
            return send({ to, subject: 'Confirm: watch my Kaspa vault', text, htmlBody: html('Confirm watching your vault', p('Someone asked this watcher to watch a Kaspa vault and email you about it.') +
                p('<b>Vault</b>') + mono(vault.vaultAddress) + p('<b>Backup wallet</b>, the only place a rescue can send your money. Check that it is yours:') + mono(vault.rescueAddress) +
                p(`Every withdrawal waits <b>${esc(hours(vault.delayDaa))}</b>.`) + button(link, 'Confirm') + p('If you did not ask for this, ignore this email. Nothing is watched until the link is used.'), cfg) });
        },
        watching({ to, vault, unsubToken }) {
            const unsub = `${W}/unsubscribe/${unsubToken}`;
            const text = `Your vault is being watched by ${cfg.name}.

Vault:          ${vault.vaultAddress}
Backup wallet:  ${vault.rescueAddress}

From now on, the moment a withdrawal starts you get an email with a button. If the withdrawal was not you, the button moves everything in the vault to your backup wallet before the waiting time ends.

Lost the device with your vault on it? Ask for a rescue link at ${cfg.siteUrl} ("Lost access"); it comes to this address.

Keep your backup wallet's recovery words safe. A rescue only helps if you can open that wallet.

Stop these emails: ${unsub}`;
            return send({ to, subject: 'Your Kaspa vault is being watched', text, htmlBody: html('Your vault is being watched', p(`The moment a withdrawal starts you get an email with a button. If it was not you, the button moves everything to your backup wallet before the waiting time ends.`) +
                p('<b>Backup wallet</b>') + mono(vault.rescueAddress) + p(`Lost the device with your vault on it? Ask for a rescue link at ${esc(cfg.siteUrl)} ("Lost access").`) +
                p('Keep your backup wallet\'s recovery words safe. A rescue only helps if you can open that wallet.') + p(`<a href="${esc(unsub)}" style="color:#64748b">Stop these emails</a>`), cfg) });
        },
        alert({ to, vault, amount, arrives, token }) {
            const link = `${W}/rescue/${token}`;
            const text = `A withdrawal of ${K.kasStr(amount)} KAS started from your vault.

It reaches the vault's wallet ${when(arrives)}.

If this was you, do nothing.

If it was NOT you, open this link and press the button. Everything in the vault, including this withdrawal, goes to your backup wallet:
${link}

Backup wallet: ${vault.rescueAddress}
Vault:         ${vault.vaultAddress}`;
            return send({ to, subject: `Withdrawal started: ${K.kasStr(amount)} KAS from your vault`, text, htmlBody: html(`A withdrawal of ${K.kasStr(amount)} KAS started`,
                p(`It reaches the vault's wallet <b>${esc(when(arrives))}</b>.`) + p('<b>If this was you, do nothing.</b>') +
                p('If it was <b>not</b> you, press the button. Everything in the vault, including this withdrawal, goes to your backup wallet:') + mono(vault.rescueAddress) +
                button(link, 'This was not me', '#b91c1c'), cfg) });
        },
        rescueLink({ to, vault, token }) {
            const link = `${W}/rescue/${token}`;
            const text = `You asked for a rescue link for your vault ${vault.vaultAddress}.

The link moves everything in the vault to your backup wallet ${vault.rescueAddress}. Use it if you lost the device that holds the vault, or think someone else has it.

${link}

It works for 24 hours. If you did not ask for it, ignore this email; nothing moves unless the button on that page is pressed.`;
            return send({ to, subject: 'Your vault rescue link', text, htmlBody: html('Your vault rescue link', p('This link moves everything in the vault to your backup wallet. Use it if you lost the device that holds the vault, or think someone else has it.') +
                mono(vault.rescueAddress) + button(link, 'Open the rescue page', '#b91c1c') + p('It works for 24 hours. If you did not ask for it, ignore this email; nothing moves unless the button on that page is pressed.'), cfg) });
        },
        moved({ to, vault, amount, txids, remaining }) {
            const text = `${K.kasStr(amount)} KAS ${remaining ? 'is on its way' : 'went'} to your backup wallet ${vault.rescueAddress}.

${txids.map(t => `https://explorer.kaspa.org/txs/${t}`).join('\n')}
${remaining ? `\n${remaining} coin(s) could not be moved yet. The watcher keeps trying and emails you again when they are moved.\n` : ''}
Next: open your backup wallet to see the money. If someone else started that withdrawal, they have your vault's key: do not put money back into this vault; set up a new one.`;
            return send({ to, subject: remaining ? 'Rescue started: moving your vault to your backup wallet' : 'Done: your vault is in your backup wallet', text, htmlBody: html(remaining ? 'Rescue started' : 'Done: your money is in your backup wallet',
                p(`<b>${esc(K.kasStr(amount))} KAS</b> ${remaining ? 'is on its way' : 'went'} to your backup wallet:`) + mono(vault.rescueAddress) +
                p(txids.map(t => `<a href="https://explorer.kaspa.org/txs/${esc(t)}">${esc(t.slice(0, 16))}…</a>`).join('<br>')) +
                (remaining ? p(`${remaining} coin(s) could not be moved yet. The watcher keeps trying and emails you again when they are moved.`) : '') +
                p('If someone else started that withdrawal, they have your vault\'s key: do not put money back into this vault; set up a new one.'), cfg) });
        },
        released({ to, vault, amount, txid }) {
            const text = `${K.kasStr(amount)} KAS from your vault reached the vault's wallet (the waiting time is over).

https://explorer.kaspa.org/txs/${txid}`;
            return send({ to, subject: `Withdrawal complete: ${K.kasStr(amount)} KAS`, text, htmlBody: html('Withdrawal complete', p(`<b>${esc(K.kasStr(amount))} KAS</b> reached the vault's wallet. The waiting time is over.`) + p(`<a href="https://explorer.kaspa.org/txs/${esc(txid)}">${esc(txid.slice(0, 16))}…</a>`), cfg) });
        },
        unsubscribed({ to, vault }) {
            const text = `This address no longer gets emails about the vault ${vault.vaultAddress}. If that was a mistake, register it again from the vault page.`;
            return send({ to, subject: 'Vault emails stopped', text, htmlBody: html('Vault emails stopped', p(esc(text)), cfg) });
        },
        admin(subject, text) {
            if (!cfg.mail.admin) return Promise.resolve();
            return send({ to: cfg.mail.admin, subject: `[watcher ${cfg.name}] ${subject}`, text, htmlBody: html(subject, `<pre style="white-space:pre-wrap;font-size:13px">${esc(text)}</pre>`, cfg) }).catch(e => console.error('[watcher] admin email failed:', e.message));
        }
    };
}
