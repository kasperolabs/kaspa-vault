# Contracts

Two SilverScript covenants per vault. Nothing else holds the money.

| File | Contract | Entries |
|---|---|---|
| `airlock_v2.sil` | `Airlock(pubkey hot, pubkey guardian, pubkey rescue, int delay)` | `release()` no signature, after `delay` DAA, everything to `hot`; `rescue(sig)` guardian, any time, everything to `rescue` |
| `vault_v1.sil` | `Vault(pubkey hot, pubkey guardian, pubkey rescue, byte[32] airlockHash)` | `open(sig)` hot, everything into the airlock; `merge(sig)` hot, folds coins back into the vault; `evacuate(sig)` guardian, everything to `rescue` |

The keys: `hot` starts withdrawals (the user's wallet), `guardian` is the watcher's key, `rescue`
is the user's backup wallet. No key can send a vault coin anywhere except the airlock, the vault
itself, the hot wallet after the delay, or the backup wallet. Every path caps the fee at 0.01 KAS
and allows exactly one output.

These are the contracts Kasla runs in production, unchanged. The comments still say Kasla; the
bytes do not depend on comments.

## Templates instead of a compiler

The browser never compiles. `templates.json` is each compiled script cut into fixed byte segments
and parameter slots; `core/template.js` fills the slots (a 32-byte push for keys and the airlock
hash, a minimal script-number push for the delay) and concatenates. The result is the same bytes
silverc would produce, so the address is the same address.

Why: a vault compiled by a remote server is only as safe as that server. A swapped `airlockHash`
would look like any other vault until the money left. Filling a template locally needs nobody.

## How you know the templates are right

1. **Pinned vectors.** Kasla's production self-check addresses (fixed test key, delay 864000)
   come out of the templates unchanged:
   - airlock `kaspa:pplm538r3q2wp256xz3m3d3lfqdanjeehyz6uznpp0pcdy8cfdq5yshx50edy`
   - vault `kaspa:pz4zftmnyn57hphenrcxuw4szqfjt7lqk5t6em6q4xnz5kwcgqrv7lcptm5x4`
2. **Compiler equality** (`npm run test:equality`). Hundreds of random real secp256k1 key sets
   and random delays, on mainnet and testnet: template bytes, addresses and the full `.ksm`
   manifests compared with silverc's output. Plus every boundary of the delay encoding
   (0, 1, 16, 17, 127, 128, 255, 256, 32767, 32768, ... 2^32 - 1).
3. **Script engine** (`tools/engine-test.sh`). 33 spends on the real Kaspa script engine with
   real signatures: every entry with the right key, and refused with the wrong key, the wrong
   destination, an extra output, a coin burned as fee, a foreign coin mixed in, a release one
   DAA early.
4. **Every build checks itself.** `core/contracts.js` re-verifies each pair it builds the way a
   watcher would (manifests verify, tags pinned, vault opens into this airlock, evacuate and
   rescue pay the backup wallet, release pays the hot key, the delay is the one asked for) and
   throws instead of returning anything else.

The one field a template manifest leaves out is `compiler.templateHash`, a Blake3 hash silverc
adds for state-bearing contracts. Nothing verifies it and these contracts carry no state.

## Rebuilding

Only when a `.sil` file changes, with silverc built from kaspanet/silverscript `3ed9733`:

```bash
node tools/build-templates.js --silverc /path/to/silverc
node test/compiler-equality.js 500 --silverc /path/to/silverc
tools/engine-test.sh /path/to/silverscript
```

`build-templates.js` refuses to write a template that does not reproduce two independent
compiles.
