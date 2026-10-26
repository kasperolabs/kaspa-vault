// core/provider-wrpc.js - a provider that talks to kaspad directly over its JSON WebSocket RPC
// (kaspad --rpclisten-json=127.0.0.1:18110). No WASM SDK; one WebSocket.
//
// Wire format (workflow-rpc 0.18, rusty-kaspa v2.1.0):
//   request   { "id": <n>, "method": "<camelCase op>", "params": { ... } }
//   response  { "id": <n>, "params": { ... } }   or   { "id": <n>, "error": { "message": ... } }
// Ops used: getUtxosByAddresses, getBlockDagInfo, getFeeEstimate, submitTransaction.
// A script public key is a hex string with a 2-byte big-endian version prefix ("0000" + script).
// A submitted transaction must carry storageMass equal to the consensus calculation (WrongMass otherwise).
//
//   wrpcJsonProvider({ url: 'ws://127.0.0.1:18110', WebSocket })   // WebSocket: globalThis.WebSocket or require('ws')

import * as K from './kaspa.js';
import { jsonWithBigInt } from './provider.js';

const TIMEOUT_MS = 20000;

// JSON.parse loses integers above 2^53; quote long integers first so amounts stay exact
function parseLossless(text) {
    return JSON.parse(String(text).replace(/([:\[,]\s*)(-?\d{16,})(?=\s*[,}\]])/g, '$1"$2"'));
}

function classify(msg) {
    const m = String(msg || '');
    if (/sequence lock/i.test(m)) return 'SEQUENCE_LOCK';
    if (/storage mass|WrongMass/i.test(m)) return 'STORAGE_MASS';
    if (/already spent|missing outpoint|not found|orphan|double spend/i.test(m)) return 'SPENT';
    if (/fee|insufficient/i.test(m)) return 'FEE';
    return 'REJECTED';
}

export function wrpcJsonProvider({ url = 'ws://127.0.0.1:18110', WebSocket: WS, timeoutMs = TIMEOUT_MS } = {}) {
    const Socket = WS || globalThis.WebSocket;
    if (!Socket) throw new Error('no WebSocket available; pass { WebSocket } (the ws package in Node 18)');
    let ws = null, opening = null, nextId = 1;
    const pending = new Map();

    function connect() {
        if (ws && ws.readyState === 1) return Promise.resolve(ws);
        if (opening) return opening;
        opening = new Promise((resolve, reject) => {
            const s = new Socket(url);
            const t = setTimeout(() => { try { s.close(); } catch (e) { /* closing */ } reject(new Error(`${url}: connection timed out`)); }, timeoutMs);
            const onMsg = ev => {
                let m;
                try { m = parseLossless(typeof ev === 'string' ? ev : ev.data !== undefined ? ev.data : ev); } catch (e) { return; }
                const p = pending.get(m.id);
                if (!p) return;                       // notifications, unknown ids
                pending.delete(m.id); clearTimeout(p.t);
                if (m.error) { const e = new Error(m.error.message || JSON.stringify(m.error)); e.code = classify(e.message); p.reject(e); }
                else p.resolve(m.params || {});
            };
            const onClose = () => {
                ws = null;
                for (const [id, p] of pending) { clearTimeout(p.t); p.reject(new Error(`${url}: connection closed`)); pending.delete(id); }
            };
            if (typeof s.on === 'function') {            // ws package
                s.on('open', () => { clearTimeout(t); ws = s; opening = null; resolve(s); });
                s.on('message', data => onMsg(String(data)));
                s.on('close', onClose);
                s.on('error', e => { clearTimeout(t); opening = null; reject(new Error(`${url}: ${e.message}`)); });
            } else {                                      // browser WebSocket
                s.onopen = () => { clearTimeout(t); ws = s; opening = null; resolve(s); };
                s.onmessage = onMsg;
                s.onclose = onClose;
                s.onerror = () => { clearTimeout(t); opening = null; reject(new Error(`${url}: connection failed`)); };
            }
        });
        return opening;
    }

    async function call(method, params) {
        const s = await connect();
        const id = nextId++;
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => { pending.delete(id); reject(new Error(`${method}: no answer within ${timeoutMs / 1000}s`)); }, timeoutMs);
            pending.set(id, { resolve, reject, t });
            s.send(jsonWithBigInt({ id, method, params: params || {} }));
        });
    }

    function spkFromJson(v) {
        const h = String(v || '').toLowerCase();
        return { version: parseInt(h.slice(0, 4) || '0', 16), script: K.hexToBytes(h.slice(4)) };
    }

    return {
        name: `wrpc-json:${url}`,
        call,
        close() { if (ws) try { ws.close(); } catch (e) { /* closed */ } ws = null; },
        async coins(addresses) {
            const list = Array.isArray(addresses) ? addresses : [addresses];
            if (!list.length) return [];
            const r = await call('getUtxosByAddresses', { addresses: list });
            const out = (r.entries || []).map(e => ({
                address: String(e.address || '').toLowerCase(),
                txid: String(e.outpoint.transactionId).toLowerCase(),
                index: Number(e.outpoint.index),
                amount: BigInt(e.utxoEntry.amount),
                blockDaaScore: BigInt(e.utxoEntry.blockDaaScore),
                isCoinbase: !!e.utxoEntry.isCoinbase,
                spk: spkFromJson(e.utxoEntry.scriptPublicKey)
            }));
            for (const c of out) {
                if (K.bytesToHex(c.spk.script) !== K.bytesToHex(K.scriptPublicKey(c.address).script)) throw new Error(`node returned a coin whose script does not match ${c.address}`);
            }
            return out;
        },
        async virtualDaa() { return BigInt((await call('getBlockDagInfo', {})).virtualDaaScore); },
        async feeRate() {
            try {
                const r = await call('getFeeEstimate', {});
                const f = BigInt(Math.ceil(Number(r && r.estimate && r.estimate.priorityBucket && r.estimate.priorityBucket.feerate) || 0));
                return f > K.MIN_RELAY_FEE_PER_GRAM ? f : K.MIN_RELAY_FEE_PER_GRAM;
            } catch (e) { return K.MIN_RELAY_FEE_PER_GRAM; }
        },
        async submit(tx, entries) {
            if (!entries) throw new Error('submit over wRPC needs the spent coins (for the storage mass commitment)');
            const transaction = {
                version: tx.version,
                inputs: tx.inputs.map(i => ({
                    previousOutpoint: { transactionId: i.txid, index: i.index },
                    signatureScript: i.signatureScript || '', sequence: BigInt(i.sequence), sigOpCount: i.sigOpCount, verboseData: null
                })),
                outputs: tx.outputs.map(o => ({
                    value: BigInt(o.value),
                    scriptPublicKey: o.spk.version.toString(16).padStart(4, '0') + K.bytesToHex(o.spk.script),
                    verboseData: null, covenant: null
                })),
                lockTime: BigInt(tx.lockTime),
                subnetworkId: K.bytesToHex(tx.subnetworkId),
                gas: BigInt(tx.gas),
                payload: K.bytesToHex(tx.payload),
                storageMass: K.storageMass(tx, entries),
                verboseData: null
            };
            const expected = K.transactionId(tx);
            try {
                const r = await call('submitTransaction', { transaction, allowOrphan: false });
                const id = String(r.transactionId || expected).toLowerCase();
                if (id !== expected) throw new Error(`the node reports txid ${id}, this package computed ${expected}`);
                return id;
            } catch (e) {
                if (String(e.message).includes(expected) && /already in the mempool|already accepted/i.test(e.message)) return expected;
                throw e;
            }
        }
    };
}

export { parseLossless };
