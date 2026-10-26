// core/kaspa.js - the Kaspa transaction primitives the vault needs, in plain JS.
//
// Ported from rusty-kaspa v2.1.0 (consensus/core/src/hashing/tx.rs, hashing/sighash.rs, mass/mod.rs,
// mining/src/mempool/check_transaction_standard.rs). Version 0 transactions only: that is what the
// official SDK builds and what every vault spend on mainnet so far has used.
//
// Dependencies: @noble/hashes (blake2b) and @noble/secp256k1 (BIP340 Schnorr). Both are small,
// audited and dependency-free. test/consensus-fixtures.js plus test/engine/consensus.rs check every
// transaction id, signature hash, signature and mass here against rusty-kaspa's own code.

import { blake2b } from '@noble/hashes/blake2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import * as secp from '@noble/secp256k1';
import ksm from 'kaspa-ksm';

secp.hashes.sha256 = sha256;
secp.hashes.hmacSha256 = (k, m) => hmac(sha256, k, m);

// ---------- constants (mainnet consensus and mempool defaults) ----------
export const SOMPI_PER_KAS = 100000000n;
export const SIGHASH_ALL = 0x01;
export const SUBNETWORK_NATIVE = new Uint8Array(20);
export const MASS_PER_TX_BYTE = 1n;
export const MASS_PER_SPK_BYTE = 10n;
export const MASS_PER_SIGOP = 1000n;
export const TRANSIENT_BYTE_TO_MASS = 4n;
export const STORAGE_MASS_PARAMETER = SOMPI_PER_KAS * 10000n;     // C in KIP-9
export const BLOCK_MASS = { compute: 500000n, storage: 500000n, transient: 1000000n };
export const MIN_RELAY_FEE_PER_GRAM = 100n;                        // DEFAULT_MINIMUM_RELAY_TRANSACTION_FEE (100,000 sompi/kg)
// This package refuses to build anything near the block limits: a transaction this heavy is a bug here.
export const MAX_SAFE_MASS = 100000n;

// ---------- bytes ----------
const enc = new TextEncoder();
export function hexToBytes(h) {
    const s = String(h == null ? '' : h).trim().toLowerCase().replace(/^0x/, '');
    if (s.length % 2 || !/^[0-9a-f]*$/.test(s)) throw new Error('not hex');
    const out = new Uint8Array(s.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
}
export function bytesToHex(b) { return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); }
function concat(parts) {
    const n = parts.reduce((a, p) => a + p.length, 0);
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}
function u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, Number(n), true); return b; }
function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, Number(n), true); return b; }
function u64(n) { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(n), true); return b; }
function varBytes(b) { return concat([u64(b.length), b]); }

/** A keyed blake2b-256 writer, the way rusty-kaspa's domain hashers work. */
class Hasher {
    constructor(domain) { this.key = enc.encode(domain); this.parts = []; }
    update(b) { this.parts.push(b); return this; }
    finalize() { return blake2b(concat(this.parts), { dkLen: 32, key: this.key }); }
}

// ---------- scripts and addresses ----------
/** kaspa:q (Schnorr P2PK), kaspa:p (P2SH), kaspa:qyp (ECDSA P2PK) -> { version, script } */
export function scriptPublicKey(address) {
    const d = ksm.address.decodeAddress(String(address).trim().toLowerCase());
    const payload = typeof d.payload === 'string' ? hexToBytes(d.payload) : Uint8Array.from(d.payload);
    if (d.version === 0 && payload.length === 32) return { version: 0, script: concat([Uint8Array.of(0x20), payload, Uint8Array.of(0xac)]) };
    if (d.version === 1 && payload.length === 33) return { version: 0, script: concat([Uint8Array.of(0x21), payload, Uint8Array.of(0xab)]) };
    if (d.version === 8 && payload.length === 32) return { version: 0, script: concat([Uint8Array.of(0xaa, 0x20), payload, Uint8Array.of(0x87)]) };
    throw new Error(`unsupported address ${address}`);
}
export function networkOf(address) {
    const p = String(address).split(':')[0];
    return { kaspa: 'mainnet', kaspatest: 'testnet-10', kaspasim: 'simnet', kaspadev: 'devnet' }[p] || null;
}

// ---------- keys ----------
export function randomPrivateKey() { return bytesToHex(secp.utils.randomSecretKey()); }
export function xOnlyPublicKey(privHex) { return bytesToHex(secp.schnorr.getPublicKey(hexToBytes(privHex))); }
export function p2pkAddress(network, xonlyHex) { return ksm.p2pkAddress(network, xonlyHex); }
export function addressOfKey(network, privHex) { return p2pkAddress(network, xOnlyPublicKey(privHex)); }

// ---------- transactions ----------
// Shape used everywhere in this package (all amounts BigInt sompi):
//   tx = { version: 0, inputs: [{ txid, index, sequence: BigInt, sigOpCount, signatureScript: hex }],
//          outputs: [{ value: BigInt, spk: { version, script: Uint8Array } }], lockTime: BigInt,
//          subnetworkId: Uint8Array(20), gas: 0n, payload: Uint8Array }
//   entries[i] = { amount: BigInt, spk: { version, script }, blockDaaScore: BigInt }   (the coin input i spends)

export function newTx() {
    return { version: 0, inputs: [], outputs: [], lockTime: 0n, subnetworkId: SUBNETWORK_NATIVE, gas: 0n, payload: new Uint8Array(0) };
}

/** The transaction id (version 0): signature scripts and sig-op counts excluded. */
export function transactionId(tx) {
    if (tx.version !== 0) throw new Error('only version 0 transactions are built here');
    const h = new Hasher('TransactionID');
    h.update(u16(tx.version)).update(u64(tx.inputs.length));
    for (const i of tx.inputs) {
        h.update(hexToBytes(i.txid)).update(u32(i.index)).update(varBytes(new Uint8Array(0))).update(u64(i.sequence));
    }
    h.update(u64(tx.outputs.length));
    for (const o of tx.outputs) h.update(u64(o.value)).update(u16(o.spk.version)).update(varBytes(o.spk.script));
    h.update(u64(tx.lockTime)).update(tx.subnetworkId).update(u64(tx.gas)).update(varBytes(tx.payload));
    return bytesToHex(h.finalize());
}

const ZERO32 = new Uint8Array(32);
function isNativeSubnet(s) { return s.every(b => b === 0); }

/** The Schnorr signature hash for input `i` with SIGHASH_ALL (the only type this package signs). */
export function signatureHash(tx, entries, i) {
    if (tx.version !== 0) throw new Error('only version 0 transactions are built here');
    const H = d => new Hasher(d);
    const prevOuts = H('TransactionSigningHash');
    for (const x of tx.inputs) prevOuts.update(hexToBytes(x.txid)).update(u32(x.index));
    const seqs = H('TransactionSigningHash');
    for (const x of tx.inputs) seqs.update(u64(x.sequence));
    const sigops = H('TransactionSigningHash');
    for (const x of tx.inputs) sigops.update(Uint8Array.of(x.sigOpCount));
    const outs = H('TransactionSigningHash');
    for (const o of tx.outputs) outs.update(u64(o.value)).update(u16(o.spk.version)).update(varBytes(o.spk.script));
    const payloadHash = isNativeSubnet(tx.subnetworkId) && tx.payload.length === 0
        ? ZERO32 : H('TransactionSigningHash').update(varBytes(tx.payload)).finalize();
    const inp = tx.inputs[i], e = entries[i];
    return H('TransactionSigningHash')
        .update(u16(tx.version)).update(prevOuts.finalize()).update(seqs.finalize()).update(sigops.finalize())
        .update(hexToBytes(inp.txid)).update(u32(inp.index))
        .update(u16(e.spk.version)).update(varBytes(e.spk.script))
        .update(u64(e.amount)).update(u64(inp.sequence)).update(Uint8Array.of(inp.sigOpCount))
        .update(outs.finalize()).update(u64(tx.lockTime)).update(tx.subnetworkId).update(u64(tx.gas))
        .update(payloadHash).update(Uint8Array.of(SIGHASH_ALL))
        .finalize();
}

/** BIP340 Schnorr over a signature hash; returns the 65-byte form (64 + SIGHASH_ALL) as hex. */
export function schnorrSign(sighash, privHex) {
    const sig = secp.schnorr.sign(sighash, hexToBytes(privHex));
    return bytesToHex(sig) + '01';
}
export function schnorrVerify(sig65Hex, sighash, xonlyHex) {
    const s = hexToBytes(sig65Hex);
    if (s.length !== 65 || s[64] !== SIGHASH_ALL) return false;
    return secp.schnorr.verify(s.slice(0, 64), sighash, hexToBytes(xonlyHex));
}
// ---------- personal messages (Kaspa's signMessage, as Kasware/Kastle/Kaspire use it) ----------
// hash = blake2b-256 keyed "PersonalMessageSigningHash" over the UTF-8 text; BIP340 Schnorr over it.
export function messageHash(text) { return new Hasher('PersonalMessageSigningHash').update(enc.encode(String(text))).finalize(); }
/** Returns the 64-byte signature as hex. `auxRand` only for test vectors. */
export function signMessage(text, privHex, auxRand) {
    return bytesToHex(secp.schnorr.sign(messageHash(text), hexToBytes(privHex), auxRand));
}
export function verifyMessage(text, sigHex, xonlyHex) {
    try {
        const s = hexToBytes(sigHex);
        if (s.length !== 64) return false;
        return secp.schnorr.verify(s, messageHash(text), hexToBytes(xonlyHex));
    } catch (e) { return false; }
}

/** The signature script of a plain P2PK (Schnorr) input: one push of the 65-byte signature. */
export function p2pkSignatureScript(sig65Hex) { return '41' + sig65Hex; }

// ---------- mass and fees ----------
export function serializedSize(tx) {
    let n = 2n + 8n;
    for (const i of tx.inputs) n += 32n + 4n + 8n + BigInt(hexToBytes(i.signatureScript || '').length) + 8n;
    n += 8n;
    for (const o of tx.outputs) n += 8n + 2n + 8n + BigInt(o.spk.script.length);
    n += 8n + 20n + 8n + 32n + 8n + BigInt(tx.payload.length);
    return n;
}
export function computeMass(tx) {
    const size = serializedSize(tx);
    const spk = tx.outputs.reduce((a, o) => a + 2n + BigInt(o.spk.script.length), 0n);
    const sigops = tx.inputs.reduce((a, i) => a + BigInt(i.sigOpCount), 0n);
    return size * MASS_PER_TX_BYTE + spk * MASS_PER_SPK_BYTE + sigops * MASS_PER_SIGOP;
}
export function transientMass(tx) { return serializedSize(tx) * TRANSIENT_BYTE_TO_MASS; }

function plurality(spk) { return BigInt(Math.ceil((63 + spk.script.length) / 100)); }
/** KIP-9 storage mass, as calc_storage_mass computes it (BigInt, floor division like u64). */
export function storageMass(tx, entries) {
    const C = STORAGE_MASS_PARAMETER;
    let outsPlur = 0n, harmOuts = 0n;
    for (const o of tx.outputs) { const p = plurality(o.spk); outsPlur += p; harmOuts += C * p * p / BigInt(o.value); }
    const ins = entries.map(e => ({ p: plurality(e.spk), a: BigInt(e.amount) }));
    const insPlur = ins.reduce((a, x) => a + x.p, 0n);
    const relaxed = outsPlur === 1n || (ins.length <= 2 && (insPlur === 1n || (outsPlur === 2n && insPlur === 2n)));
    if (relaxed) {
        const harmIns = ins.reduce((a, x) => a + C * x.p * x.p / x.a, 0n);
        return harmOuts > harmIns ? harmOuts - harmIns : 0n;
    }
    const sumIns = ins.reduce((a, x) => a + x.a, 0n);
    let mean = sumIns / insPlur; if (mean < 1n) mean = 1n;
    const arith = insPlur * (C / mean);
    return harmOuts > arith ? harmOuts - arith : 0n;
}
const ceilDiv = (a, b) => (a + b - 1n) / b;
/** Every mass the node looks at, plus the one fees are priced on. */
export function masses(tx, entries) {
    const compute = computeMass(tx), transient = transientMass(tx), storage = storageMass(tx, entries);
    const transientNorm = ceilDiv(transient * BLOCK_MASS.compute, BLOCK_MASS.transient);   // cofactor 0.5 on mainnet
    const storageNorm = ceilDiv(storage * BLOCK_MASS.compute, BLOCK_MASS.storage);         // cofactor 1
    const relay = compute > transientNorm ? compute : transientNorm;                         // what the mempool's fee check uses
    const priced = relay > storageNorm ? relay : storageNorm;                                // what this package pays on
    return { compute, transient, storage, relay, priced };
}
/** The fee this package pays: `feeRate` sompi per gram on the heaviest normalized mass, never below the relay floor. */
export function feeFor(m, feeRate) {
    const r = BigInt(feeRate == null ? MIN_RELAY_FEE_PER_GRAM : feeRate);
    const rate = r < MIN_RELAY_FEE_PER_GRAM ? MIN_RELAY_FEE_PER_GRAM : r;
    return m.priced * rate;
}

// ---------- the REST API's transaction shape ----------
// BigInt fields stay BigInt; provider.js serializes them as plain JSON numbers without rounding.
export function toRestTransaction(tx) {
    return {
        version: tx.version,
        inputs: tx.inputs.map(i => ({
            previousOutpoint: { transactionId: i.txid, index: i.index },
            signatureScript: i.signatureScript || '',
            sequence: BigInt(i.sequence),
            sigOpCount: i.sigOpCount
        })),
        outputs: tx.outputs.map(o => ({ amount: BigInt(o.value), scriptPublicKey: { version: o.spk.version, scriptPublicKey: bytesToHex(o.spk.script) } })),
        lockTime: BigInt(tx.lockTime),
        subnetworkId: bytesToHex(tx.subnetworkId)
    };
}

export function kasStr(sompi) {
    const s = BigInt(sompi);
    const neg = s < 0n, a = neg ? -s : s;
    return `${neg ? '-' : ''}${a / SOMPI_PER_KAS}.${(a % SOMPI_PER_KAS).toString().padStart(8, '0')}`;
}
export function kasToSompi(str) {
    const s = String(str).trim();
    if (!/^\d+(\.\d{1,8})?$/.test(s)) throw new Error(`bad KAS amount "${str}"`);
    const [w, f = ''] = s.split('.');
    return BigInt(w) * SOMPI_PER_KAS + BigInt((f + '00000000').slice(0, 8));
}
