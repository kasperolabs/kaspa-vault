#!/usr/bin/env node
// test/lifecycle.js - a vault's whole life through VaultClient, on a simulated chain.
//
// The simulated node is strict where it matters: an input must exist and be unspent, every
// signature in a covenant input is checked against the key the contract names, a sequence lock must
// have matured (coin DAA + sequence <= virtual DAA), fees are recomputed and must meet the relay
// floor, and outputs must follow the path's rules. Then it applies the transaction like a chain:
// inputs gone, outputs appear at the current DAA. The consensus fixtures (test/engine) are what prove
// the bytes; this proves the client logic: batching, timing, who can move what, and balances.

import crypto from 'crypto';
import * as K from '../core/kaspa.js';
import * as S from '../core/spend.js';
import { buildVault, describe } from '../core/contracts.js';
import { VaultClient } from '../core/vault.js';
import { makeCard, openCard } from '../core/card.js';

let pass = 0, fail = 0;
const ok = (c, what) => { if (c) pass++; else { fail++; console.error('FAIL ' + what); } };

const NET = 'mainnet';
const keys = () => { const priv = K.randomPrivateKey(); return { priv, pub: K.xOnlyPublicKey(priv) }; };
const hot = keys(), guardian = keys(), rescue = keys(), thief = keys();
const DELAY = 3000n;                                   // five minutes, like Kasla's first test rounds

function simChain() {
    const utxos = new Map();          // "txid:index" -> coin
    let daa = 1000000n;
    const ledger = [];
    const key = c => `${c.txid}:${c.index}`;
    return {
        advance(n) { daa += BigInt(n); },
        fund(address, kas) {
            const c = { address, txid: crypto.randomBytes(32).toString('hex'), index: 0, amount: K.kasToSompi(String(kas)), blockDaaScore: daa, spk: K.scriptPublicKey(address) };
            utxos.set(key(c), c);
            return c;
        },
        ledger,
        provider: {
            name: 'sim',
            async coins(addresses) { return [...utxos.values()].filter(c => addresses.includes(c.address)).map(c => ({ ...c })); },
            async virtualDaa() { return daa; },
            async feeRate() { return K.MIN_RELAY_FEE_PER_GRAM; },
            async submit(tx) {
                const entries = tx.inputs.map(i => {
                    const c = utxos.get(`${i.txid}:${i.index}`);
                    if (!c) { const e = new Error('missing outpoint'); e.code = 'SPENT'; throw e; }
                    if (i.sequence > 0n && c.blockDaaScore + i.sequence > daa) { const e = new Error('sequence lock conditions were not met'); e.code = 'SEQUENCE_LOCK'; throw e; }
                    return { amount: c.amount, spk: c.spk, blockDaaScore: c.blockDaaScore, coin: c };
                });
                // P2PK inputs: the signature must verify for the coin's key
                tx.inputs.forEach((inp, i) => {
                    const s = entries[i].spk.script;
                    if (s.length === 34 && s[0] === 0x20) {
                        const sig = inp.signatureScript.slice(2);
                        if (!K.schnorrVerify(sig, K.signatureHash(tx, entries, i), K.bytesToHex(s.slice(1, 33)))) throw new Error(`bad signature on input ${i}`);
                    }
                });
                const fee = entries.reduce((a, e) => a + e.amount, 0n) - tx.outputs.reduce((a, o) => a + o.value, 0n);
                if (fee < K.masses(tx, entries).relay * K.MIN_RELAY_FEE_PER_GRAM) throw new Error('fee below the relay floor');
                const id = K.transactionId(tx);
                for (const i of tx.inputs) utxos.delete(`${i.txid}:${i.index}`);
                tx.outputs.forEach((o, index) => {
                    const addr = [...new Set([...entries.map(e => e.coin.address), ...ADDRS])].find(a => K.bytesToHex(K.scriptPublicKey(a).script) === K.bytesToHex(o.spk.script)) || 'external';
                    utxos.set(`${id}:${index}`, { address: addr, txid: id, index, amount: o.value, blockDaaScore: daa, spk: o.spk });
                });
                ledger.push({ id, fee, from: entries.map(e => e.coin.address), outs: tx.outputs.length });
                return id;
            }
        },
        balance(address) { return [...utxos.values()].filter(c => c.address === address).reduce((a, c) => a + c.amount, 0n); },
        count(address) { return [...utxos.values()].filter(c => c.address === address).length; }
    };
}

const built = buildVault({ hot: hot.pub, guardian: guardian.pub, rescue: rescue.pub, delayDaa: DELAY.toString(), network: NET });
const info = describe(built);
const thiefAddr = K.p2pkAddress(NET, thief.pub);
const ADDRS = [info.vaultAddress, info.airlockAddress, info.hotAddress, info.rescueAddress, thiefAddr];
const chain = simChain();
const v = new VaultClient(built, { provider: chain.provider });
const hotS = S.keySigner(hot.priv), guardS = S.keySigner(guardian.priv), thiefS = S.keySigner(thief.priv);

// ---- the card brings the same vault back ----
const card = makeCard({ ...built, watcher: { url: 'https://watch.example' } });
const reopened = openCard(JSON.parse(JSON.stringify(card)));
ok(reopened.info.vaultAddress === info.vaultAddress && reopened.info.airlockAddress === info.airlockAddress, 'card reopens the same vault');
const tampered = JSON.parse(JSON.stringify(card)); tampered.keys.rescue = thief.pub;
try { openCard(tampered); ok(false, 'tampered card accepted'); } catch (e) { ok(/does not add up/.test(e.message), 'tampered card refused'); }

// ---- fund the hot wallet, deposit five times ----
chain.fund(info.hotAddress, 1000);
for (const kas of ['100', '50', '25', '10', '5']) await v.deposit({ signer: hotS, amount: K.kasToSompi(kas) });
let snap = await v.snapshot();
ok(snap.vaultCoins.length === 5 && snap.balances.vault === K.kasToSompi('190'), `five deposits in the vault (${K.kasStr(snap.balances.vault)})`);
const hotAfterDeposits = snap.balances.hot;

// ---- a thief with the wrong key cannot deposit from or withdraw out of this vault ----
const tw = await v.withdraw({ signer: thiefS });          // withdraw reports refused batches, it does not throw
ok(tw.started.length === 0 && tw.failed.length > 0 && tw.failed.every(f => f.code === 'SIGNER'), 'thief key cannot sign a withdrawal (refused before anything is sent)');
snap = await v.snapshot();
ok(snap.balances.vault === K.kasToSompi('190') && snap.airlockCoins.length === 0, 'nothing moved after the thief tried');

// ---- withdraw everything: five coins, open capacity 3 -> two transactions ----
const cap = await v.openCapacity();
const w = await v.withdraw({ signer: hotS });
ok(w.failed.length === 0, `withdrawal batches all started (${w.failed.map(f => f.error).join('; ')})`);
ok(w.started.length === Math.ceil(5 / cap), `five coins went out in ${w.started.length} transaction(s) at capacity ${cap}`);
snap = await v.snapshot();
ok(snap.vaultCoins.length === 0 && snap.airlockCoins.length === w.started.length, 'vault empty, coins waiting in the airlock');

// ---- release too early: nothing moves ----
chain.advance(DELAY - 1n);
let r = await v.release();
ok(r.released.length === 0 && r.waiting.length === w.started.length, 'nothing releases before the delay');
chain.advance(1n + S.SEQ_MARGIN_DAA);
r = await v.release();
ok(r.released.length === w.started.length && r.failed.length === 0, `all ${r.released.length} airlock coins released after the delay`);
snap = await v.snapshot();
const fees = w.started.reduce((a, x) => a + x.fee, 0n) + r.released.reduce((a, x) => a + (x.coin.amount - x.amount), 0n);
ok(snap.balances.hot === hotAfterDeposits + K.kasToSompi('190') - fees, `hot wallet got 190 KAS back minus ${K.kasStr(fees)} KAS in fees`);

// ---- second round: deposit, a thief starts a withdrawal, the guardian rescues everything ----
await v.deposit({ signer: hotS, amount: K.kasToSompi('300') });
await v.deposit({ signer: hotS, amount: K.kasToSompi('200') });
snap = await v.snapshot();
const firstCoin = snap.vaultCoins.find(c => c.amount === K.kasToSompi('300'));
await v.withdraw({ signer: hotS, coins: [firstCoin] });       // the "attacker" (holding hot) starts one
chain.advance(100n);
const em = await v.emergency({ guardian: guardS });
ok(em.failed.length === 0 && em.moved.length === 2, `rescue + evacuate moved everything (${em.moved.map(m => m.entry).join(', ')})`);
ok(chain.balance(info.vaultAddress) === 0n && chain.balance(info.airlockAddress) === 0n, 'vault and airlock empty');
ok(chain.balance(info.rescueAddress) > K.kasToSompi('499.98'), `backup wallet holds ${K.kasStr(chain.balance(info.rescueAddress))} KAS`);
chain.advance(DELAY * 2n);
r = await v.release();
ok(r.released.length === 0, 'nothing left for a late release to steal');

// ---- the guardian can never pay itself: a guardian spend whose output was swapped is refused locally ----
await v.deposit({ signer: hotS, amount: K.kasToSompi('10') });
snap = await v.snapshot();
const ev = S.covenantSpend({ manifest: built.vault, entry: 'evacuate', coins: snap.vaultCoins, daa: snap.daa });
ok(ev.destination === info.rescueAddress, 'evacuate is built to the backup wallet only');

// ---- many small coins: merge folds them, withdraw still batches ----
for (let i = 0; i < 6; i++) await v.deposit({ signer: hotS, amount: K.kasToSompi('2') });
const before = chain.count(info.vaultAddress);
const m = await v.merge({ signer: hotS });
ok(m.failed.length === 0 && chain.count(info.vaultAddress) < before, `merge folded ${before} coins into ${chain.count(info.vaultAddress)}`);

// ---- spend released money onward ----
const out = await v.sendFromHot({ signer: hotS, to: thiefAddr, amount: K.kasToSompi('1') });
ok(chain.balance(thiefAddr) === K.kasToSompi('1'), `hot wallet paid 1 KAS onward (tx ${out.txid.slice(0, 12)})`);

console.log(`ledger: ${chain.ledger.length} transactions, total fees ${K.kasStr(chain.ledger.reduce((a, x) => a + x.fee, 0n))} KAS`);
console.log(`\n${fail ? 'FAILED' : 'PASSED'}: ${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
