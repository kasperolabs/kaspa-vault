# Kaspa Vault

A savings vault for Kaspa, built on covenants. Money in a vault can go to exactly two places: the
owner's spending wallet after a waiting time they chose, or their own backup wallet at any time.
A separate watcher emails the owner the moment a withdrawal starts; if it wasn't them, one button
sends everything to the backup wallet instead. Nobody can move it anywhere else: not a website,
not the watcher, not us.

**Use it:** [kaspavault.com](https://kaspavault.com) · **How it works:** [kaspavault.com/how](https://kaspavault.com/how) · **Run your own:** [kaspavault.com/build](https://kaspavault.com/build)

> Preview. The contracts and every spend path have been run on Kaspa's own script engine and
> tested on mainnet with real KAS, but nothing here has had an outside audit yet. Start with
> amounts you can afford to lose.

## Why this exists

Self-custody has one classic failure: whoever gets your key gets your money, instantly. A vault
adds time and a second channel. A thief who steals the vault's key can only start a clock; the
owner hears about it and pulls the money out of reach. Kaspa's covenants make that rule part of the
address itself, so it holds even if every server involved disappears.

This was built for [Kasla](https://kasla.io) and released on its own so that any wallet, any site
and any person can run it. The goal is that it keeps working without us.

## How it fits together

```
  owner's key ──open──▶ Vault ──▶ Airlock ──after the delay──▶ owner's spending wallet
                          │          │
  guardian key ─evacuate──┴──rescue──┴─────────any time──────▶ owner's backup wallet
```

- **Vault** (`contracts/vault_v1.sil`): the savings. The owner's key can only move coins into the
  Airlock (or merge them). The guardian key can only send them to the backup wallet.
- **Airlock** (`contracts/airlock_v2.sil`): the waiting room. After the delay, anyone may push the
  coin to the owner's spending wallet (no key needed); before that, only the guardian can move it,
  and only to the backup wallet.
- **Watcher** (`watcher/`): holds the guardian key, emails the owner, offers the rescue button,
  finishes withdrawals. If it goes offline, vaults stay exactly as locked; only the alert is lost.

## What's in the repository

| Folder | What |
|---|---|
| `contracts/` | the two SilverScript contracts and their byte templates (compiled with silverc, proven equal to it) |
| `core/` | the library: build vaults, transactions, signatures, the browser wallet. Browsers and Node 18+, no WebAssembly, no server |
| `widget/` | `<kaspa-vault>`: the whole vault as one drop-in element and one file |
| `watcher/` | the guardian service: alerts, rescue, release, registration by signature + email |
| `site/` | kaspavault.com, a static site (Cloudflare Pages) |
| `tools/` | template builder, widget build, a CLI vault (`try-vault.js`), a local server for the demo |
| `test/` | everything below |
| `demo/` | the widget against a simulated chain, no money anywhere |

## Three ways to use it

1. **Open a vault** at kaspavault.com, or on any site that embeds the widget.
2. **Put the vault on your own site:** host `widget/dist/kaspa-vault.min.js` and add
   `<kaspa-vault watcher="…" guardian="…">`. See `widget/README.md`.
3. **Build it into a wallet app:** use `core/` directly. See `core/README.md`.

And to make the system sturdier: **run a watcher** (`watcher/README.md`) and ask to be listed.

## Verify, don't trust

```bash
git clone https://github.com/kasperolabs/kaspa-vault && cd kaspa-vault
npm ci
npm test                    # transactions, lifecycle, watcher, wallet (Node only)
npm run test:equality       # the byte templates equal silverc's output for 500 random key sets
npm run build:widget        # reproducible: compare the SHA-256 with what a site serves
npm run test:widget         # the full flow in Chromium against the simulated chain
node test/site-smoke.js     # the site pages under their own Content-Security-Policy
tools/engine-test.sh        # every contract path on rusty-kaspa's script engine (needs Rust)
```

kaspavault.com/verify rebuilds a vault from its card in your browser and shows the fingerprint of
the code the site is serving.

## Try it with no money

```bash
node test/dev-world.js      # a simulated chain, a real watcher, a mailbox
node tools/serve.js         # then open http://127.0.0.1:8080/demo/
```

## License

MIT, see `LICENSE`. Made by [Kaspero Labs](https://kasperolabs.com).
