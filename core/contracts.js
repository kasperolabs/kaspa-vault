// core/contracts.js - a user's two covenants (Airlock, then Vault) as .ksm manifests, built from the
// templates with no compiler and no server.
//
//   buildVault({ hot, guardian, rescue, delayDaa, network })
//     -> { airlock, vault }   two verified .ksm manifests (kaspa-ksm format)
//
// The keys are 32-byte x-only public keys (hex). `hot` is the key that may start a withdrawal (the
// wallet this package generates for the user, or the host wallet's own key), `guardian` the
// watcher's key, `rescue` the user's backup wallet. A kaspa:q address is accepted for any of them
// and decoded to its key.
//
// Before anything is returned, the result is checked the way a watcher will check it: both
// manifests verify, the vault opens into this airlock, evacuate and rescue pay the backup wallet,
// release pays the hot key, the delay is the one asked for, the dispatch tags are the pinned ones.
// A template that ever produced anything else would throw here instead of creating a vault.

'use strict';

const ksm = require('kaspa-ksm');
const tpl = require('./template');
const TEMPLATES = require('../contracts/templates.json');

const NETWORKS = ['mainnet', 'testnet-10', 'testnet-11'];
const MIN_DELAY_DAA = 100n;                  // 10 seconds: tests only. Sites set their own floor (config.minDelayDaa)
const MAX_DELAY_DAA = 30n * 864000n;         // 30 days
const TAGS = {
    airlock_v2: { release: '7269c9c9', rescue: '66324211' },
    vault_v1: { open: '2426ad45', merge: '0d69ebd2', evacuate: '2e4f5118' }
};

function template(id) {
    const t = TEMPLATES.contracts[id];
    if (!t) throw new Error(`no template "${id}"`);
    return t;
}

/** "kaspa:q…" (Schnorr) or 64/66 hex -> 64-hex x-only key; throws otherwise. */
function keyOf(value, what) {
    const s = String(value == null ? '' : value).trim().toLowerCase();
    const k = ksm.address.pubkeyFromInput(/^(02|03)[0-9a-f]{64}$/.test(s) ? s.slice(2) : s);
    if (!k) throw new Error(`${what}: not a Kaspa Schnorr public key or kaspa:q address`);
    return k;
}

function manifestFrom(t, network, values, extensions) {
    const script = tpl.fill(t, values);
    // Same key order as kaspa-ksm's fromSilvercArtifact, so a template manifest and a compiled one
    // serialize identically (minus templateHash, a Blake3 field silverc adds that nothing verifies)
    const compiler = { name: 'silverc', version: t.compilerVersion || TEMPLATES.compiler.version };
    if (t.abiSchema != null) compiler.abiSchema = t.abiSchema;
    compiler.commit = TEMPLATES.compiler.commit;
    compiler.via = 'kaspa-vault template';
    return ksm.create({
        network,
        script,
        name: t.contractName,
        entries: t.entries.map(e => ({ name: e.name, dispatchTag: e.dispatchTag, params: e.params })),
        constructorArgs: t.params.map(p => ({ name: p.name, type: p.type, value: String(values[p.name]) })),
        source: { text: t.source, contract: t.contractName },
        compiler,
        extensions
    });
}

function checkTags(id, m) {
    for (const [entry, tag] of Object.entries(TAGS[id])) {
        const e = m.entries.find(x => x.name === entry);
        if (!e || !e.dispatch || e.dispatch.hex !== tag) throw new Error(`${id}: ${entry} tag is ${e && e.dispatch && e.dispatch.hex}, expected ${tag}`);
    }
}

function buildVault({ hot, guardian, rescue, delayDaa, network, extensions } = {}) {
    const net = network || 'mainnet';
    if (!NETWORKS.includes(net)) throw new Error(`network must be one of ${NETWORKS.join(', ')}`);
    const h = keyOf(hot, 'hot'), g = keyOf(guardian, 'guardian'), r = keyOf(rescue, 'rescue');
    if (h === g || h === r || g === r) throw new Error('hot, guardian and rescue must be three different keys');
    if (!/^\d+$/.test(String(delayDaa))) throw new Error('delayDaa must be a whole number of DAA');
    const delay = BigInt(String(delayDaa));
    if (delay < MIN_DELAY_DAA || delay > MAX_DELAY_DAA) throw new Error(`delayDaa must be between ${MIN_DELAY_DAA} and ${MAX_DELAY_DAA}`);

    const airlock = manifestFrom(template('airlock_v2'), net, { hot: h, guardian: g, rescue: r, delay: delay.toString() }, extensions);
    const vault = manifestFrom(template('vault_v1'), net, { hot: h, guardian: g, rescue: r, airlockHash: airlock.script.hash }, extensions);
    check({ airlock, vault, hot: h, guardian: g, rescue: r, delay });
    return { airlock, vault };
}

/**
 * The checks a watcher (or anyone) makes before trusting a pair. Throws with the first problem.
 * Exported so the watcher and the widget run the same code on manifests they did not build.
 */
function check({ airlock, vault, hot, guardian, rescue, delay }) {
    for (const [id, m] of [['airlock_v2', airlock], ['vault_v1', vault]]) {
        const r = ksm.verify(JSON.stringify(m));
        if (!r.ok) throw new Error(`${id}: manifest does not verify: ${r.errors.join('; ')}`);
        checkTags(id, m);
        if (!/^kaspa(test)?:p/.test(m.address)) throw new Error(`${id}: address is not P2SH`);
    }
    const arg = (m, n) => { const a = (m.constructorArgs || []).find(x => x.name === n); return a ? String(a.value).toLowerCase() : null; };
    if (arg(vault, 'airlockHash') !== airlock.script.hash) throw new Error('the vault does not open into this airlock');
    for (const m of [airlock, vault]) {
        if (hot && arg(m, 'hot') !== hot) throw new Error('hot key differs from the one asked for');
        if (guardian && arg(m, 'guardian') !== guardian) throw new Error('guardian key differs from the one asked for');
        if (rescue && arg(m, 'rescue') !== rescue) throw new Error('backup wallet differs from the one asked for');
    }
    if (arg(airlock, 'hot') !== arg(vault, 'hot') || arg(airlock, 'guardian') !== arg(vault, 'guardian') || arg(airlock, 'rescue') !== arg(vault, 'rescue')) {
        throw new Error('the two manifests name different keys');
    }
    const net = vault.network;
    const rescueAddr = ksm.p2pkAddress(net, arg(vault, 'rescue')), hotAddr = ksm.p2pkAddress(net, arg(vault, 'hot'));
    const pay = (m, e) => { const p = ksm.planSpend(m, e, {}).payTo; return p && p.address; };
    if (pay(vault, 'evacuate') !== rescueAddr) throw new Error('vault.evacuate does not pay the backup wallet');
    if (pay(airlock, 'rescue') !== rescueAddr) throw new Error('airlock.rescue does not pay the backup wallet');
    if (pay(airlock, 'release') !== hotAddr) throw new Error('airlock.release does not pay the hot key');
    const csv = ksm.planSpend(airlock, 'release', {}).sequence;
    if (delay != null && BigInt(csv) !== BigInt(delay)) throw new Error(`airlock delay is ${csv}, expected ${delay}`);
    if (arg(airlock, 'delay') !== BigInt(csv).toString()) throw new Error('airlock delay argument and script disagree');
    return true;
}

/** Facts a page shows, derived from the manifests (never from anything stored beside them). */
function describe({ airlock, vault }) {
    const arg = (m, n) => { const a = (m.constructorArgs || []).find(x => x.name === n); return a ? String(a.value).toLowerCase() : null; };
    const net = vault.network;
    return {
        network: net,
        vaultAddress: vault.address,
        airlockAddress: airlock.address,
        hotAddress: ksm.p2pkAddress(net, arg(vault, 'hot')),
        rescueAddress: ksm.p2pkAddress(net, arg(vault, 'rescue')),
        guardian: arg(vault, 'guardian'),
        delayDaa: ksm.planSpend(airlock, 'release', {}).sequence
    };
}

module.exports = { buildVault, check, describe, keyOf, TAGS, MIN_DELAY_DAA, MAX_DELAY_DAA, templates: TEMPLATES };
