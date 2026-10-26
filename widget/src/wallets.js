// Browser-extension wallets the user may already have: Kasware, Kastle, Kaspire. Used for two
// things only: proving the backup wallet is theirs (it signs a short note; nothing moves), and
// "Add money from Kasware" (the extension shows its own send screen).
//
// The signature is checked here (core/wallet.js proveAddress), so what an extension says its
// address is only has to agree with the key that signed, never to be trusted.

import { proveAddress, pubkeyFromAddress } from '../../core/wallet.js';

export const WALLETS = [
    { id: 'kasware', name: 'Kasware', color: '#1fb8a0', present: () => !!(globalThis.kasware && typeof globalThis.kasware.signMessage === 'function') },
    { id: 'kastle', name: 'Kastle', color: '#0ea5e9', present: () => !!(globalThis.kastle && typeof globalThis.kastle.signMessage === 'function') },
    { id: 'kaspire', name: 'Kaspire', color: '#111827', present: () => !!(globalThis.kaspire && globalThis.kaspire.isKaspire === true && typeof globalThis.kaspire.request === 'function') }
];

const withPrefix = a => (typeof a === 'string' && a && !a.includes(':') ? 'kaspa:' + a : a);
const sigOf = r => (r && typeof r === 'object' ? (r.signature || r.sig || null) : r);
const kaspire = (method, params) => globalThis.kaspire.request(params === undefined ? { method } : { method, params });

async function signWith(id, message, network) {
    if (id === 'kasware') {
        const w = globalThis.kasware;
        const accounts = await w.requestAccounts();
        const address = withPrefix(Array.isArray(accounts) ? accounts[0] : null);
        let publicKey = null;
        try { publicKey = await w.getPublicKey(); } catch (e) { publicKey = null; }
        const signature = sigOf(await w.signMessage(message));
        return { address, publicKey: publicKey || pubkeyFromAddress(address), signature };
    }
    if (id === 'kastle') {
        const w = globalThis.kastle;
        await w.connect(network === 'mainnet' ? 'mainnet' : network);
        const acc = await w.getAccount();
        const address = withPrefix(acc && (typeof acc === 'string' ? acc : acc.address));
        const signature = sigOf(await w.signMessage(message));
        return { address, publicKey: (acc && typeof acc === 'object' && (acc.publicKey || acc.pubkey)) || pubkeyFromAddress(address), signature };
    }
    if (id === 'kaspire') {
        let accounts = null;
        try { accounts = await kaspire('getAccounts'); } catch (e) { accounts = null; }
        if (!accounts || !accounts.length) accounts = await kaspire('requestAccounts');
        const address = accounts && accounts[0];
        if (typeof address !== 'string' || !address.includes(':')) throw new Error('Switch Kaspire to the right network and try again');
        const signature = sigOf(await kaspire('signMessage', { address, message }));
        return { address, publicKey: pubkeyFromAddress(address), signature };
    }
    throw new Error('Unknown wallet');
}

/** Ask an extension to sign `message`; returns its proven address. Throws a readable Error. */
export async function proveWith(id, message, network = 'mainnet') {
    const w = WALLETS.find(x => x.id === id);
    if (!w || !w.present()) throw new Error(`${w ? w.name : 'That wallet'} is not installed in this browser`);
    let got;
    try { got = await signWith(id, message, network); }
    catch (e) {
        const m = String((e && e.message) || e || '');
        throw new Error(/reject|denied|cancel|user/i.test(m) ? `You closed the ${w.name} window before signing. Try again when you are ready.` : (m || `${w.name} did not answer`));
    }
    if (!got.signature) throw new Error(`${w.name} did not return a signature`);
    try { return proveAddress({ ...got, message, network }); }
    catch (e) { throw new Error(`${w.name}: ${e.message}`); }
}

/** Kasware's own send screen, if it is installed. Resolves with its txid (or whatever it returns). */
export function canSendFrom() { return WALLETS.filter(w => w.id === 'kasware' && w.present()); }
export async function sendFrom(id, to, sompi) {
    if (id !== 'kasware' || !globalThis.kasware || typeof globalThis.kasware.sendKaspa !== 'function') throw new Error('Kasware is not installed in this browser');
    if (BigInt(sompi) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('That amount is too large to send from Kasware in one go');
    return globalThis.kasware.sendKaspa(to, Number(sompi));
}
