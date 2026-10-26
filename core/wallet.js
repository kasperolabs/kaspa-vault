// core/wallet.js - the vault's own wallet, made in the browser on first contact.
//
// Twelve standard recovery words (BIP39, English) and the standard Kaspa path m/44'/111111'/0'/0/0,
// so the same words open the same wallet in Kasware, Kastle or Kaspium: nobody is locked into this
// page. The key is kept on the device encrypted with the user's password (PBKDF2-SHA256 and
// AES-GCM from WebCrypto, which browsers and Node 18+ both have).
//
//   const words = newWords()                         12 words
//   wordsOk(words)                                   true / false (checksum and word list)
//   const w = walletFromWords(words)                 { privateKey, publicKey, address }
//   const box = await lock({ words }, password)      JSON-safe object for localStorage
//   const { words } = await unlock(box, password)    throws BAD_PASSWORD
//
// Checked against rusty-kaspa's own wallet tests (wallet/keys/src/derivation/gen1/hd.rs), see
// test/wallet.js.

import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512, sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import * as secp from '@noble/secp256k1';
import * as K from './kaspa.js';

const N = secp.Point.CURVE().n;
const HARD = 0x80000000;
export const KASPA_PATH = "m/44'/111111'/0'/0/0";

function fail(code, message) { const e = new Error(message); e.code = code; return e; }
const u32 = n => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const cat = (...a) => { const out = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };
const big = b => BigInt('0x' + (K.bytesToHex(b) || '0'));
const b32 = n => K.hexToBytes(n.toString(16).padStart(64, '0'));
const norm = words => String(words || '').trim().toLowerCase().split(/\s+/).join(' ');

// ---------- words ----------
export function newWords() { return generateMnemonic(wordlist, 128); }
export function wordsOk(words) { return validateMnemonic(norm(words), wordlist); }
export function wordList() { return wordlist; }

// ---------- BIP32 (private derivation only) ----------
export function masterKey(seed) {
    const I = hmac(sha512, new TextEncoder().encode('Bitcoin seed'), seed);
    const key = I.slice(0, 32), chain = I.slice(32);
    const k = big(key);
    if (k === 0n || k >= N) throw fail('BAD_SEED', 'unusable seed');
    return { key, chain, depth: 0, parentFp: new Uint8Array(4), index: 0 };
}

function fingerprint(key) { return ripemd160(sha256(secp.getPublicKey(key, true))).slice(0, 4); }

export function childKey(parent, index) {
    const hardened = index >= HARD;
    const data = hardened ? cat(new Uint8Array([0]), parent.key, u32(index)) : cat(secp.getPublicKey(parent.key, true), u32(index));
    const I = hmac(sha512, parent.chain, data);
    const il = big(I.slice(0, 32));
    if (il >= N) throw fail('BAD_CHILD', 'invalid child, use the next index');
    const k = (il + big(parent.key)) % N;
    if (k === 0n) throw fail('BAD_CHILD', 'invalid child, use the next index');
    return { key: b32(k), chain: I.slice(32), depth: parent.depth + 1, parentFp: fingerprint(parent.key), index };
}

export function derive(root, path) {
    const parts = String(path).split('/');
    if (parts.shift() !== 'm') throw fail('BAD_PATH', 'a path starts with m');
    return parts.reduce((k, p) => {
        const h = p.endsWith("'");
        const n = Number(h ? p.slice(0, -1) : p);
        if (!Number.isInteger(n) || n < 0 || n >= HARD) throw fail('BAD_PATH', `bad path step ${p}`);
        return childKey(k, h ? n + HARD : n);
    }, root);
}

// ---------- extended keys (kprv/xprv), for tests and for importing ----------
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58check(str) {
    let n = 0n;
    for (const c of str) { const v = B58.indexOf(c); if (v < 0) throw fail('BAD_KEY', 'not base58'); n = n * 58n + BigInt(v); }
    let hex = n.toString(16); if (hex.length % 2) hex = '0' + hex;
    const lead = str.match(/^1*/)[0].length;
    const raw = cat(new Uint8Array(lead), K.hexToBytes(hex));
    const body = raw.slice(0, -4), sum = raw.slice(-4);
    const check = sha256(sha256(body)).slice(0, 4);
    if (check.some((b, i) => b !== sum[i])) throw fail('BAD_KEY', 'checksum mismatch');
    return body;
}
/** An extended private key (kprv…, xprv…, ktrv…): 78 bytes, the key byte prefixed with 0. */
export function fromExtended(str) {
    const b = base58check(str);
    if (b.length !== 78 || b[45] !== 0) throw fail('BAD_KEY', 'not an extended private key');
    return { key: b.slice(46), chain: b.slice(13, 45), depth: b[4], parentFp: b.slice(5, 9), index: Number(big(b.slice(9, 13))) };
}

// ---------- the vault's wallet ----------
export function walletFromRoot(root, { network = 'mainnet', path = KASPA_PATH } = {}) {
    const k = derive(root, path);
    const privateKey = K.bytesToHex(k.key);
    return { privateKey, publicKey: K.xOnlyPublicKey(privateKey), address: K.addressOfKey(network, privateKey), path };
}
export function walletFromWords(words, opts = {}) {
    if (!wordsOk(words)) throw fail('BAD_WORDS', 'these recovery words are not valid');
    return walletFromRoot(masterKey(mnemonicToSeedSync(norm(words), opts.passphrase || '')), opts);
}

// ---------- the encrypted box on the device ----------
export const KDF_ITERATIONS = 600000;
const subtle = () => {
    const s = globalThis.crypto && globalThis.crypto.subtle;
    if (!s) throw fail('NO_CRYPTO', 'this browser has no WebCrypto (open the page over https)');
    return s;
};
const b64 = b => { let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function boxKey(password, salt, iterations) {
    const base = await subtle().importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Encrypt anything JSON (the words, the card) with a password. */
export async function lock(secret, password, { iterations = KDF_ITERATIONS } = {}) {
    if (!password || String(password).length < 8) throw fail('WEAK_PASSWORD', 'use at least 8 characters');
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await boxKey(password, salt, iterations);
    const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(secret))));
    return { format: 'kaspa-vault-box/1', kdf: 'PBKDF2-SHA256', iterations, salt: b64(salt), iv: b64(iv), data: b64(ct) };
}
export async function unlock(box, password) {
    if (!box || box.format !== 'kaspa-vault-box/1') throw fail('BAD_BOX', 'not a kaspa-vault box');
    const key = await boxKey(password, unb64(box.salt), box.iterations);
    try {
        const pt = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data));
        return JSON.parse(new TextDecoder().decode(pt));
    } catch (e) { throw fail('BAD_PASSWORD', 'wrong password'); }
}

// ---------- someone else's wallet proving an address is theirs ----------
const BECH = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
/** kaspa:q… (Schnorr, version 0) -> its 32-byte x-only key as hex; null for any other kind. */
export function pubkeyFromAddress(addr) {
    const s = String(addr || '').trim().toLowerCase();
    const i = s.indexOf(':');
    if (i < 0) return null;
    const body = s.slice(i + 1);
    if (body.length <= 8) return null;
    let bits = '';
    for (const ch of body.slice(0, -8)) { const v = BECH.indexOf(ch); if (v < 0) return null; bits += v.toString(2).padStart(5, '0'); }
    if (parseInt(bits.slice(0, 8), 2) !== 0) return null;
    const payload = bits.slice(8, 8 + 256);
    if (payload.length < 256) return null;
    let hex = '';
    for (let j = 0; j < 256; j += 8) hex += parseInt(payload.slice(j, j + 8), 2).toString(16).padStart(2, '0');
    return hex;
}
/** A wallet's message signature (hex or base64, 64 or 65 bytes) -> 128-hex, or null. */
export function signatureHex(sig) {
    const s = String(sig && typeof sig === 'object' ? (sig.signature || sig.sig || '') : sig || '').trim();
    if (/^[0-9a-f]{128}$/i.test(s)) return s.toLowerCase();
    if (/^[0-9a-f]{130}$/i.test(s)) return s.slice(0, 128).toLowerCase();
    try {
        const b = unb64(s);
        if (b.length === 64 || b.length === 65) return K.bytesToHex(b.slice(0, 64));
    } catch (e) { /* not base64 */ }
    return null;
}
/**
 * Check that `address` signed `message` (Kaspa personal-message signing, as Kasware, Kastle and
 * Kaspire do). Returns the address on success; throws PROOF otherwise.
 */
export function proveAddress({ address, publicKey, message, signature, network = 'mainnet' }) {
    let x = String(publicKey || '').trim().toLowerCase().replace(/^0x/, '');
    if (/^(02|03)[0-9a-f]{64}$/.test(x)) x = x.slice(2);
    if (!/^[0-9a-f]{64}$/.test(x)) x = pubkeyFromAddress(address);
    if (!x) throw fail('PROOF', 'pick a standard kaspa:q address in the wallet and try again');
    const own = K.p2pkAddress(network, x);
    if (address && String(address).trim().toLowerCase() !== own) throw fail('PROOF', 'the wallet address does not belong to the key it signed with');
    const sig = signatureHex(signature);
    if (!sig) throw fail('PROOF', 'the wallet returned a signature of an unexpected shape');
    if (!K.verifyMessage(message, sig, x)) throw fail('PROOF', 'the signature does not check out');
    return own;
}
