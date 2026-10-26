// test/wallet.js - core/wallet.js against rusty-kaspa's own wallet tests and the BIP39/BIP32 vectors.
import * as W from '../core/wallet.js';
import * as K from '../core/kaspa.js';
import { mnemonicToSeedSync } from '@scure/bip39';

let pass = 0, failed = 0;
const ok = (c, m) => { if (c) { pass++; } else { failed++; console.log('FAIL ' + m); } };
const throwsCode = async (f, code, m) => { try { await f(); ok(false, m + ' (did not throw)'); } catch (e) { ok(e.code === code, `${m} (got ${e.code}: ${e.message})`); } };

// ---- rusty-kaspa wallet/keys/src/derivation/gen1/hd.rs: hd_wallet_gen1, receive addresses 0..2 at m/44'/111111'/0'/0/i
const master = W.fromExtended('kprv5y2qurMHCsXYrNfU3GCihuwG3vMqFji7PZXajMEqyBkNh9UZUJgoHYBLTKu1eM4MvUtomcXPQ3Sw9HZ5ebbM4byoUciHo1zrPJBQfqpLorQ');
const receive = ['kaspa:qz7ulu4c25dh7fzec9zjyrmlhnkzrg4wmf89q7gzr3gfrsj3uz6xjellj43pf', 'kaspa:qzn3qjzf2nzyd3zj303nk4sgv0aae42v3ufutk5xsxckfels57dxjjed4qvlx', 'kaspa:qpakxqlesqywgkq7rg4wyhjd93kmw7trkl3gpa3vd5flyt59a43yyjp28qsku'];
const change0 = 'kaspa:qrqrnyzdwh9ec2q05guzy3vv33f86nvdyw52qwlmk0mewzx3dgdss3pmcd692';
receive.forEach((a, i) => ok(W.walletFromRoot(master, { path: `m/44'/111111'/0'/0/${i}` }).address === a, `rusty-kaspa receive address ${i}`));
ok(W.walletFromRoot(master, { path: "m/44'/111111'/0'/1/0" }).address === change0, 'rusty-kaspa change address 0');
ok(W.walletFromRoot(master).address === receive[0], 'the default path is the first receive address');

// ---- rusty-kaspa wallet_from_mnemonic: 24 words -> this master key (kprv), so seed + master match
const words24 = 'fringe ceiling crater inject pilot travel gas nurse bulb bullet horn segment snack harbor dice laugh vital cigar push couple plastic into slender worry';
const m24 = W.masterKey(mnemonicToSeedSync(words24, ''));
const want = W.fromExtended('kprv5y2qurMHCsXYrpeDB395BY2DPKYHUGaCMpFAYRi1cmhwin1bWRyUXVbtTyy54FCGxPnnEvbK9WaiaQgkGS9ngGxmHy1bubZYY6MTokeYP2Q');
ok(K.bytesToHex(m24.key) === K.bytesToHex(want.key) && K.bytesToHex(m24.chain) === K.bytesToHex(want.chain), 'rusty-kaspa: 24 words give the same master key and chain code');
ok(W.wordsOk(words24), '24 standard words pass the checksum');

// ---- BIP32 test vector 1 (seed 000102…0f): m/0'/1/2'/2/1000000000
const v1 = W.masterKey(K.hexToBytes('000102030405060708090a0b0c0d0e0f'));
ok(K.bytesToHex(v1.key) === 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35', 'BIP32 vector 1 master key');
ok(K.bytesToHex(W.derive(v1, "m/0'/1/2'/2/1000000000").key) === '471b76e389e528d6de6d816857e012c5455051cad6660850e58372a6c3e6e7c8', 'BIP32 vector 1 m/0H/1/2H/2/1000000000');
ok(K.bytesToHex(W.fromExtended('xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76').key) ===
    K.bytesToHex(W.derive(v1, "m/0'/1/2'/2/1000000000").key), 'BIP32 vector 1 extended key decodes to the derived key');

// ---- BIP39 vector: abandon ×11 about, passphrase TREZOR
ok(K.bytesToHex(mnemonicToSeedSync('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', 'TREZOR')).startsWith('c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e5349553'), 'BIP39 vector seed');

// ---- new words
const a = W.newWords(), b = W.newWords();
ok(a.split(' ').length === 12 && a !== b && W.wordsOk(a), 'new words: 12, valid, different each time');
// one word changed: the checksum catches it unless the new word happens to fit (1 in 16); count over many
const wl = W.wordList(); let caught = 0;
for (let i = 0; i < 64; i++) { const ws = a.split(' '); ws[i % 12] = wl[(wl.indexOf(ws[i % 12]) + 1 + i) % 2048]; if (!W.wordsOk(ws.join(' '))) caught++; }
ok(caught >= 48, `a mistyped word is caught by the checksum (${caught}/64)`);
ok(W.walletFromWords('  ' + a.toUpperCase().replace(/ /g, '   ') + ' ').address === W.walletFromWords(a).address, 'words are read case- and space-insensitively');
ok(W.walletFromWords(a, { network: 'testnet-10' }).address.startsWith('kaspatest:'), 'testnet addresses');
await throwsCode(() => W.walletFromWords('abandon abandon abandon'), 'BAD_WORDS', 'too few words refused');
const w = W.walletFromWords(a);
ok(K.addressOfKey('mainnet', w.privateKey) === w.address && w.publicKey === K.xOnlyPublicKey(w.privateKey), 'wallet fields agree');

// ---- the box
const box = await W.lock({ words: a }, 'correct horse battery', { iterations: 2000 });
ok(!JSON.stringify(box).includes(a.split(' ')[0] + ' '), 'the box does not contain the words');
ok((await W.unlock(box, 'correct horse battery')).words === a, 'the right password opens the box');
await throwsCode(() => W.unlock(box, 'correct horse batterY'), 'BAD_PASSWORD', 'a wrong password is refused');
const tampered = { ...box, data: box.data.slice(0, -4) + (box.data.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA') };
await throwsCode(() => W.unlock(tampered, 'correct horse battery'), 'BAD_PASSWORD', 'a changed box is refused');
await throwsCode(() => W.lock({ words: a }, 'short'), 'WEAK_PASSWORD', 'passwords under 8 characters refused');
ok((await W.lock({ x: 1 }, 'abcdefgh')).iterations === W.KDF_ITERATIONS, `the default work factor is ${W.KDF_ITERATIONS}`);

// ---- proving a backup wallet
const other = W.walletFromWords(W.newWords());
const msg = 'kaspa-vault backup wallet\ncode 1234';
const sig = K.signMessage(msg, other.privateKey);
ok(W.pubkeyFromAddress(other.address) === other.publicKey, 'an address gives back its key');
ok(W.pubkeyFromAddress('kaspa:pplm538r3q2wp256xz3m3d3lfqdanjeehyz6uznpp0pcdy8cfdq5yshx50edy') === null, 'a P2SH address has no key');
ok(W.proveAddress({ address: other.address, message: msg, signature: sig }) === other.address, 'a hex signature with the address alone proves it');
const sigB64 = Buffer.from(sig, 'hex').toString('base64');
ok(W.proveAddress({ address: other.address, publicKey: '02' + other.publicKey, message: msg, signature: { signature: sigB64 } }) === other.address, 'base64, a compressed key and an object wrapper work too');
await throwsCode(() => W.proveAddress({ address: other.address, message: msg + '!', signature: sig }), 'PROOF', 'a signature over another message fails');
await throwsCode(() => W.proveAddress({ address: w.address, publicKey: other.publicKey, message: msg, signature: sig }), 'PROOF', 'an address that is not the signing key fails');
await throwsCode(() => W.proveAddress({ address: other.address, message: msg, signature: 'zz' }), 'PROOF', 'junk signature fails');

console.log(failed ? `FAILED: ${pass} checks passed, ${failed} failed` : `PASSED: ${pass} checks passed, 0 failed`);
process.exit(failed ? 1 : 0);
