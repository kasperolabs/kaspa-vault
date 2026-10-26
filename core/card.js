// core/card.js - the vault card: the smallest thing that finds a vault again.
//
// A card holds no secret. It names the network, the three public keys, the delay and the watcher.
// From it, buildVault() recomputes both covenants byte for byte, so the card plus the hot wallet's
// recovery words is a complete backup, and the card alone is enough for anyone (the user, a
// watcher, a "check my vault" page) to recompute and verify the addresses.
//
//   makeCard({ vault, airlock, watcher })    -> card object (save it as JSON)
//   openCard(card)                           -> { vault, airlock, info }  (throws if the card was altered)

import { buildVault, describe } from './contracts.js';

export const CARD_FORMAT = 'kaspa-vault-card/1';

export function makeCard({ vault, airlock, watcher }) {
    const info = describe({ vault, airlock });
    const arg = n => String(vault.constructorArgs.find(a => a.name === n).value);
    return {
        format: CARD_FORMAT,
        network: info.network,
        keys: { hot: arg('hot'), guardian: arg('guardian'), rescue: arg('rescue') },
        delayDaa: String(info.delayDaa),
        addresses: { vault: info.vaultAddress, airlock: info.airlockAddress, hot: info.hotAddress, rescue: info.rescueAddress },
        watcher: watcher ? { url: String(watcher.url || ''), name: watcher.name ? String(watcher.name) : undefined } : null,
        createdAt: new Date().toISOString()
    };
}

export function openCard(card) {
    const c = typeof card === 'string' ? JSON.parse(card) : card;
    if (!c || c.format !== CARD_FORMAT) throw new Error('not a vault card');
    const built = buildVault({ hot: c.keys.hot, guardian: c.keys.guardian, rescue: c.keys.rescue, delayDaa: c.delayDaa, network: c.network });
    const info = describe(built);
    // the stored addresses are informative; they must agree with what the keys produce
    if (c.addresses) {
        if (c.addresses.vault && c.addresses.vault !== info.vaultAddress) throw new Error('this card does not add up: its vault address is not what its keys produce');
        if (c.addresses.airlock && c.addresses.airlock !== info.airlockAddress) throw new Error('this card does not add up: its airlock address is not what its keys produce');
        if (c.addresses.rescue && c.addresses.rescue !== info.rescueAddress) throw new Error('this card does not add up: its backup wallet is not its rescue key');
    }
    return { ...built, info, watcher: c.watcher || null };
}

/** The two .ksm files, for kaspa-ksm's CLI or any other tool. */
export function manifestFiles({ vault, airlock }) {
    const short = a => a.split(':')[1].slice(0, 8);
    return [
        { name: `Vault-${short(vault.address)}.ksm`, text: JSON.stringify(vault, null, 2) },
        { name: `Airlock-${short(airlock.address)}.ksm`, text: JSON.stringify(airlock, null, 2) }
    ];
}


/**
 * The text a vault's hot key signs to ask a watcher to watch it (Kaspa personal-message signing,
 * core/kaspa.js signMessage). The watcher rebuilds the same text and checks the signature against
 * the card's hot key, so only whoever holds the vault's own key can register it, and only for the
 * watcher, vault, email and time written here.
 */
export function registrationMessage({ guardian, vaultAddress, email, time }) {
    return [
        'kaspa-vault: watch this vault',
        `watcher: ${String(guardian).toLowerCase()}`,
        `vault: ${String(vaultAddress).toLowerCase()}`,
        `email: ${String(email).trim().toLowerCase()}`,
        `time: ${time}`
    ].join('\n');
}
