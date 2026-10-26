// test/site-smoke.js - the kaspavault.com pages under their own Content-Security-Policy, in Chromium,
// against the dev world (the watcher and Kaspa API hosts are swapped for the local ones).
//   node test/site-smoke.js [--shots dir]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import * as W from '../core/wallet.js';
import { buildVault } from '../core/contracts.js';
import { makeCard } from '../core/card.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '../site');
const argv = process.argv.slice(2);
const SHOTS = argv.includes('--shots') ? argv[argv.indexOf('--shots') + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, failed = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { failed++; console.log('FAIL ' + m); } };

const LIVE_W = 'https://watch.kaspavault.com', DEV_W = 'http://127.0.0.1:7399';
const csp = fs.readFileSync(path.join(root, '_headers'), 'utf8').match(/Content-Security-Policy: (.*)/)[1]
    .replace(LIVE_W, DEV_W).replace('https://api.kaspa.org', 'http://127.0.0.1:7400');
let guardian = null;
const swap = html => html.replaceAll(LIVE_W, DEV_W).replace(/guardian="[0-9a-f]{64}"/g, `guardian="${guardian}" node="ws://127.0.0.1:18210"`).replace(/data-guardian="[0-9a-f]{64}"/g, `data-guardian="${guardian}"`).replace(/data-key="[0-9a-f]{64}"/g, `data-key="${guardian}"`);
const server = http.createServer((q, r) => {
    let p = new URL(q.url, 'http://x').pathname;
    if (p === '/') p = '/index.html';
    if (!path.extname(p)) p += '.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { r.statusCode = 404; return r.end(); }
    r.setHeader('Content-Security-Policy', csp.replace("connect-src 'self'", "connect-src 'self' ws://127.0.0.1:18210"));
    r.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain');
    r.end(path.extname(f) === '.html' ? swap(fs.readFileSync(f, 'utf8')) : fs.readFileSync(f));
}).listen(8091);

const dw = spawn('node', ['test/dev-world.js'], { cwd: path.resolve(import.meta.dirname, '..') });
await new Promise(r => dw.stdout.on('data', d => String(d).includes('dev world up') && r()));
guardian = (await (await fetch(`${DEV_W}/v1/guardian`)).json()).pubkey;

const browser = await chromium.launch();
try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(e.message));
    const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `site-${n}.png`), fullPage: true }); };

    await page.goto('http://127.0.0.1:8091/');
    await page.locator('kaspa-vault .kv-ws-online').waitFor();
    ok(await page.locator('kaspa-vault button').filter({ hasText: 'Open a vault' }).isEnabled(), 'home: the vault, with the watcher light green and Open a vault on');
    ok((await page.locator('nav a').allInnerTexts()).join('|') === 'Vault|How it works|Verify|Run your own|GitHub', 'home: the menu');
    await shot('home');

    await page.goto('http://127.0.0.1:8091/how');
    ok((await page.locator('h1').innerText()) === 'How it works' && (await page.locator('details').count()) >= 7, 'how: the rule, the keys, the steps, the questions');
    await shot('how');

    await page.goto('http://127.0.0.1:8091/build');
    await page.locator('.light-online').waitFor({ timeout: 10000 });
    ok(await page.locator('.light-online').count() === 1, 'run your own: the watcher list shows the live light');
    ok((await page.locator('pre').first().innerText()).includes('guardian='), 'run your own: the embed snippet pins the guardian');
    await shot('build');

    await page.goto('http://127.0.0.1:8091/verify');
    await page.waitForFunction(() => /^[0-9a-f]{64}$/.test(document.querySelector('#served-hash').textContent));
    const sums = fs.readFileSync(path.resolve(import.meta.dirname, '../widget/dist/SHA256SUMS'), 'utf8');
    const served = await page.locator('#served-hash').innerText();
    ok(sums.includes(`${served}  kaspa-vault.min.js`), 'verify: the fingerprint of the served code equals the build output');

    // a real card (this watcher) and one naming another watcher
    const k = () => W.walletFromWords(W.newWords());
    const hot = k(), rescue = k(), other = k();
    const good = makeCard({ ...buildVault({ hot: hot.publicKey, guardian, rescue: rescue.publicKey, delayDaa: '864000' }), watcher: { url: DEV_W } });
    const odd = makeCard({ ...buildVault({ hot: hot.publicKey, guardian: other.publicKey, rescue: rescue.publicKey, delayDaa: '864000' }), watcher: { url: 'x' } });
    const tmp = process.env.TMPDIR || '/tmp';
    fs.writeFileSync(path.join(tmp, 'kv-good.json'), JSON.stringify({ format: 'kaspa-vault-backup/1', words: 'never read', card: good }));
    fs.writeFileSync(path.join(tmp, 'kv-odd.json'), JSON.stringify(odd));
    const tampered = JSON.parse(JSON.stringify(good)); tampered.addresses.rescue = other.address;
    fs.writeFileSync(path.join(tmp, 'kv-bad.json'), JSON.stringify(tampered));
    // the REST API is not in the dev world: balances say so, nothing else breaks
    await page.locator('#card-file').setInputFiles(path.join(tmp, 'kv-good.json'));
    await page.locator('#vault-result .good').first().waitFor();
    let res = await page.locator('#vault-result').innerText();
    ok(res.includes('This card adds up') && res.includes(rescue.address) && res.includes('watch.kaspavault.com'), "verify: a backup file's card is rebuilt, the backup wallet shown, the watcher recognized");
    await page.locator('#vault-result .light-online').waitFor({ timeout: 10000 });
    ok(true, 'verify: the vault\'s watcher shows its live status');
    await shot('verify');
    await page.locator('#card-file').setInputFiles(path.join(tmp, 'kv-odd.json'));
    await page.locator('#vault-result .warn').waitFor();
    ok((await page.locator('#vault-result').innerText()).includes('watcher this site does not know'), 'verify: a vault naming another watcher is flagged');
    await page.locator('#card-file').setInputFiles(path.join(tmp, 'kv-bad.json'));
    await page.locator('#vault-result .bad').waitFor();
    ok((await page.locator('#vault-result').innerText()).includes('does not add up'), 'verify: a card whose backup line was edited is refused');

    await page.locator('#lost-addr').fill(good.addresses.vault);
    await page.locator('#lost-email').fill('someone@example.com');
    await page.locator('#lost-go').click();
    await page.locator('#lost-result .good').waitFor();
    ok((await page.locator('#lost-result').innerText()).includes('If someone@example.com is confirmed'), 'verify: lost access asks the watcher, and the answer reveals nothing');

    await page.setViewportSize({ width: 380, height: 900 });
    for (const p of ['/', '/how', '/verify', '/build']) {
        await page.goto('http://127.0.0.1:8091' + p);
        await page.waitForTimeout(300);
        const w = await page.evaluate(() => document.documentElement.scrollWidth);
        ok(w <= 380, `phone width ${p}: no sideways scroll (${w}px)`);
    }
    await shot('phone-build');
    const real = errs.filter(e => !/7400|api\.kaspa\.org|ERR_CONNECTION_REFUSED|Failed to load resource/.test(e));
    ok(real.length === 0, `no page errors or CSP violations${real.length ? ': ' + real.join(' | ') : ''}`);
} catch (e) { failed++; console.log('FAIL ' + (e.stack || e.message)); }
finally { await browser.close(); dw.kill(); server.close(); }
console.log(failed ? `FAILED: ${pass} checks passed, ${failed} failed` : `PASSED: ${pass} checks passed, 0 failed`);
process.exit(failed ? 1 : 0);
