// test/sim-chain.js - a strict in-memory chain for tests, plus a mock kaspad JSON wRPC server on top.
//
// The chain checks what decides whether money can move: inputs exist and are unspent, Schnorr
// signatures on P2PK inputs verify, sequence locks have matured, the fee meets the relay floor.
// (Covenant scripts are judged by rusty-kaspa itself in test/engine; this simulates the chain around them.)
//
// mockKaspad(chain) speaks kaspad's JSON wRPC the way rusty-kaspa v2.1.0 serializes it, and refuses
// a submission the way its serde would: camelCase fields, hex byte strings, script public keys with
// the 2-byte version prefix, and a storageMass that must equal the consensus calculation.

import crypto from 'crypto';
import * as K from '../core/kaspa.js';

export function simChain(knownAddresses = []) {
    const utxos = new Map();
    let daa = 1000000n;
    const ledger = [];
    const known = new Set(knownAddresses);
    const addrOf = spk => [...known].find(a => K.bytesToHex(K.scriptPublicKey(a).script) === K.bytesToHex(spk.script)) || 'external';
    // coins are found by script, like a node's UTXO index: any address works, known or not
    const scriptOf = a => K.bytesToHex(K.scriptPublicKey(a).script);
    const at = a => { const s = scriptOf(a); return [...utxos.values()].filter(c => K.bytesToHex(c.spk.script) === s).map(c => ({ ...c, address: a })); };

    async function submit(tx) {
        const entries = tx.inputs.map(i => {
            const c = utxos.get(`${i.txid}:${i.index}`);
            if (!c) { const e = new Error(`transaction ${K.transactionId(tx)} rejected: missing outpoint ${i.txid}:${i.index}`); e.code = 'SPENT'; throw e; }
            if (i.sequence > 0n && c.blockDaaScore + i.sequence > daa) { const e = new Error('sequence lock conditions were not met'); e.code = 'SEQUENCE_LOCK'; throw e; }
            return { amount: c.amount, spk: c.spk, blockDaaScore: c.blockDaaScore, coin: c };
        });
        tx.inputs.forEach((inp, i) => {
            const s = entries[i].spk.script;
            if (s.length === 34 && s[0] === 0x20 && !K.schnorrVerify(inp.signatureScript.slice(2), K.signatureHash(tx, entries, i), K.bytesToHex(s.slice(1, 33)))) throw new Error(`bad signature on input ${i}`);
        });
        const fee = entries.reduce((a, e) => a + e.amount, 0n) - tx.outputs.reduce((a, o) => a + o.value, 0n);
        if (fee < K.masses(tx, entries).relay * K.MIN_RELAY_FEE_PER_GRAM) throw new Error('fee below the relay floor');
        const id = K.transactionId(tx);
        for (const i of tx.inputs) utxos.delete(`${i.txid}:${i.index}`);
        tx.outputs.forEach((o, index) => utxos.set(`${id}:${index}`, { address: addrOf(o.spk), txid: id, index, amount: o.value, blockDaaScore: daa, spk: o.spk }));
        ledger.push({ id, fee, from: entries.map(e => e.coin.address), to: tx.outputs.map(o => addrOf(o.spk)) });
        return id;
    }

    return {
        know: a => known.add(a),
        advance(n) { daa += BigInt(n); },
        daa: () => daa,
        fund(address, kas) {
            known.add(address);
            const c = { address, txid: crypto.randomBytes(32).toString('hex'), index: 0, amount: K.kasToSompi(String(kas)), blockDaaScore: daa, spk: K.scriptPublicKey(address) };
            utxos.set(`${c.txid}:${c.index}`, c);
            return c;
        },
        ledger,
        submitRaw: submit,
        provider: {
            name: 'sim',
            async coins(addresses) { return addresses.flatMap(at); },
            async virtualDaa() { return daa; },
            async feeRate() { return K.MIN_RELAY_FEE_PER_GRAM; },
            submit: tx => submit(tx)
        },
        balance: a => at(a).reduce((s, c) => s + c.amount, 0n),
        count: a => at(a).length,
        coinsAt: at,
        find: (txid, index) => utxos.get(`${txid}:${index}`) || null
    };
}

/** A mock kaspad JSON wRPC endpoint on top of a sim chain. Returns { url, close, calls }. */
export async function mockKaspad(chain, { WebSocketServer }) {
    const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise(r => wss.on('listening', r));
    const calls = [];
    const big = s => { if (typeof s === 'number' || /^\d+$/.test(String(s))) return BigInt(s); throw new Error(`expected a u64, got ${JSON.stringify(s)}`); };
    const hex = (s, what) => { if (typeof s !== 'string' || !/^([0-9a-f]{2})*$/.test(s)) throw new Error(`${what}: expected a hex string`); return s; };

    function txFromJson(t) {
        const need = (o, keys, what) => { for (const k of keys) if (!(k in o)) throw new Error(`${what}: missing field \`${k}\``); };
        need(t, ['version', 'inputs', 'outputs', 'lockTime', 'subnetworkId', 'gas', 'payload'], 'transaction');
        if (!('storageMass' in t) && !('mass' in t)) throw new Error('Either storageMass or mass must be provided');
        const tx = K.newTx();
        tx.version = t.version; tx.lockTime = big(t.lockTime); tx.gas = big(t.gas);
        tx.subnetworkId = K.hexToBytes(hex(t.subnetworkId, 'subnetworkId')); tx.payload = K.hexToBytes(hex(t.payload, 'payload'));
        tx.inputs = t.inputs.map((i, n) => {
            need(i, ['previousOutpoint', 'signatureScript', 'sequence', 'sigOpCount'], `inputs[${n}]`);
            return { txid: hex(i.previousOutpoint.transactionId, 'transactionId'), index: i.previousOutpoint.index, signatureScript: hex(i.signatureScript, 'signatureScript'), sequence: big(i.sequence), sigOpCount: i.sigOpCount };
        });
        tx.outputs = t.outputs.map((o, n) => {
            need(o, ['value', 'scriptPublicKey'], `outputs[${n}]`);
            const s = hex(o.scriptPublicKey, 'scriptPublicKey');
            return { value: big(o.value), spk: { version: parseInt(s.slice(0, 4), 16), script: K.hexToBytes(s.slice(4)) } };
        });
        return { tx, storageMass: big(t.storageMass != null ? t.storageMass : t.mass) };
    }

    wss.on('connection', ws => ws.on('message', async raw => {
        let m;
        try { m = JSON.parse(String(raw).replace(/([:\[,]\s*)(\d{16,})(?=\s*[,}\]])/g, '$1"$2"')); } catch (e) { return; }
        calls.push(m.method);
        const reply = params => ws.send(JSON.stringify({ id: m.id, params }, (k, v) => typeof v === 'bigint' ? Number(v) : v));
        const error = message => ws.send(JSON.stringify({ id: m.id, error: { message } }));
        try {
            if (m.method === 'getBlockDagInfo') return reply({ networkName: 'kaspa-mainnet', virtualDaaScore: chain.daa() });
            if (m.method === 'getFeeEstimate') return reply({ estimate: { priorityBucket: { feerate: 1.0, estimatedSeconds: 1 }, normalBuckets: [], lowBuckets: [] } });
            if (m.method === 'getUtxosByAddresses') {
                const entries = [];
                for (const a of m.params.addresses) for (const c of chain.coinsAt(a)) entries.push({
                    address: a, outpoint: { transactionId: c.txid, index: c.index },
                    utxoEntry: { amount: c.amount, scriptPublicKey: '0000' + K.bytesToHex(c.spk.script), blockDaaScore: c.blockDaaScore, isCoinbase: false, covenantId: null }
                });
                return reply({ entries });
            }
            if (m.method === 'submitTransaction') {
                const { tx, storageMass } = txFromJson(m.params.transaction);
                // the mass commitment must equal what consensus calculates from the spent coins
                const id = K.transactionId(tx);
                const coins = tx.inputs.map(i => chain.find(i.txid, i.index));
                if (coins.every(Boolean)) {
                    const calc = K.storageMass(tx, coins.map(c => ({ amount: c.amount, spk: c.spk })));
                    if (calc !== storageMass) return error(`Rejected transaction ${id}: WrongMass(${calc}, ${storageMass})`);
                }
                const txid = await chain.submitRaw(tx);
                return reply({ transactionId: txid });
            }
            return error(`unknown method ${m.method}`);
        } catch (e) { return error(String(e.message)); }
    }));
    return { url: `ws://127.0.0.1:${wss.address().port}`, close: () => new Promise(r => { for (const c of wss.clients) c.terminate(); wss.close(r); }), calls };
}
