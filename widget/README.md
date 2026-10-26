# The widget: `<kaspa-vault>`

One file, no framework, no server of its own. Drop it on any page and visitors can open a Kaspa
savings vault, protected by a watcher of your choice.

```html
<script type="module" src="kaspa-vault.min.js"></script>
<kaspa-vault
    watcher="https://watch.kaspavault.com"
    guardian="45f27924281a099a68cc4d65c9a52aa1793a0c00e0c188ff0d09469f83826148">
</kaspa-vault>
```

| Attribute | |
|---|---|
| `watcher` | The watcher's URL. Required. |
| `guardian` | The watcher's public key, pinned. If the watcher ever answers with another key, no vault is created. Always set it on a public page. |
| `node` | Comma-separated Kaspa REST APIs (`https://`) or kaspad JSON wRPC (`ws://`, `wss://`), tried in order. Default: `https://api.kaspa.org` (mainnet), `https://api-tn10.kaspa.org` (testnet-10). |
| `delays` | Waiting times offered, in days. Default `1,3,7`. A watcher that accepts less than a day (test round) also gets its minimum offered, labeled "Test". |
| `storage-key` | The localStorage key. Default `kaspa-vault`. |

Theming: set CSS variables on the element, e.g.
`kaspa-vault { --kv-accent: #1a365d; --kv-font: Inter, sans-serif; }`
(all of them are at the top of `src/style.js`).

Event: `kaspa-vault-change`, `detail = { vaultAddress, vault, pending, spending }` (sompi as strings),
after every refresh. Method: `element.refresh()`.

## What happens in the browser

1. **The vault's wallet** is made here: 12 standard recovery words (BIP39), first address of the
   standard Kaspa path `m/44'/111111'/0'/0/0`. The same words open it in Kasware, Kastle or
   Kaspium. The user confirms two words before going on.
2. **The backup wallet** is proven by a signature from Kasware, Kastle or Kaspire (Kaspa personal
   message signing, checked here), or typed in with a warning.
3. **The vault** is built from the three keys and the waiting time with the byte templates in
   `core/` (no compiler, no server), checked against the watcher's key (and the pin).
4. **Saved on this device:** the vault card (public keys and addresses) and a box holding the
   words, encrypted with the user's password (PBKDF2-SHA256, 600,000 rounds, AES-GCM). The key is
   unlocked for 5 minutes at a time, in memory only.
5. **Alerts:** the vault's own key signs a registration for the watcher; the user confirms it by
   an email link. Only then is the vault watched.

Every action that moves money (Add money, Take money out, Send) asks for the password unless it
was entered in the last 5 minutes. A withdrawal past its waiting time is released by whichever
comes first, the watcher or this page (it needs no key).

**The user's backup is the 12 words plus the vault card** (Download vault card). With both,
"I already have a vault" opens it in any browser; without this page, any Kaspa tool can work the
vault from the card's two `.ksm` files.

## Build, verify, try

```bash
npm ci
npm run build:widget        # widget/dist/kaspa-vault.js, .min.js and SHA256SUMS (reproducible)
npm run test:widget         # builds, then drives the whole flow in Chromium against the dev world
```

Try it by hand, no money anywhere:

```bash
node test/dev-world.js      # mock chain, real watcher, mailbox     (one terminal)
node tools/serve.js         # http://127.0.0.1:8080/demo/           (another)
```

The demo page has a dev bar: fund the spending wallet, move time forward, read the watcher's
mail. A real Kasware extension works as the backup wallet there too (the dev world is "mainnet"
to it, but nothing ever reaches the real network).
