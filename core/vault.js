// core/vault.js - one vault, as a wallet or a page uses it.
//
//   const v = new VaultClient({ vault, airlock }, { provider })
//   await v.snapshot()                       balances, what is waiting, when it lands
//   await v.deposit({ signer, amount })      hot wallet -> vault (or { all: true })
//   await v.withdraw({ signer, coins })      vault -> airlock, batched to fit the contract's fee cap
//   await v.release()                        every airlock coin past its delay -> hot wallet (no key)
//   await v.merge({ signer })                fold many small vault coins into fewer
//   await v.sendFromHot({ signer, to, amount | all })   spend released money
//   await v.evacuate({ guardian }) / v.rescue({ guardian })   the watcher's two paths
//
// `signer` is anything with sign(sighash) -> 64/65-byte Schnorr signature hex: keySigner(privHex)
// from core/spend.js, or a wallet's own. The client never sees a key it is not handed.

import * as K from './kaspa.js';
import * as S from './spend.js';
import { check, describe } from './contracts.js';

function fail(code, message, extra) { const e = new Error(message); e.code = code; Object.assign(e, extra || {}); return e; }
const sum = list => list.reduce((a, c) => a + BigInt(c.amount), 0n);

export class VaultClient {
    constructor({ vault, airlock }, { provider, feeRate } = {}) {
        if (!provider) throw new Error('a provider is required (core/provider.js restProvider, or your own)');
        check({ airlock, vault });
        this.manifests = { vault, airlock };
        this.info = describe({ vault, airlock });
        this.provider = provider;
        this.fixedFeeRate = feeRate != null ? BigInt(feeRate) : null;
    }

    async feeRate() { return this.fixedFeeRate != null ? this.fixedFeeRate : this.provider.feeRate(); }

    /** Everything a page shows. Reads three addresses and the DAA score; changes nothing. */
    async snapshot() {
        const { vaultAddress, airlockAddress, hotAddress } = this.info;
        const [coins, daa] = await Promise.all([this.provider.coins([vaultAddress, airlockAddress, hotAddress]), this.provider.virtualDaa()]);
        const at = a => coins.filter(c => c.address === a);
        const vaultCoins = at(vaultAddress), airlockCoins = at(airlockAddress), hotCoins = at(hotAddress);
        const delay = BigInt(this.info.delayDaa);
        const pending = airlockCoins.map(c => {
            const releaseAtDaa = BigInt(c.blockDaaScore) + delay + S.SEQ_MARGIN_DAA;
            const left = releaseAtDaa > daa ? releaseAtDaa - daa : 0n;
            return { coin: c, amount: c.amount, releaseAtDaa, readyInDaa: left, ready: left === 0n, etaMs: Number(left) * 100 };
        }).sort((a, b) => (a.releaseAtDaa < b.releaseAtDaa ? -1 : 1));
        return {
            daa, vaultCoins, airlockCoins, hotCoins, pending,
            balances: { vault: sum(vaultCoins), pending: sum(airlockCoins), hot: sum(hotCoins), protected: sum(vaultCoins) + sum(airlockCoins) }
        };
    }

    /** How many coins one withdrawal transaction can carry right now. */
    async openCapacity() {
        return S.capacity({ manifest: this.manifests.vault, entry: 'open', feeRate: await this.feeRate(), airlockAddress: this.info.airlockAddress });
    }

    async deposit({ signer, amount, all, hotCoins }) {
        const coins = hotCoins || await this.provider.coins([this.info.hotAddress]);
        const built = S.payment({ coins, from: this.info.hotAddress, to: this.info.vaultAddress, amount: amount != null ? BigInt(amount) : undefined, all, feeRate: await this.feeRate() });
        const signed = await S.sign(built, signer);
        const txid = await this.provider.submit(signed.tx, signed.entries);
        return { txid, amount: signed.amountOut, fee: signed.fee };
    }

    /**
     * Start a withdrawal. `coins`: vault coins to take out (default: all of them). Whole coins
     * move; whatever is taken out lands in the hot wallet after the delay, all of it.
     * Returns { started: [{ txid, amount, fee, coins }], failed: [{ coins, error, code }] }.
     */
    async withdraw({ signer, coins }) {
        const snap = coins ? null : await this.snapshot();
        const list = coins || snap.vaultCoins;
        if (!list.length) throw fail('NO_COINS', 'the vault is empty');
        const daa = snap ? snap.daa : await this.provider.virtualDaa();
        const feeRate = await this.feeRate();
        const cap = S.capacity({ manifest: this.manifests.vault, entry: 'open', feeRate, airlockAddress: this.info.airlockAddress });
        const started = [], failed = [];
        for (const group of S.batches(list, cap)) {
            try {
                const built = S.covenantSpend({ manifest: this.manifests.vault, entry: 'open', coins: group, daa, feeRate, airlockAddress: this.info.airlockAddress });
                const signed = await S.sign(built, { hotSig: signer });
                const txid = await this.provider.submit(signed.tx, signed.entries);
                started.push({ txid, amount: signed.amountOut, fee: signed.fee, coins: group });
            } catch (e) { failed.push({ coins: group, error: e.message, code: e.code }); }
        }
        return { started, failed };
    }

    /** Pick vault coins covering `amount` (fewest coins, largest first). The rest stays in. */
    static pickCoins(vaultCoins, amount) {
        const want = BigInt(amount);
        const sorted = [...vaultCoins].sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1));
        const out = [];
        let got = 0n;
        for (const c of sorted) { if (got >= want) break; out.push(c); got += BigInt(c.amount); }
        if (got < want) throw fail('AMOUNT', 'the vault holds less than that');
        return out;
    }

    /** Release every airlock coin whose delay has passed. Needs no key: anyone may push it. */
    async release() {
        const snap = await this.snapshot();
        const feeRate = await this.feeRate();
        const done = [], waiting = [], failed = [];
        for (const p of snap.pending) {
            if (!p.ready) { waiting.push(p); continue; }
            try {
                const built = S.covenantSpend({ manifest: this.manifests.airlock, entry: 'release', coins: [p.coin], daa: snap.daa, feeRate });
                const signed = await S.sign(built, {});
                done.push({ txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, coin: p.coin });
            } catch (e) {
                if (e.code === 'SPENT') continue;            // someone (the watcher, another tab) released it first
                failed.push({ coin: p.coin, error: e.message, code: e.code });
            }
        }
        return { released: done, waiting, failed };
    }

    async merge({ signer }) {
        const snap = await this.snapshot();
        if (snap.vaultCoins.length < 2) return { merged: [], failed: [] };
        const feeRate = await this.feeRate();
        const cap = S.capacity({ manifest: this.manifests.vault, entry: 'merge', feeRate });
        const merged = [], failed = [];
        for (const group of S.batches(snap.vaultCoins, cap)) {
            if (group.length < 2) continue;
            try {
                const built = S.covenantSpend({ manifest: this.manifests.vault, entry: 'merge', coins: group, daa: snap.daa, feeRate });
                const signed = await S.sign(built, { hotSig: signer });
                merged.push({ txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, coins: group });
            } catch (e) { failed.push({ coins: group, error: e.message, code: e.code }); }
        }
        return { merged, failed };
    }

    async sendFromHot({ signer, to, amount, all }) {
        const coins = await this.provider.coins([this.info.hotAddress]);
        const built = S.payment({ coins, from: this.info.hotAddress, to, amount: amount != null ? BigInt(amount) : undefined, all, feeRate: await this.feeRate() });
        const signed = await S.sign(built, signer);
        return { txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, fee: signed.fee };
    }

    // ---- the guardian's paths (the watcher calls these; the contracts only let them pay the backup wallet) ----
    async rescue({ guardian }) { return this._guardian('rescue', this.manifests.airlock, 'airlockCoins', guardian); }
    async evacuate({ guardian }) { return this._guardian('evacuate', this.manifests.vault, 'vaultCoins', guardian); }
    /** Both, airlock first (money already on its way out is the urgent part). */
    async emergency({ guardian }) {
        const a = await this.rescue({ guardian });
        const b = await this.evacuate({ guardian });
        return { moved: [...a.moved, ...b.moved], failed: [...a.failed, ...b.failed] };
    }
    async _guardian(entry, manifest, which, guardian) {
        const snap = await this.snapshot();
        const coins = snap[which];
        const feeRate = await this.feeRate();
        const cap = S.capacity({ manifest, entry, feeRate });
        const moved = [], failed = [];
        for (const group of S.batches(coins, cap || 1)) {
            try {
                const built = S.covenantSpend({ manifest, entry, coins: group, daa: snap.daa, feeRate });
                if (built.destination !== this.info.rescueAddress) throw fail('BAD_ENTRY', `${entry} would pay ${built.destination}, not the backup wallet`);
                const signed = await S.sign(built, { guardianSig: guardian });
                moved.push({ entry, txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, coins: group });
            } catch (e) {
                if (e.code === 'SPENT') continue;
                failed.push({ entry, coins: group, error: e.message, code: e.code });
            }
        }
        return { moved, failed };
    }
}
