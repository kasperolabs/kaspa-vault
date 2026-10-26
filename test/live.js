#!/usr/bin/env node
// test/live.js - read-only checks against a live Kaspa mainnet REST API. Moves no money.
//
//   1. Recompute the ids of real recent transactions from their fields.
//   2. Verify their real signatures against our signature hash (Schnorr inputs directly, ECDSA
//      inputs through the consensus ECDSA wrapping).
//   3. Submit a transaction spending a coin that does not exist: the node must refuse it, and the
//      id in its refusal must be the id we computed (it parsed exactly what we built).
//   4. Provider reads: coins (with script checks), virtual DAA, fee rate.
//
// Usage: node test/live.js [--api https://api.kaspa.org] [--address kaspa:q...]

import { sha256 } from '@noble/hashes/sha2.js';
import * as secp from '@noble/secp256k1';
import * as K from '../core/kaspa.js';
import * as S from '../core/spend.js';
import { restProvider } from '../core/provider.js';

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const API = (opt('--api') || 'https://api.kaspa.org').replace(/\/+$/, '');
const ADDRESS = opt('--address') || 'kaspa:qqkqkzjvr7zwxxmjxjkmxxdwju9kjs6e9u82uh59z07vgaks6gg62v8707g73';   // the API's own example address, busy

let pass = 0, fail = 0;
const ok = (c, what) => { if (c) pass++; else { fail++; console.error('FAIL ' + what); } };

const txs = await (await fetch(`${API}/addresses/${ADDRESS}/full-transactions?limit=10&resolve_previous_outpoints=full`)).json();
let ids = 0, sigs = 0;
const ECDSA_DOMAIN = sha256(new TextEncoder().encode('TransactionSigningHashECDSA'));
for (const x of txs) {
    if (x.version !== 0) continue;
    const tx = K.newTx();
    tx.subnetworkId = K.hexToBytes(x.subnetwork_id);
    tx.payload = K.hexToBytes(x.payload || '');
    const ins = [...x.inputs].sort((a, b) => a.index - b.index);
    const entries = [];
    for (const i of ins) {
        tx.inputs.push({ txid: i.previous_outpoint_hash, index: Number(i.previous_outpoint_index), sequence: 0n, sigOpCount: Number(i.sig_op_count), signatureScript: i.signature_script });
        entries.push({ amount: BigInt(i.previous_outpoint_amount), spk: K.scriptPublicKey(i.previous_outpoint_address) });
    }
    for (const o of [...x.outputs].sort((a, b) => a.index - b.index)) tx.outputs.push({ value: BigInt(o.amount), spk: { version: 0, script: K.hexToBytes(o.script_public_key) } });
    ok(K.transactionId(tx) === x.transaction_id, `id of ${x.transaction_id}`);
    ok(String(K.computeMass(tx)) === String(x.mass), `compute mass of ${x.transaction_id} (${K.computeMass(tx)} vs ${x.mass})`);
    ids++;
    ins.forEach((inp, k) => {
        const s = entries[k].spk.script, h = K.signatureHash(tx, entries, k);
        if (s.length === 34 && s[0] === 0x20) {
            ok(K.schnorrVerify(inp.signature_script.slice(2), h, K.bytesToHex(s.slice(1, 33))), `schnorr signature ${x.transaction_id}:${k}`);
        } else if (s.length === 35 && s[0] === 0x21) {
            const e = sha256(new Uint8Array([...ECDSA_DOMAIN, ...h]));
            ok(secp.verify(K.hexToBytes(inp.signature_script.slice(2, 130)), e, s.slice(1, 34), { prehash: false, lowS: false }), `ecdsa signature ${x.transaction_id}:${k}`);
        } else return;
        sigs++;
    });
}
console.log(`real mainnet transactions: ${ids} ids and masses recomputed, ${sigs} real signatures verified against our signature hash`);

const p = restProvider({ url: API });
const coins = await p.coins([ADDRESS]);
ok(coins.length > 0, 'provider reads coins');
const daa = await p.virtualDaa();
ok(daa > 400000000n, `virtual DAA ${daa}`);
const rate = await p.feeRate();
ok(rate >= K.MIN_RELAY_FEE_PER_GRAM, `fee rate ${rate}`);
console.log(`provider: ${coins.length} coins at the test address, DAA ${daa}, fee rate ${rate} sompi/gram`);

const priv = K.randomPrivateKey(), me = K.addressOfKey('mainnet', priv);
const fake = [{ address: me, txid: K.bytesToHex(secp.utils.randomSecretKey()), index: 1, amount: 1234567890123n, blockDaaScore: 1n, spk: K.scriptPublicKey(me) }];
const signed = await S.sign(S.payment({ coins: fake, from: me, to: ADDRESS, amount: 98765432101n }), S.keySigner(priv));
try { await p.submit(signed.tx); ok(false, 'node accepted a spend of a coin that does not exist'); }
catch (e) {
    const m = e.message.match(/transaction ([0-9a-f]{64})/);
    ok(m && m[1] === signed.txid, `node refused the fake spend and names our id (${m && m[1]})`);
    console.log(`node refused a spend of a made-up coin (${e.code}) and computed the same id: ${signed.txid.slice(0, 16)}…`);
}

console.log(`\n${fail ? 'FAILED' : 'PASSED'}: ${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
