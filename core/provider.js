// core/provider.js - how the vault reads the chain and submits transactions.
//
// A provider is four async functions. The default talks to a Kaspa REST API (api.kaspa.org or your
// own kaspa-rest-server); a wallet that already has a node connection passes its own object with
// the same four functions and nothing here touches the network.
//
//   coins(addresses)  -> [{ address, txid, index, amount: BigInt, blockDaaScore: BigInt, spk: { version, script } }]
//   virtualDaa()      -> BigInt
//   feeRate()         -> BigInt sompi per gram (never below the relay floor)
//   submit(tx)        -> txid (lowercase hex). Throws with .code SEQUENCE_LOCK / SPENT / STORAGE_MASS / FEE / REJECTED

import * as K from './kaspa.js';

const DEFAULT_URL = 'https://api.kaspa.org';
const TIMEOUT_MS = 20000;

// JSON with BigInt written as plain numbers (no precision loss above 2^53)
function stringify(obj) {
    const marks = [];
    const s = JSON.stringify(obj, (k, v) => {
        if (typeof v === 'bigint') { marks.push(v.toString()); return `__BIG${marks.length - 1}__`; }
        return v;
    });
    return s.replace(/"__BIG(\d+)__"/g, (m, i) => marks[Number(i)]);
}

function classify(msg) {
    const m = String(msg || '');
    if (/sequence lock/i.test(m)) return 'SEQUENCE_LOCK';
    if (/storage mass/i.test(m)) return 'STORAGE_MASS';
    if (/already spent|missing outpoint|not found|orphan|double spend/i.test(m)) return 'SPENT';
    if (/fee|insufficient/i.test(m)) return 'FEE';
    return 'REJECTED';
}

export function restProvider({ url = DEFAULT_URL, fetch: f } = {}) {
    const base = String(url).replace(/\/+$/, '');
    const doFetch = f || globalThis.fetch;
    if (!doFetch) throw new Error('no fetch available; pass { fetch }');

    async function call(path, init) {
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const t = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
        try {
            const r = await doFetch(base + path, { ...(init || {}), signal: ctrl ? ctrl.signal : undefined });
            const text = await r.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
            if (!r.ok) {
                const msg = (data && (data.error || data.detail && JSON.stringify(data.detail))) || text.slice(0, 300) || `HTTP ${r.status}`;
                const e = new Error(`${path}: ${msg}`); e.status = r.status; e.code = classify(msg); throw e;
            }
            return data;
        } finally { if (t) clearTimeout(t); }
    }

    function coinOf(e) {
        const spkHex = String((e.utxoEntry && e.utxoEntry.scriptPublicKey && e.utxoEntry.scriptPublicKey.scriptPublicKey) || '');
        const version = Number((e.utxoEntry && e.utxoEntry.scriptPublicKey && e.utxoEntry.scriptPublicKey.version) || 0);
        return {
            address: String(e.address || '').toLowerCase(),
            txid: String(e.outpoint.transactionId).toLowerCase(),
            index: Number(e.outpoint.index),
            amount: BigInt(e.utxoEntry.amount),
            blockDaaScore: BigInt(e.utxoEntry.blockDaaScore),
            isCoinbase: !!e.utxoEntry.isCoinbase,
            spk: { version, script: K.hexToBytes(spkHex) }
        };
    }

    return {
        name: `rest:${base}`,
        async coins(addresses) {
            const list = Array.isArray(addresses) ? addresses : [addresses];
            if (!list.length) return [];
            const data = await call('/addresses/utxos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addresses: list }) });
            const coins = (Array.isArray(data) ? data : []).map(coinOf).filter(c => /^[0-9a-f]{64}$/.test(c.txid));
            // the API trusts nobody's script: check each coin's script really is its address's
            for (const c of coins) {
                const want = K.bytesToHex(K.scriptPublicKey(c.address).script);
                if (K.bytesToHex(c.spk.script) !== want) throw new Error(`provider returned a coin whose script does not match ${c.address}`);
            }
            return coins;
        },
        async virtualDaa() {
            const d = await call('/info/blockdag');
            return BigInt(d.virtualDaaScore);
        },
        async feeRate() {
            try {
                const d = await call('/info/fee-estimate');
                const r = BigInt(Math.ceil(Number(d && d.priorityBucket && d.priorityBucket.feerate) || 0));
                return r > K.MIN_RELAY_FEE_PER_GRAM ? r : K.MIN_RELAY_FEE_PER_GRAM;
            } catch (e) { return K.MIN_RELAY_FEE_PER_GRAM; }
        },
        async submit(tx) {
            const body = stringify({ transaction: K.toRestTransaction(tx), allowOrphan: false });
            const expected = K.transactionId(tx);
            try {
                const d = await call('/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
                if (d && d.error) { const e = new Error(d.error); e.code = classify(d.error); throw e; }
                const id = String((d && d.transactionId) || expected).toLowerCase();
                if (id !== expected) throw new Error(`the node reports txid ${id}, this package computed ${expected}`);
                return id;
            } catch (e) {
                if (String(e.message).includes(expected) && /already in the mempool|already accepted/i.test(e.message)) return expected;
                throw e;
            }
        }
    };
}

export { stringify as jsonWithBigInt };
