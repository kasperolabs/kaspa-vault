// test/widget-e2e.js - the widget in a real browser against the dev world (no money anywhere).
//
//   node test/widget-e2e.js [--shots dir] [--headed]
//
// Starts test/dev-world.js and tools/serve.js, then drives demo/index.html with Playwright: open a
// vault, prove a (stub) Kasware backup wallet, register and confirm alerts, fund, deposit, withdraw,
// automatic release, rescue through "Didn't start this?", send, reload and unlock, remove, restore.
import { spawn } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import * as K from '../core/kaspa.js';
import * as W from '../core/wallet.js';
import { buildVault } from '../core/contracts.js';
import { makeCard } from '../core/card.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const argv = process.argv.slice(2);
const SHOTS = argv.includes('--shots') ? argv[argv.indexOf('--shots') + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const CTL = 'http://127.0.0.1:7398';

let pass = 0, failed = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { failed++; console.log('FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const procs = [];
function start(cmd, args, ready) {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, { cwd: path.resolve(import.meta.dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] });
        procs.push(p);
        let out = '';
        const t = setTimeout(() => reject(new Error(`${args.join(' ')} did not start: ${out}`)), 20000);
        const on = d => { out += d; if (out.includes(ready)) { clearTimeout(t); resolve(p); } };
        p.stdout.on('data', on); p.stderr.on('data', on);
    });
}
const ctl = async (p, body) => (await fetch(CTL + p, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})).json();
const mails = () => ctl('/mail');
const linkIn = (m, kind) => (m.text.match(new RegExp(`https?://\\S+/${kind}/[0-9a-f]{48}`)) || [])[0];

// the stub Kasware: a real key in this process signs, the page only sees the extension API
const backup = W.walletFromWords(W.newWords());

let browser;
try {
    await start('node', ['test/dev-world.js', '--delay', '3000'], 'dev world up');
    await start('node', ['tools/serve.js', '8080'], 'serving');
    browser = await chromium.launch({ headless: !argv.includes('--headed') });
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.exposeFunction('__kvSign', msg => K.signMessage(msg, backup.privateKey));
    await page.exposeFunction('__kvFund', async (to, sompi) => { await ctl('/fund', { address: to, kas: K.kasStr(BigInt(sompi)) }); return 'f'.repeat(64); });
    await page.addInitScript(({ address, pub }) => {
        window.kasware = {
            requestAccounts: async () => [address], getPublicKey: async () => '02' + pub,
            signMessage: async m => window.__kvSign(m),
            sendKaspa: async (to, sompi) => window.__kvFund(to, String(sompi))
        };
    }, { address: backup.address, pub: backup.publicKey });

    const kv = s => page.locator(`kaspa-vault ${s}`);
    const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }); };
    const click = async (text, sel = 'button') => { await kv(sel).filter({ hasText: text }).first().click(); };
    const text = async () => (await kv('.kv').innerText());
    const until = async (fn, what, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(400); } ok(false, `timed out: ${what}`); return false; };

    // ---------- welcome ----------
    await page.goto('http://127.0.0.1:8080/demo/');
    await kv('.kv-btn').filter({ hasText: 'Open a vault' }).waitFor();
    ok((await text()).includes('safe deposit box'), 'welcome page shows');
    await shot('01-welcome');

    // ---------- step 1: the wallet ----------
    await click('Open a vault');
    await kv('[name=pw1]').fill('correct horse 1');
    await kv('[name=pw2]').fill('correct horse 2');
    await click("Make my vault's wallet");
    ok((await kv('[data-err]').first().innerText()).includes('not the same'), 'different passwords are refused');
    await kv('[name=pw2]').fill('correct horse 1');
    await click("Make my vault's wallet");
    const words = (await kv('.kv-words span').allInnerTexts()).join(' ');
    ok(words.split(' ').length === 12 && W.wordsOk(words), 'twelve valid recovery words are shown');
    await shot('02-words');
    ok(await kv('button').filter({ hasText: 'Next' }).isDisabled(), 'Next waits for the "I wrote them down" box');
    await kv('[name=wrote]').check();
    await click('Next');
    const labels = await kv('.kv-quiz .kv-label').allInnerTexts();
    const idx = labels.map(l => Number(l.replace(/\D/g, '')) - 1);
    const ws = words.split(' ');
    await kv('[name=q1]').fill(ws[(idx[0] + 1) % 12]);
    await kv('[name=q2]').fill(ws[idx[1]]);
    await click('Check');
    ok((await text()).includes('not the right words'), 'a wrong quiz word is refused');
    await kv('[name=q1]').fill(ws[idx[0]].toUpperCase());
    await click('Check');

    // ---------- step 2: backup wallet ----------
    await kv('.kv-wallet').filter({ hasText: 'Kasware' }).waitFor();
    ok(await kv('.kv-wallet').filter({ hasText: 'Kastle' }).isDisabled(), 'wallets that are not installed cannot be picked');
    await shot('03-backup');
    await kv('.kv-wallet').filter({ hasText: 'Kasware' }).click();
    await kv('.kv-ok').filter({ hasText: 'confirmed by Kasware' }).waitFor();
    ok((await text()).includes(backup.address), 'the Kasware signature proves the backup address');
    await click('Use this wallet');

    // ---------- step 3: waiting time ----------
    const tiles = await kv('.kv-tile').allInnerTexts();
    ok(tiles[0].includes('Test: 5 minutes') && tiles.some(t => t.includes('1 day')) && tiles.some(t => t.includes('7 days')), 'waiting times offered: the test watcher minimum plus 1/3/7 days');
    await kv('.kv-tile').first().click();
    await click('Next');

    // ---------- step 4: email, open ----------
    await kv('[name=email]').fill('owner@example.com');
    await kv('[name=final]').check();
    await shot('04-email');
    await click('Open my vault');
    await kv('.kv-balance').waitFor({ timeout: 30000 });
    ok((await text()).includes('Confirm your email'), 'the vault opens and asks to confirm the email');
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('kaspa-vault-devworld')));
    ok(rec.card.addresses.rescue === backup.address && rec.card.delayDaa === '3000', 'the saved card names the backup wallet and the waiting time');
    ok(rec.card.addresses.hot === W.walletFromWords(words).address, "the spending wallet is the recovery words' first address (Kasware-compatible)");
    ok(!JSON.stringify(rec).includes(ws[0] + ' ' + ws[1]), 'the words are not stored in the clear');
    await shot('05-account-unconfirmed');
    let m = await mails();
    const confirm = linkIn(m.find(x => x.to === 'owner@example.com' && /onfirm/.test(x.subject)) || { text: '' }, 'confirm');
    ok(!!confirm, 'the watcher emailed a confirmation link');
    await fetch(confirm, { method: 'POST' });
    await page.evaluate(() => document.querySelector('kaspa-vault').refresh());
    await until(async () => (await text()).includes('Protected'), 'protected after confirming');
    ok((await text()).includes('Protected'), 'after the email link the vault shows Protected');

    // ---------- fund through "Send from Kasware" ----------
    await click('Receive');
    ok((await kv('.kv-qr-box svg').count()) === 1, 'Receive shows a QR code');
    await kv('[name=ksAmount]').fill('10');
    await shot('06-receive');
    await click('Send from Kasware');
    await until(async () => (await kv('.kv-spend-amt').innerText()).startsWith('10.00'), 'spending wallet funded');
    ok((await kv('.kv-spend-amt').innerText()).startsWith('10.00'), 'Kasware funded the spending wallet: 10 KAS');

    // ---------- the vault card must be saved before money goes in ----------
    ok(await kv('button').filter({ hasText: 'Add money' }).isDisabled() && (await text()).includes('Save your backup'), 'Add money waits until the backup is saved');
    const dl = page.waitForEvent('download');
    await kv('.kv-banner button').filter({ hasText: 'Download backup file' }).click();
    const backupFile = JSON.parse(fs.readFileSync(await (await dl).path(), 'utf8'));
    ok(backupFile.card.addresses.vault === rec.card.addresses.vault && backupFile.words === words, 'the backup file holds this vault card and the 12 words');
    ok(!(await kv('button').filter({ hasText: 'Add money' }).isDisabled()), 'after saving it, Add money is open');

    // ---------- deposit (a double click sends one transaction) ----------
    const before = (await ctl('/ledger')).length;
    await click('Add money');
    ok((await kv('.kv-tab').allInnerTexts()).join('|') === 'From Kasware|Any wallet or exchange|From spending wallet', 'Add money offers Kasware, any wallet (vault address), and the spending wallet');
    await click('Any wallet or exchange', '.kv-tab');
    ok((await kv('.kv-sheet').innerText()).includes(rec.card.addresses.vault) && (await kv('.kv-sheet .kv-qr-box svg').count()) === 1, 'any wallet: the vault address with a QR code');
    await click('From spending wallet', '.kv-tab');
    await kv('[name=amount]').fill('9.8');
    await kv('button').filter({ hasText: 'Add to vault' }).click();
    await until(async () => (await kv('[data-err]').innerText()).includes('0.5 KAS'), 'small change explained');
    ok((await kv('[data-err]').innerText()).includes('All of it'), 'an amount that leaves dust behind is explained, with the way out');
    await click('All of it');
    await shot('07-add');
    await kv('button').filter({ hasText: 'Add to vault' }).dblclick();
    await kv('.kv-sheet h3').filter({ hasText: 'into your vault' }).waitFor();
    await until(async () => (await kv('.kv-pstep-done').count()) === 3, 'deposit confirmed');
    await shot('08-deposit-done');
    ok((await ctl('/ledger')).length === before + 1, 'a double click on Add to vault sent exactly one transaction');
    await click('Done');
    await until(async () => (await kv('.kv-amt').innerText()).startsWith('9.99'), 'vault balance');
    ok((await kv('.kv-amt').innerText()).startsWith('9.99'), `deposit landed: vault shows ${(await kv('.kv-amt').innerText()).replace(/\s+/g, ' ')}`);
    await shot('09-account');

    // ---------- withdraw, automatic release ----------
    await click('Take money out');
    await click('Start taking out');
    await kv('.kv-sheet h3').filter({ hasText: 'on its way out' }).waitFor();
    await click('Done');
    await until(async () => (await text()).includes('on its way to your spending wallet'), 'withdrawal strip');
    await ctl('/advance', { daa: 10 });
    await until(async () => (await mails()).some(x => /started/i.test(x.subject)), 'alert email');
    ok((await mails()).some(x => /started/i.test(x.subject) && x.to === 'owner@example.com'), 'the watcher emailed "withdrawal started"');
    await shot('10-pending');
    await ctl('/advance', { daa: 3100 });
    await page.evaluate(() => document.querySelector('kaspa-vault').refresh());
    await until(async () => (await kv('.kv-spend-amt').innerText()).startsWith('9.9'), 'released to spending', 40000);
    ok(!(await text()).includes('on its way') && (await kv('.kv-spend-amt').innerText()).startsWith('9.9'), 'after the waiting time it landed in the spending wallet');

    // ---------- deposit again, then "Didn't start this?" ----------
    await click('Add money'); await click('From spending wallet', '.kv-tab'); await click('All of it'); await click('Add to vault');
    await until(async () => (await kv('.kv-pstep-done').count()) === 3, 'second deposit'); await click('Done');
    await until(async () => (await kv('.kv-amt').innerText()).startsWith('9.9'), 'second deposit in vault');
    await click('Take money out'); await click('Start taking out'); await click('Done');
    await until(async () => (await text()).includes("Didn't start this?"), 'strip with not-me');
    await click("Didn't start this?", 'button');
    await shot('11-notme');
    await click('Email me the rescue button');
    await kv('.kv-ok').filter({ hasText: 'Sent' }).waitFor();
    m = await mails();
    const rescue = linkIn(m.filter(x => x.to === 'owner@example.com').reverse().find(x => /rescue/.test(x.text)) || { text: '' }, 'rescue');
    ok(!!rescue, 'a rescue link arrived by email');
    await fetch(rescue, { method: 'POST' });
    const bal = await ctl('/balance/' + backup.address);
    ok(Number(bal.kas) > 9.9, `the rescue moved ${bal.kas} KAS to the backup wallet`);
    await click('Close');
    await page.evaluate(() => document.querySelector('kaspa-vault').refresh());
    await until(async () => (await kv('.kv-amt').innerText()).startsWith('0.00') && !(await text()).includes('on its way'), 'vault empty after rescue');
    ok((await kv('.kv-amt').innerText()).startsWith('0.00'), 'vault and waiting are empty after the rescue');

    // ---------- straight from Kasware into the vault ----------
    await click('Add money');
    await kv('[name=ksAmount]').fill('3');
    await click('Send from Kasware');
    await until(async () => (await kv('.kv-amt').innerText()).startsWith('3.00'), 'direct deposit');
    ok((await kv('.kv-amt').innerText()).startsWith('3.00') && (await kv('.kv-spend-amt').innerText()).startsWith('0.00'), 'Kasware sends straight into the vault, the spending wallet is not involved');

    // ---------- send ----------
    await ctl('/fund', { address: rec.card.addresses.hot, kas: '5' });
    await page.evaluate(() => document.querySelector('kaspa-vault').refresh());
    await until(async () => (await kv('.kv-spend-amt').innerText()).startsWith('5.00'), 'funded 5');
    const dest = W.walletFromWords(W.newWords()).address;
    await click('Send');
    await kv('[name=to]').fill(dest);
    await kv('[name=amount]').fill('2');
    ok(await kv('.kv-sheet [name=password]').count() === 1, 'Send always asks for the password, even right after unlocking');
    await kv('[name=password]').fill('correct horse 1');
    await click('Send', '.kv-sheet button');
    await kv('.kv-sheet h3').filter({ hasText: 'sent' }).waitFor();
    await click('Done');
    ok((await ctl('/balance/' + dest)).kas === '2.00000000', 'Send delivered exactly 2 KAS');

    // ---------- reload: locked; password needed ----------
    await page.reload();
    await kv('.kv-balance').waitFor();
    ok(!(await text()).includes('Lock'), 'after a reload the key is locked');
    await click('Recovery words');
    await kv('[name=password]').fill('wrong password');
    await click('Show');
    await until(async () => (await kv('[data-err]').innerText()) !== '', 'password checked (PBKDF2 takes a moment)');
    ok((await kv('[data-err]').innerText()).includes('does not open'), 'a wrong password is refused');
    await kv('[name=password]').fill('correct horse 1');
    await click('Show');
    await kv('.kv-sheet .kv-words').waitFor();
    ok((await kv('.kv-sheet .kv-words span').allInnerTexts()).join(' ') === words, 'the right password shows the same 12 words');
    await click('Hide');

    // ---------- check my vault ----------
    await click('Check my vault');
    const chk = await kv('.kv-sheet').innerText();
    ok(chk.includes(rec.card.addresses.vault) && chk.includes('answers with this key'), 'Check my vault rebuilds the addresses and matches the live watcher key');
    await shot('12-check');
    await click('Close');

    // ---------- remove, restore ----------
    await click('Remove from this browser');
    await kv('[name=confirm]').fill('REMOVE');
    await click('Remove from this browser', '.kv-sheet button');
    await kv('.kv-btn').filter({ hasText: 'Open a vault' }).waitFor();
    ok(await page.evaluate(() => localStorage.getItem('kaspa-vault-devworld') === null), 'remove clears this browser');
    await click('I already have a vault', 'button');
    const cardPath = path.join(process.env.TMPDIR || '/tmp', 'kv-e2e-card.json');
    fs.writeFileSync(cardPath, JSON.stringify(rec.card));
    // a forged card: the user's own spending key (public), someone else's watcher key and backup wallet
    const thief = W.walletFromWords(W.newWords()), thiefGuard = W.walletFromWords(W.newWords());
    const forged = makeCard({ ...buildVault({ hot: rec.card.keys.hot, guardian: thiefGuard.publicKey, rescue: thief.publicKey, delayDaa: '3000', network: 'mainnet' }), watcher: { url: 'https://evil.example' } });
    const forgedPath = path.join(process.env.TMPDIR || '/tmp', 'kv-e2e-forged.json');
    fs.writeFileSync(forgedPath, JSON.stringify(forged));
    await kv('[name=cardFile]').setInputFiles(forgedPath);
    await kv('.kv-kv').waitFor();
    ok((await text()).includes(thief.address), "restore shows the card's backup wallet in full before anything else");
    await kv('[name=backupMine]').check();
    await kv('[name=words]').fill(words);
    await kv('[name=pw1]').fill('another pass'); await kv('[name=pw2]').fill('another pass');
    await click('Open my vault');
    await until(async () => (await text()).includes('guarded by another watcher'), 'forged card refused');
    ok(await page.evaluate(() => localStorage.getItem('kaspa-vault-devworld') === null), 'a card naming another watcher key is refused, even with the right words');
    await kv('[name=cardFile]').setInputFiles(cardPath);
    await until(async () => (await text()).includes(backup.address), 'real card read');
    await kv('[name=backupMine]').check();
    await kv('[name=words]').fill(W.newWords());
    await kv('[name=pw1]').fill('another pass'); await kv('[name=pw2]').fill('another pass');
    await click('Open my vault');
    ok((await text()).includes("don't open this vault"), "someone else's words do not open the vault");
    const backupPath = path.join(process.env.TMPDIR || '/tmp', 'kv-e2e-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupFile));
    await kv('[name=cardFile]').setInputFiles(backupPath);
    await until(async () => (await kv('[name=words]').inputValue()) === words, 'backup file fills the words');
    ok((await kv('[name=words]').inputValue()) === words, 'the backup file fills in the words by itself');
    await kv('[name=backupMine]').check();
    await click('Open my vault');
    await kv('.kv-balance').waitFor();
    const rec2 = await page.evaluate(() => JSON.parse(localStorage.getItem('kaspa-vault-devworld')));
    ok(rec2.card.addresses.vault === rec.card.addresses.vault, 'restore from the backup file opens the same vault');
    await shot('13-restored');

    // ---------- phone width ----------
    await page.setViewportSize({ width: 380, height: 900 });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(wide <= 380, `no sideways scroll on a phone (${wide}px)`);
    await shot('14-phone');

    ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} catch (e) {
    failed++; console.log('FAIL ' + (e.stack || e.message));
} finally {
    if (browser) await browser.close();
    for (const p of procs) p.kill();
}
console.log(failed ? `FAILED: ${pass} checks passed, ${failed} failed` : `PASSED: ${pass} checks passed, 0 failed`);
process.exit(failed ? 1 : 0);
