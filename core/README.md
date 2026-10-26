# core

Everything a wallet, a page or a watcher needs to run a vault. Plain ES modules; runs in browsers
and Node 18+. Runtime dependencies: `@noble/secp256k1`, `@noble/hashes`, `@scure/bip39` (audited, no
dependencies beyond each other) and `kaspa-ksm` (the covenant manifest format). No WebAssembly, no
compiler, no server of ours.

| File | What |
|---|---|
| `contracts.js` | `buildVault({ hot, guardian, rescue, delayDaa, network })` makes both covenants from the templates and checks them; `check`, `describe` |
| `template.js`, `templates.js` | the contracts as byte templates (see `contracts/README.md`) |
| `kaspa.js` | transactions: id, signature hash, Schnorr signing, mass, fees (version 0, ported from rusty-kaspa v2.1.0) |
| `spend.js` | builders for every vault transaction, with the contracts' rules checked before signing |
| `vault.js` | `VaultClient`: snapshot, deposit, withdraw, release, merge, send onward, and the guardian's rescue and evacuate |
| `provider.js` | `restProvider()` for any Kaspa REST API; bring your own provider to use your own node |
| `card.js` | the vault card: public keys + delay + watcher, enough to rebuild and check the vault anywhere |
| `wallet.js` | 12 recovery words (BIP39), the standard Kaspa path m/44'/111111'/0'/0/0, a password box (PBKDF2 + AES-GCM), backup-wallet proofs |
| `provider-wrpc.js` | `wrpcJsonProvider()` for kaspad's JSON wRPC (your own node) |

## Using it in a wallet

```js
import { buildVault, VaultClient, restProvider, keySigner, makeCard } from 'kaspa-vault/core';

const pair = buildVault({ hot: myPubkey, guardian: watcherPubkey, rescue: backupPubkey, delayDaa: '864000' });
const vault = new VaultClient(pair, { provider: restProvider() });
const signer = keySigner(myPrivateKeyHex);           // or your wallet's own { sign(sighash) }

await vault.deposit({ signer, amount: 10_000_000_000n });   // 100 KAS, in sompi
const s = await vault.snapshot();                            // balances.vault, pending[], ...
await vault.withdraw({ signer });                            // everything; lands in the hot wallet after the delay
await vault.release();                                       // after the delay; needs no key
```

A signer is any object with `sign(sighash: Uint8Array) -> hex signature` (64 or 65 bytes, Schnorr,
SIGHASH_ALL). Each signature is verified against the key the contract names before it is used, so a
signer for the wrong key fails locally, not on the network.

## Limits you should know

- **Fees are capped by the contracts.** Every vault spend may pay at most 0.01 KAS. At the
  network's floor rate (100 sompi per gram) one withdrawal transaction carries at most 3 vault
  coins; `withdraw` splits larger ones into several transactions by itself. If network fees rose
  far above the floor, vault spends could not pay more and would wait. Merging small deposits
  early (`merge`) keeps the coin count down.
- **Release needs no key.** Anyone may push a matured release; it can only pay the hot wallet. The
  page releases when it is open, the watcher releases too.
- **Whole coins move.** A withdrawal takes whole vault coins; `VaultClient.pickCoins(coins, amount)`
  picks the fewest that cover an amount, and the rest stays in.
- **Version 0 transactions only**, as the official SDK builds them.

## How it is checked

| Test | What it proves |
|---|---|
| `test/compiler-equality.js` | templates == silverc, bytes and manifests, 500 random key sets |
| `test/spend.js` | every builder's rules, refusals (wrong key, wrong destination, early release, too many coins), writes consensus fixtures |
| `test/engine/consensus.rs` | those transactions through rusty-kaspa: `tx.id()`, `MassCalculator`, the script engine on every input, forgeries refused (run at silverscript's pin and at the v2.1.0 tag in `test/engine/standalone/`) |
| `test/engine/vault_paths.rs` | the 33 contract paths on the script engine |
| `test/lifecycle.js` | a vault's whole life through `VaultClient` on a strict simulated chain |
| `test/live.js` | read-only checks against a live mainnet REST API: real transaction ids, real signatures against our signature hash, and a node computing the same id as ours |
