#!/usr/bin/env node
// test/compiler-equality.js - the phase 0 gate. The templates must produce exactly what silverc
// produces, for any keys and any delay, or nothing else in this package can be trusted.
//
//   1. Fixed vectors: Kasla's pinned self-check addresses (production, mainnet).
//   2. Raw delay encoding: every boundary of the script-number encoding, template vs silverc.
//   3. Random pairs: N random key sets with real secp256k1 keys and random delays, the full
//      Airlock -> Vault chain, compared as script bytes AND as .ksm manifests.
//
// Needs silverc (./silverc, --silverc or SILVERC_PATH). Usage: node test/compiler-equality.js [N]

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ksm = require('kaspa-ksm');
const tpl = require('../core/template');
const contracts = require('../core/contracts');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const SILVERC = opt('--silverc') || process.env.SILVERC_PATH || path.join(ROOT, 'silverc');
const N = parseInt(argv.find(a => /^\d+$/.test(a)) || '300', 10);
const T = contracts.templates.contracts;

let pass = 0, fail = 0;
function ok(cond, what) { if (cond) pass++; else { fail++; console.error('FAIL ' + what); } }

function compileRaw(id, values) {
    const t = T[id];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kv-eq-'));
    try {
        const args = t.params.map(p => ksm.args.toSilvercValue(p.type, String(values[p.name]), p.name));
        fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify(args));
        execFileSync(SILVERC, [path.join(ROOT, 'contracts', t.file), '--constructor-args', path.join(dir, 'a.json'), '-o', path.join(dir, 'o.json')], { stdio: ['ignore', 'ignore', 'pipe'] });
        return fs.readFileSync(path.join(dir, 'o.json'), 'utf8');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function compileManifest(id, values, network) {
    const t = T[id];
    const art = compileRaw(id, values);
    return ksm.fromSilvercArtifact(art, {
        network, source: t.source, constructorArgs: t.params.map(p => ({ name: p.name, type: p.type, value: String(values[p.name]) })),
        compiler: { commit: contracts.templates.compiler.commit, via: 'kaspa-vault template' }
    });
}
function scriptOf(art) { return Buffer.from(Object.values(JSON.parse(art).contracts)[0].compiled.bytecode).toString('hex'); }
// templateHash is a Blake3 informational field silverc adds; the browser build leaves it out
function comparable(m) { const c = JSON.parse(JSON.stringify(m)); if (c.compiler) delete c.compiler.templateHash; return JSON.stringify(c); }

// a real secp256k1 key: x coordinate of a random point
function randKey() {
    const e = crypto.createECDH('secp256k1');
    e.generateKeys();
    return e.getPublicKey('hex', 'compressed').slice(2);
}

// ---- 1. pinned vectors ----
const TEST = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const a0 = tpl.fill(T.airlock_v2, { hot: TEST, guardian: TEST, rescue: TEST, delay: '864000' });
ok(ksm.p2shAddress('mainnet', Buffer.from(a0, 'hex')) === 'kaspa:pplm538r3q2wp256xz3m3d3lfqdanjeehyz6uznpp0pcdy8cfdq5yshx50edy', 'pinned airlock address');
const v0 = tpl.fill(T.vault_v1, { hot: TEST, guardian: TEST, rescue: TEST, airlockHash: TEST });
ok(ksm.p2shAddress('mainnet', Buffer.from(v0, 'hex')) === 'kaspa:pz4zftmnyn57hphenrcxuw4szqfjt7lqk5t6em6q4xnz5kwcgqrv7lcptm5x4', 'pinned vault address');
console.log(`pinned vectors: ${fail ? 'FAILED' : 'match Kasla production'}`);

// ---- 2. delay encoding boundaries ----
const DELAYS = ['0', '1', '2', '15', '16', '17', '100', '127', '128', '129', '255', '256', '3000', '32767', '32768', '65535', '65536',
    '864000', '1728000', '2592000', '8388607', '8388608', '25920000', '2147483647', '2147483648', '4294967295'];
const [h1, g1, r1] = [randKey(), randKey(), randKey()];
let enc = 0;
for (const d of DELAYS) {
    let silver;
    try { silver = scriptOf(compileRaw('airlock_v2', { hot: h1, guardian: g1, rescue: r1, delay: d })); }
    catch (e) { console.log(`  delay ${d}: silverc refuses (${String(e.stderr || e.message).split('\n')[0].slice(0, 80)})`); continue; }
    const mine = tpl.fill(T.airlock_v2, { hot: h1, guardian: g1, rescue: r1, delay: d });
    ok(mine === silver, `delay ${d}: template ${mine.length / 2} bytes vs silverc ${silver.length / 2}`);
    enc++;
}
console.log(`delay encodings: ${enc} boundary values compared`);

// ---- 3. random full pairs ----
const nets = ['mainnet', 'testnet-10'];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
    const hot = randKey(), guardian = randKey(), rescue = randKey();
    const delay = String(i % 5 === 0 ? 864000 : 100 + crypto.randomInt(0, 25920000 - 100));
    const network = nets[i % nets.length];
    const built = contracts.buildVault({ hot, guardian, rescue, delayDaa: delay, network });
    const am = compileManifest('airlock_v2', { hot, guardian, rescue, delay }, network);
    const vm = compileManifest('vault_v1', { hot, guardian, rescue, airlockHash: am.script.hash }, network);
    ok(built.airlock.script.hex === am.script.hex, `#${i} airlock bytes`);
    ok(built.vault.script.hex === vm.script.hex, `#${i} vault bytes`);
    ok(built.airlock.address === am.address && built.vault.address === vm.address, `#${i} addresses`);
    ok(comparable(built.airlock) === comparable(am), `#${i} airlock manifest`);
    ok(comparable(built.vault) === comparable(vm), `#${i} vault manifest`);
    if (fail && fail >= 5) break;
    if ((i + 1) % 50 === 0) process.stdout.write(`  ${i + 1}/${N} pairs, ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
}

// ---- 4. the builder refuses bad input ----
const refuses = (f, what) => { try { f(); ok(false, `should refuse: ${what}`); } catch (e) { ok(true, what); } };
const k = randKey();
refuses(() => contracts.buildVault({ hot: k, guardian: k, rescue: randKey(), delayDaa: '864000' }), 'hot equals guardian');
refuses(() => contracts.buildVault({ hot: randKey(), guardian: randKey(), rescue: randKey(), delayDaa: '99' }), 'delay below floor');
refuses(() => contracts.buildVault({ hot: randKey(), guardian: randKey(), rescue: randKey(), delayDaa: '-5' }), 'negative delay');
refuses(() => contracts.buildVault({ hot: randKey().slice(2), guardian: randKey(), rescue: randKey(), delayDaa: '864000' }), 'short key');
refuses(() => contracts.buildVault({ hot: randKey(), guardian: randKey(), rescue: 'kaspa:pz4zftmnyn57hphenrcxuw4szqfjt7lqk5t6em6q4xnz5kwcgqrv7lcptm5x4', delayDaa: '864000' }), 'P2SH address as backup wallet');
refuses(() => tpl.fill(T.airlock_v2, { hot: k, guardian: k, rescue: k, delay: '1', extra: 'x' }), 'unknown parameter');

console.log(`\n${fail ? 'FAILED' : 'PASSED'}: ${pass} checks passed, ${fail} failed (${N} random pairs)`);
process.exit(fail ? 1 : 0);
