#!/usr/bin/env node
// test/spend.js - build and sign every vault transaction, check the local rules, and write
// test/engine/fixtures.json for the consensus check (test/engine/consensus.rs runs each one through
// rusty-kaspa's own transaction id, mass calculator and script engine).
//
// Usage: node test/spend.js

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as K from '../core/kaspa.js';
import * as S from '../core/spend.js';
import { buildVault, describe } from '../core/contracts.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (c, what) => { if (c) pass++; else { fail++; console.error('FAIL ' + what); } };
async function refuses(f, code, what) {
    try { await f(); ok(false, `should refuse: ${what}`); }
    catch (e) { ok(!code || e.code === code, `${what}: expected ${code}, got ${e.code} (${e.message})`); }
}

const keys = () => { const priv = K.randomPrivateKey(); return { priv, pub: K.xOnlyPublicKey(priv) }; };
const hot = keys(), guardian = keys(), rescue = keys(), thief = keys();
const NET = 'mainnet';
const DELAY = 864000n;
const { vault, airlock } = buildVault({ hot: hot.pub, guardian: guardian.pub, rescue: rescue.pub, delayDaa: DELAY.toString(), network: NET });
const info = describe({ vault, airlock });
const hotAddr = K.p2pkAddress(NET, hot.pub);

const randTxid = () => crypto.randomBytes(32).toString('hex');
const coin = (address, kas, daa = 1000n) => ({ address, txid: randTxid(), index: crypto.randomInt(0, 4), amount: K.kasToSompi(String(kas)), blockDaaScore: daa, spk: K.scriptPublicKey(address) });
const NOW = 5000000n;

const fixtures = [];
function record(name, signed, entries, expectValid) {
    fixtures.push({
        name, expectValid,
        txid: signed.txid,
        tx: {
            version: signed.tx.version,
            inputs: signed.tx.inputs.map(i => ({ txid: i.txid, index: i.index, sequence: i.sequence.toString(), sigOpCount: i.sigOpCount, signatureScript: i.signatureScript })),
            outputs: signed.tx.outputs.map(o => ({ value: o.value.toString(), spkVersion: o.spk.version, spk: K.bytesToHex(o.spk.script) })),
            lockTime: signed.tx.lockTime.toString()
        },
        entries: entries.map(e => ({ amount: e.amount.toString(), spkVersion: e.spk.version, spk: K.bytesToHex(e.spk.script), daa: e.blockDaaScore.toString() })),
        masses: (() => { const m = K.masses(signed.tx, entries); return { compute: m.compute.toString(), transient: m.transient.toString(), storage: m.storage.toString() }; })(),
        fee: signed.fee.toString()
    });
}

// ---- capacity inside MAX_FEE at the floor rate ----
const capOpen = S.capacity({ manifest: vault, entry: 'open', airlockAddress: info.airlockAddress });
const capMerge = S.capacity({ manifest: vault, entry: 'merge' });
const capEvac = S.capacity({ manifest: vault, entry: 'evacuate' });
const capRescue = S.capacity({ manifest: airlock, entry: 'rescue' });
console.log(`capacity at ${K.MIN_RELAY_FEE_PER_GRAM} sompi/gram: open ${capOpen}, merge ${capMerge}, evacuate ${capEvac}, rescue ${capRescue}, release 1`);
ok(capOpen >= 1 && capEvac >= 1 && capRescue >= 1, 'every path fits at least one coin');

// ---- deposit: hot wallet -> vault ----
const hotCoins = [coin(hotAddr, 250), coin(hotAddr, 40.5), coin(hotAddr, 3)];
const dep = S.payment({ coins: hotCoins, from: hotAddr, to: info.vaultAddress, amount: K.kasToSompi('100') });
const depSigned = await S.sign(dep, S.keySigner(hot.priv));
ok(depSigned.tx.outputs[0].value === K.kasToSompi('100'), 'deposit delivers the exact amount');
ok(depSigned.tx.outputs.length === 2, 'deposit returns change');
record('deposit 100 KAS with change', depSigned, dep.entries, true);

const depAll = S.payment({ coins: hotCoins, from: hotAddr, to: info.vaultAddress, all: true });
const depAllSigned = await S.sign(depAll, S.keySigner(hot.priv));
ok(depAllSigned.tx.outputs.length === 1 && depAllSigned.amountOut === K.kasToSompi('293.5') - depAll.fee, 'deposit everything sweeps all coins');
record('deposit everything', depAllSigned, depAll.entries, true);

await refuses(() => S.payment({ coins: hotCoins, from: hotAddr, to: info.vaultAddress, amount: K.kasToSompi('293.3') }), 'AMOUNT', 'deposit leaving dust change');
await refuses(() => S.sign(dep, S.keySigner(thief.priv)), 'SIGNER', 'deposit signed by the wrong key');

// ---- open: vault -> airlock ----
const vaultCoins = [coin(info.vaultAddress, 100), coin(info.vaultAddress, 40), coin(info.vaultAddress, 12.25)];
const open1 = S.covenantSpend({ manifest: vault, entry: 'open', coins: [vaultCoins[0]], daa: NOW, airlockAddress: info.airlockAddress });
const open1Signed = await S.sign(open1, { hotSig: S.keySigner(hot.priv) });
ok(open1Signed.destination === info.airlockAddress, 'open pays the airlock');
record('open one coin', open1Signed, open1.entries, true);

const openN = S.covenantSpend({ manifest: vault, entry: 'open', coins: vaultCoins.slice(0, Math.min(3, capOpen)), daa: NOW, airlockAddress: info.airlockAddress });
record(`open ${openN.tx.inputs.length} coins`, await S.sign(openN, { hotSig: S.keySigner(hot.priv) }), openN.entries, true);

const otherVault = buildVault({ hot: hot.pub, guardian: guardian.pub, rescue: thief.pub, delayDaa: '864000', network: NET });
await refuses(() => S.covenantSpend({ manifest: vault, entry: 'open', coins: [vaultCoins[0]], daa: NOW, airlockAddress: describe(otherVault).airlockAddress }), 'BAD_ENTRY', 'open into a different airlock');
await refuses(() => S.sign(open1, { hotSig: S.keySigner(thief.priv) }), 'SIGNER', 'open signed by a thief');
await refuses(() => S.covenantSpend({ manifest: vault, entry: 'open', coins: [coin(hotAddr, 5)], daa: NOW, airlockAddress: info.airlockAddress }), 'WRONG_COIN', 'open with a coin that is not the vault');
await refuses(() => S.covenantSpend({ manifest: vault, entry: 'open', coins: Array.from({ length: 9 }, () => coin(info.vaultAddress, 1)), daa: NOW, airlockAddress: info.airlockAddress }), 'TOO_MANY', 'open with 9 coins');
if (capOpen < 8) await refuses(() => S.covenantSpend({ manifest: vault, entry: 'open', coins: Array.from({ length: capOpen + 1 }, () => coin(info.vaultAddress, 1000)), daa: NOW, airlockAddress: info.airlockAddress }), 'TOO_HEAVY', `open with ${capOpen + 1} coins (over MAX_FEE)`);

// ---- a forged open: built for the airlock, then the output swapped to a thief before signing ----
const forged = S.covenantSpend({ manifest: vault, entry: 'open', coins: [vaultCoins[1]], daa: NOW, airlockAddress: info.airlockAddress });
forged.tx.outputs[0].spk = K.scriptPublicKey(K.p2pkAddress(NET, thief.pub));
record('FORGED: open signed by hot but paying a thief', await S.sign(forged, { hotSig: S.keySigner(hot.priv) }), forged.entries, false);

// ---- merge ----
const merge = S.covenantSpend({ manifest: vault, entry: 'merge', coins: vaultCoins.slice(0, 2), daa: NOW });
ok(merge.destination === info.vaultAddress, 'merge pays the vault itself');
record('merge two coins', await S.sign(merge, { hotSig: S.keySigner(hot.priv) }), merge.entries, true);

// ---- evacuate ----
const evac = S.covenantSpend({ manifest: vault, entry: 'evacuate', coins: vaultCoins.slice(0, Math.min(3, capEvac)), daa: NOW });
ok(evac.destination === info.rescueAddress, 'evacuate pays the backup wallet');
record(`evacuate ${evac.tx.inputs.length} coins`, await S.sign(evac, { guardianSig: S.keySigner(guardian.priv) }), evac.entries, true);
await refuses(() => S.sign(evac, { guardianSig: S.keySigner(hot.priv) }), 'SIGNER', 'evacuate signed by the hot key');

// ---- airlock: release and rescue ----
const aCoin = coin(info.airlockAddress, 99.99, 1000n);
await refuses(() => S.covenantSpend({ manifest: airlock, entry: 'release', coins: [aCoin], daa: 1000n + DELAY - 1n }), 'NOT_READY', 'release one DAA early');
await refuses(() => S.covenantSpend({ manifest: airlock, entry: 'release', coins: [aCoin], daa: 1000n + DELAY + 5n }), 'NOT_READY', 'release inside the safety margin');
const rel = S.covenantSpend({ manifest: airlock, entry: 'release', coins: [aCoin], daa: 1000n + DELAY + 100n });
ok(rel.destination === hotAddr, 'release pays the hot wallet');
const relSigned = await S.sign(rel, {});
record('release after the delay (no signature)', relSigned, rel.entries, true);
await refuses(() => S.covenantSpend({ manifest: airlock, entry: 'release', coins: [aCoin, coin(info.airlockAddress, 5, 1000n)], daa: NOW * 10n }), 'TOO_MANY', 'release with two coins');

// the engine itself must refuse a release whose sequence is short, even if someone builds it by hand
const early = S.covenantSpend({ manifest: airlock, entry: 'release', coins: [aCoin], daa: 1000n + DELAY + 100n });
early.tx.inputs[0].sequence = DELAY - 1n;
record('FORGED: release with a sequence one short of the delay', await S.sign(early, {}), early.entries, false);

const resc = S.covenantSpend({ manifest: airlock, entry: 'rescue', coins: [aCoin, coin(info.airlockAddress, 20, 2000n)], daa: NOW });
ok(resc.destination === info.rescueAddress, 'rescue pays the backup wallet');
record('rescue two pending coins', await S.sign(resc, { guardianSig: S.keySigner(guardian.priv) }), resc.entries, true);

// ---- spending released money onward (hot -> anywhere) ----
const released = [coin(hotAddr, 99.98)];
const onward = S.payment({ coins: released, from: hotAddr, to: K.p2pkAddress(NET, thief.pub), all: true });
record('hot wallet sends everything onward', await S.sign(onward, S.keySigner(hot.priv)), onward.entries, true);

// ---- write fixtures ----
const out = path.join(ROOT, 'test', 'engine', 'fixtures.json');
fs.writeFileSync(out, JSON.stringify({ network: NET, delay: DELAY.toString(), fixtures }, null, 1) + '\n');
console.log(`fees at the floor: deposit ${K.kasStr(dep.fee)}, open(1) ${K.kasStr(open1.fee)}, open(${openN.tx.inputs.length}) ${K.kasStr(openN.fee)}, merge(2) ${K.kasStr(merge.fee)}, evacuate(${evac.tx.inputs.length}) ${K.kasStr(evac.fee)}, release ${K.kasStr(rel.fee)}, rescue(2) ${K.kasStr(resc.fee)} KAS`);
console.log(`wrote ${fixtures.length} transactions to ${path.relative(ROOT, out)}`);
console.log(`\n${fail ? 'FAILED' : 'PASSED'}: ${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
