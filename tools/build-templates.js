#!/usr/bin/env node
// tools/build-templates.js - turn the two contracts into byte templates the browser can fill in.
//
// Dev-time only: needs silverc (SILVERC_PATH or ./silverc) and kaspa-ksm. Run it when a .sil file
// changes; it rewrites contracts/templates.json, which is what the runtime ships.
//
// How a template is found:
//   1. Compile the contract with a probe value for every parameter, each one chosen so its
//      encoded push is unique and cannot occur by chance (random 32-byte keys; for an int, a
//      3-byte number with no small-number shortcut).
//   2. Cut the script at every occurrence of each probe push. What is left are fixed segments.
//   3. Rebuild the probe script from the segments and require byte equality.
//   4. Compile again with a second, independent set of values and require that the template
//      reproduces that script too. Only then is the template written.
//
// test/compiler-equality.js then checks hundreds of random sets against silverc.
//
// Usage: node tools/build-templates.js [--silverc /path/to/silverc]

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ksm = require('kaspa-ksm');
const tpl = require('../core/template');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'contracts', 'templates.json');
const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const SILVERC = opt('--silverc') || process.env.SILVERC_PATH || path.join(ROOT, 'silverc');

// The contracts, in build order (the vault needs the airlock's hash, so the airlock comes first).
// `kind` decides the encoder: pubkey and byte[32] are a 32-byte push, int a minimal script number.
const CONTRACTS = [
    {
        id: 'airlock_v2', file: 'airlock_v2.sil',
        params: [
            { name: 'hot', type: 'pubkey' }, { name: 'guardian', type: 'pubkey' },
            { name: 'rescue', type: 'pubkey' }, { name: 'delay', type: 'int' }
        ]
    },
    {
        id: 'vault_v1', file: 'vault_v1.sil',
        params: [
            { name: 'hot', type: 'pubkey' }, { name: 'guardian', type: 'pubkey' },
            { name: 'rescue', type: 'pubkey' }, { name: 'airlockHash', type: 'byte[32]' }
        ]
    }
];

function die(m) { console.error('build-templates: ' + m); process.exit(1); }
if (!fs.existsSync(SILVERC)) die(`silverc not found at ${SILVERC} (pass --silverc or set SILVERC_PATH)`);

/** Compile with real values; returns { artifact, contract, scriptHex }. */
function compile(c, values) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kv-tpl-'));
    try {
        const args = c.params.map(p => ksm.args.toSilvercValue(p.type, String(values[p.name]), p.name));
        fs.writeFileSync(path.join(dir, 'args.json'), JSON.stringify(args));
        execFileSync(SILVERC, [path.join(ROOT, 'contracts', c.file), '--constructor-args', path.join(dir, 'args.json'), '-o', path.join(dir, 'out.json')], { stdio: ['ignore', 'ignore', 'pipe'] });
        const artifact = JSON.parse(fs.readFileSync(path.join(dir, 'out.json'), 'utf8'));
        const contract = Object.values(artifact.contracts)[0];
        return { artifact, contract, scriptHex: Buffer.from(contract.compiled.bytecode).toString('hex') };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const rand32 = () => crypto.randomBytes(32).toString('hex');
// A 3-byte positive number whose top byte is below 0x80 (no sign byte) and whose bytes are random,
// so the push 03xxxxxx is effectively unique in the script.
function probeInt() {
    for (;;) {
        const n = 0x100000 + crypto.randomInt(0, 0x700000);
        const enc = tpl.encodeParam('int', String(n));
        if (enc.length === 8) return String(n);
    }
}
function probeValues(c) {
    const v = {};
    for (const p of c.params) v[p.name] = p.type === 'int' ? probeInt() : rand32();
    return v;
}

/** Cut `scriptHex` at every encoded probe value; returns the segment list. */
function cut(c, scriptHex, values) {
    const marks = [];
    for (const p of c.params) {
        const enc = tpl.encodeParam(p.type, values[p.name]);
        let from = 0, n = 0;
        for (;;) {
            const i = scriptHex.indexOf(enc, from);
            if (i < 0) break;
            if (i % 2 !== 0) { from = i + 1; continue; }        // not on a byte boundary
            marks.push({ at: i, len: enc.length, param: p.name });
            from = i + enc.length; n++;
        }
        if (!n) die(`${c.id}: parameter "${p.name}" not found in the script (encoding ${p.type} assumed wrong)`);
    }
    marks.sort((a, b) => a.at - b.at);
    for (let k = 1; k < marks.length; k++) if (marks[k].at < marks[k - 1].at + marks[k - 1].len) die(`${c.id}: parameter slots overlap`);
    const segments = [];
    let pos = 0;
    for (const m of marks) {
        if (m.at > pos) segments.push({ hex: scriptHex.slice(pos, m.at) });
        segments.push({ param: m.param });
        pos = m.at + m.len;
    }
    if (pos < scriptHex.length) segments.push({ hex: scriptHex.slice(pos) });
    return segments;
}

function entriesOf(contract) {
    return Object.entries(contract.entries).map(([k, e]) => ({
        name: e.name || k,
        dispatchTag: Array.isArray(e.dispatch_tag) ? Buffer.from(e.dispatch_tag).toString('hex') : (e.dispatch_tag ? String(e.dispatch_tag).toLowerCase() : null),
        params: (e.params || []).map(p => ({ name: p.name, type: ksm.args.typeFromArtifact(p.type) }))
    }));
}

function main() {
    const out = {
        format: 'kaspa-vault-templates/1',
        compiler: { name: 'silverc', commit: '3ed9733' },
        note: 'Generated by tools/build-templates.js from the .sil files beside this file. Do not edit by hand.',
        contracts: {}
    };
    for (const c of CONTRACTS) {
        const source = fs.readFileSync(path.join(ROOT, 'contracts', c.file), 'utf8');
        const probe = probeValues(c);
        const first = compile(c, probe);
        const segments = cut(c, first.scriptHex, probe);
        const t = {
            id: c.id, file: c.file, contractName: Object.keys(first.artifact.contracts)[0] || first.contract.name,
            params: c.params, segments, entries: entriesOf(first.contract),
            sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), source,
            compilerVersion: first.artifact.compiler_version != null ? String(first.artifact.compiler_version) : null,
            abiSchema: first.artifact.schema_version != null ? first.artifact.schema_version : null
        };
        const again = tpl.fill(t, probe);
        if (again !== first.scriptHex) die(`${c.id}: the template does not rebuild its own probe script`);
        const second = probeValues(c);
        const check = compile(c, second);
        if (tpl.fill(t, second) !== check.scriptHex) die(`${c.id}: the template does not reproduce a second, independent compile`);
        // the tags in the second compile must be the same (they hash the entry signature, not the values)
        const tags1 = JSON.stringify(t.entries.map(e => e.dispatchTag)), tags2 = JSON.stringify(entriesOf(check.contract).map(e => e.dispatchTag));
        if (tags1 !== tags2) die(`${c.id}: dispatch tags changed with the values`);
        out.compiler.version = t.compilerVersion;
        out.contracts[c.id] = t;
        const slots = segments.filter(s => s.param).map(s => s.param);
        console.log(`${c.id}: ${first.scriptHex.length / 2} bytes, ${segments.length} segments, slots ${slots.join(', ')}; tags ${t.entries.map(e => `${e.name}:${e.dispatchTag}`).join(' ')}`);
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

main();
