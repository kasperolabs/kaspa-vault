// core/spend.js - every transaction the vault ever makes.
//
//   payment(...)            plain P2PK send from the hot wallet (a deposit is a payment to the vault
//                           address; taking released money elsewhere is a payment too)
//   covenantSpend(...)      one covenant path: open, merge, evacuate (Vault); release, rescue (Airlock)
//   sign(built, signers)    fills signature scripts; each signature is checked before it is used
//   capacity(...)           how many coins one covenant spend can carry inside the contract's MAX_FEE
//
// Rules copied from the contracts and checked here, before anything is signed:
//   - exactly one output; every input is a coin of the same covenant address
//   - the output pays where the path must pay: open -> the airlock, merge -> the vault itself,
//     evacuate/rescue -> the backup wallet, release -> the hot key
//   - output value >= inputs - MAX_FEE (0.01 KAS); release takes exactly one input
// A covenant spend is a sweep: no change output, ever (a change output is what got Kasla's first
// spends refused on storage mass, see the Oct 17 2026 lesson).

import ksm from 'kaspa-ksm';
import * as K from './kaspa.js';

export const MAX_FEE = 1000000n;                // both contracts: int constant MAX_FEE = 1000000
export const MAX_COVENANT_INPUTS = 8;           // both contracts: int constant MAX_INS = 8
export const SEQ_MARGIN_DAA = 20n;              // wait this many DAA past the lock before releasing
export const MIN_CHANGE = 50000000n;            // 0.5 KAS: smaller change costs more in storage mass than it is worth
export const MAX_PAYMENT_INPUTS = 60;

function fail(code, message, extra) { const e = new Error(message); e.code = code; Object.assign(e, extra || {}); return e; }
const sum = list => list.reduce((a, c) => a + BigInt(c.amount), 0n);
const DUMMY_SIG = '00'.repeat(65);

function entryOf(c) { return { amount: BigInt(c.amount), spk: c.spk, blockDaaScore: BigInt(c.blockDaaScore) }; }
function inputOf(c, sequence, sigOpCount, sigScript) {
    return { txid: c.txid, index: c.index, sequence, sigOpCount, signatureScript: sigScript };
}
function outputTo(address, value) { return { value, spk: K.scriptPublicKey(address) }; }

// ---------- covenant spends ----------
const WHERE = {
    open: 'airlock', merge: 'self', evacuate: 'payTo', rescue: 'payTo', release: 'payTo'
};

/**
 * Build one unsigned covenant spend.
 * @param manifest     the covenant's .ksm (vault or airlock)
 * @param entry        'open' | 'merge' | 'evacuate' | 'release' | 'rescue'
 * @param coins        coins at the covenant address (from a provider)
 * @param daa          current virtual DAA score (BigInt)
 * @param feeRate      sompi per gram (default: the relay floor)
 * @param airlockAddress  required for 'open' (the vault's script only knows the airlock's hash)
 * @returns { tx, entries, plan, fee, amountOut, destination, entry, manifest }
 */
export function covenantSpend({ manifest, entry, coins, daa, feeRate, airlockAddress }) {
    if (!WHERE[entry]) throw fail('BAD_ENTRY', `unknown entry "${entry}"`);
    if (!Array.isArray(coins) || !coins.length) throw fail('NO_COINS', 'nothing to spend');
    if (coins.length > MAX_COVENANT_INPUTS) throw fail('TOO_MANY', `at most ${MAX_COVENANT_INPUTS} coins per spend; split it`);
    if (entry === 'release' && coins.length !== 1) throw fail('TOO_MANY', 'release takes exactly one coin per transaction');
    const own = K.bytesToHex(K.scriptPublicKey(manifest.address).script);
    for (const c of coins) {
        if (K.bytesToHex(c.spk.script) !== own) throw fail('WRONG_COIN', `coin ${c.txid}:${c.index} is not at ${manifest.address}`);
    }
    const seen = new Set();
    for (const c of coins) { const k = `${c.txid}:${c.index}`; if (seen.has(k)) throw fail('WRONG_COIN', `coin ${k} listed twice`); seen.add(k); }

    const plan = ksm.planSpend(manifest, entry, {
        chain: { daa: BigInt(daa), nowMs: Date.now() },
        utxos: coins.map(c => ({ blockDaaScore: BigInt(c.blockDaaScore).toString() }))
    });
    if (!plan.ready) throw fail('NOT_READY', 'not spendable yet: ' + plan.blockers.join('; '), { plan });
    const sequence = BigInt(plan.sequence);
    if (sequence > 0n) {
        for (const c of coins) {
            if (BigInt(daa) < BigInt(c.blockDaaScore) + sequence + SEQ_MARGIN_DAA) throw fail('NOT_READY', 'the waiting time has not fully passed yet', { plan });
        }
    }

    let destination;
    if (WHERE[entry] === 'payTo') {
        if (!plan.payTo) throw fail('BAD_ENTRY', `${entry} has no fixed payee in this manifest`);
        destination = plan.payTo.address;
    } else if (WHERE[entry] === 'self') {
        destination = manifest.address;
    } else {
        if (!airlockAddress) throw fail('BAD_ENTRY', 'open needs the airlock address');
        if (plan.payTo) throw fail('BAD_ENTRY', 'open was expected to pay a script hash');
        // the vault's own script names the airlock by hash; the address given must be that hash
        const arg = (manifest.constructorArgs || []).find(a => a.name === 'airlockHash');
        const decoded = K.scriptPublicKey(airlockAddress).script;          // aa 20 <hash> 87
        if (!arg || decoded.length !== 35 || K.bytesToHex(decoded.slice(2, 34)) !== String(arg.value).toLowerCase()) {
            throw fail('BAD_ENTRY', `${airlockAddress} is not this vault's airlock`);
        }
        destination = airlockAddress;
    }

    const sigOpCount = Math.max(1, plan.sigOpCount);
    const dummyScript = ksm.signatureScript(plan, Object.fromEntries(plan.signaturesNeeded.map(n => [n, DUMMY_SIG])));
    const tx = K.newTx();
    tx.lockTime = BigInt(plan.lockTime);
    tx.inputs = coins.map(c => inputOf(c, sequence, sigOpCount, dummyScript));
    const entries = coins.map(entryOf);
    const total = sum(coins);

    // fee depends (through storage mass) on the output value: two passes settle it
    let fee = 0n;
    for (let pass = 0; pass < 3; pass++) {
        tx.outputs = [outputTo(destination, total - fee)];
        const next = K.feeFor(K.masses(tx, entries), feeRate);
        if (next === fee) break;
        fee = next;
    }
    tx.outputs = [outputTo(destination, total - fee)];
    if (fee > MAX_FEE) throw fail('TOO_HEAVY', `this spend needs a ${K.kasStr(fee)} KAS fee, the contract allows ${K.kasStr(MAX_FEE)}; use fewer coins`, { fee });
    if (total - fee <= 0n) throw fail('DUST', 'the coins do not cover the fee');
    const m = K.masses(tx, entries);
    if (m.compute > K.MAX_SAFE_MASS || m.storage > K.MAX_SAFE_MASS) throw fail('TOO_HEAVY', 'transaction too heavy');
    for (const i of tx.inputs) i.signatureScript = '';
    return { kind: 'covenant', tx, entries, plan, fee, amountOut: total - fee, destination, entry, manifest };
}

/** How many coins of `amount` one spend can carry (worst case: large coins, so storage mass is small). */
export function capacity({ manifest, entry, feeRate, airlockAddress }) {
    const spk = K.scriptPublicKey(manifest.address);
    let best = 0;
    for (let n = 1; n <= (entry === 'release' ? 1 : MAX_COVENANT_INPUTS); n++) {
        const coins = Array.from({ length: n }, (_, i) => ({ txid: i.toString(16).padStart(64, '0'), index: 0, amount: 100000n * K.SOMPI_PER_KAS, blockDaaScore: 0n, spk }));
        try { covenantSpend({ manifest, entry, coins, daa: 10n ** 12n, feeRate, airlockAddress }); best = n; }
        catch (e) { if (e.code === 'TOO_HEAVY') break; throw e; }
    }
    return best;
}

/** Split coins into spends that each fit (largest first, so the big ones move first). */
export function batches(coins, perSpend) {
    if (!(perSpend >= 1)) throw fail('TOO_HEAVY', 'not even one coin fits inside MAX_FEE at this fee rate');
    const sorted = [...coins].sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1));
    const out = [];
    for (let i = 0; i < sorted.length; i += perSpend) out.push(sorted.slice(i, i + perSpend));
    return out;
}

// ---------- plain payments from the hot wallet ----------
/**
 * @param coins       the hot wallet's coins
 * @param from        the hot wallet's address (change goes back here)
 * @param to          destination address (the vault address for a deposit)
 * @param amount      BigInt sompi to deliver, or `all: true` to send everything minus the fee
 */
export function payment({ coins, from, to, amount, all, feeRate }) {
    const fromSpk = K.bytesToHex(K.scriptPublicKey(from).script);
    const usable = coins.filter(c => K.bytesToHex(c.spk.script) === fromSpk && !c.isCoinbase);
    if (!usable.length) throw fail('NO_COINS', 'the wallet is empty');
    const sorted = [...usable].sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1));
    const dummy = K.p2pkSignatureScript(DUMMY_SIG);

    const build = (picked, outputs) => {
        const tx = K.newTx();
        tx.inputs = picked.map(c => inputOf(c, 0n, 1, dummy));
        tx.outputs = outputs;
        return { tx, entries: picked.map(entryOf) };
    };

    if (all) {
        const picked = sorted.slice(0, MAX_PAYMENT_INPUTS);
        const total = sum(picked);
        let fee = 0n;
        for (let pass = 0; pass < 3; pass++) {
            const { tx, entries } = build(picked, [outputTo(to, total - fee)]);
            const next = K.feeFor(K.masses(tx, entries), feeRate);
            if (next === fee) break;
            fee = next;
        }
        if (total - fee <= 0n) throw fail('DUST', 'the wallet does not cover the fee');
        const { tx, entries } = build(picked, [outputTo(to, total - fee)]);
        return finishPayment(tx, entries, fee, total - fee, to, sorted.length > picked.length);
    }

    const want = BigInt(amount);
    if (!(want > 0n)) throw fail('AMOUNT', 'amount must be positive');
    for (let n = 1; n <= Math.min(sorted.length, MAX_PAYMENT_INPUTS); n++) {
        const picked = sorted.slice(0, n);
        const total = sum(picked);
        if (total <= want) continue;
        let fee = 0n, ok = false;
        for (let pass = 0; pass < 4; pass++) {
            const change = total - want - fee;
            if (change < MIN_CHANGE) break;
            const { tx, entries } = build(picked, [outputTo(to, want), outputTo(from, change)]);
            const next = K.feeFor(K.masses(tx, entries), feeRate);
            if (next === fee) { ok = true; break; }
            fee = next;
        }
        const change = total - want - fee;
        if (ok && change >= MIN_CHANGE) {
            const { tx, entries } = build(picked, [outputTo(to, want), outputTo(from, change)]);
            return finishPayment(tx, entries, fee, want, to, false);
        }
    }
    const max = (() => { try { return payment({ coins, from, to, all: true, feeRate }).amountOut; } catch (e) { return 0n; } })();
    throw fail('AMOUNT', `that leaves less than ${K.kasStr(MIN_CHANGE)} KAS behind; send at most ${K.kasStr(max > MIN_CHANGE ? max - MIN_CHANGE : 0n)} KAS, or everything`, { max });
}

function finishPayment(tx, entries, fee, amountOut, to, partial) {
    const m = K.masses(tx, entries);
    if (m.compute > K.MAX_SAFE_MASS || m.storage > K.MAX_SAFE_MASS) throw fail('TOO_HEAVY', 'too many small coins; consolidate first');
    for (const i of tx.inputs) i.signatureScript = '';
    return { kind: 'payment', tx, entries, fee, amountOut, destination: to, partial };
}

// ---------- signing ----------
/** A signer from a raw private key (hex). Any object with the same shape works: an extension, a hardware wallet. */
export function keySigner(privHex) {
    const pub = K.xOnlyPublicKey(privHex);
    return { publicKey: pub, sign: async (sighash) => K.schnorrSign(sighash, privHex) };
}

/**
 * Sign a built transaction. `signers`: for a covenant spend, { sigParamName: signer } (hotSig,
 * guardianSig); for a payment, one signer. Every signature is verified against the key the
 * contract (or the coin) names before it goes into the transaction.
 * Returns the finished tx (ready for provider.submit) and its id.
 */
export async function sign(built, signers) {
    const { tx, entries } = built;
    const out = { ...tx, inputs: tx.inputs.map(i => ({ ...i })) };
    if (built.kind === 'payment') {
        const s = signers && signers.sign ? signers : null;
        if (!s) throw fail('SIGNER', 'a payment needs one signer');
        for (let i = 0; i < out.inputs.length; i++) {
            const h = K.signatureHash(out, entries, i);
            const sig = normSig(await s.sign(h, { inputIndex: i, kind: 'payment' }));
            const pk = K.bytesToHex(entries[i].spk.script.slice(1, 33));
            if (!K.schnorrVerify(sig, h, pk)) throw fail('SIGNER', `the signature for input ${i} does not match the coin's key`);
            out.inputs[i].signatureScript = K.p2pkSignatureScript(sig);
        }
    } else {
        const plan = built.plan;
        const named = {};
        for (const s of (built.manifest.entries.find(e => e.name === built.entry).signers || [])) named[s.sig] = s.pubkey;
        for (let i = 0; i < out.inputs.length; i++) {
            const h = K.signatureHash(out, entries, i);
            const sigs = {};
            for (const name of plan.signaturesNeeded) {
                const s = signers && signers[name];
                if (!s) throw fail('SIGNER', `no signer for ${name}`);
                const sig = normSig(await s.sign(h, { inputIndex: i, kind: built.entry, param: name }));
                if (named[name] && !K.schnorrVerify(sig, h, named[name])) throw fail('SIGNER', `${name}: the signature does not match the key the contract names`);
                sigs[name] = sig;
            }
            out.inputs[i].signatureScript = ksm.signatureScript(plan, sigs);
        }
    }
    return { tx: out, txid: K.transactionId(out), fee: built.fee, amountOut: built.amountOut, destination: built.destination };
}

function normSig(s) {
    const h = String(s && s.signature ? s.signature : s).toLowerCase().replace(/^0x/, '');
    if (/^41[0-9a-f]{130}$/.test(h)) return h.slice(2);
    if (/^[0-9a-f]{130}$/.test(h)) return h;
    if (/^[0-9a-f]{128}$/.test(h)) return h + '01';
    throw fail('SIGNER', 'unexpected signature shape');
}
