# Watcher

The guardian half of a kaspa-vault. It holds one key, the guardian key, and the vault contracts
only ever let that key move a vault's money to **that vault's own backup wallet**. So it is safe to
keep online, safe to let it act on an email click, and it cannot steal.

What it does:

1. **Registration.** A vault's owner asks to be watched: the vault card, an email, and a signature
   by the vault's own hot key (only the owner's browser or wallet has it). The watcher rebuilds both
   covenants from the card's keys, checks they name its guardian key, this network and a waiting
   time it accepts, and emails a confirmation link that shows the vault and the backup wallet.
   Nothing is watched until that link is used.
2. **Alerts.** Every `POLL_MS` it reads every watched vault's airlock on its node. A new coin there
   means a withdrawal started: every confirmed address gets an email with a "This was not me" link.
3. **Rescue.** The link opens a page; its button moves everything (the coins on their way out and
   everything still in the vault) to the backup wallet, and retries until both are empty.
4. **Lost access.** An owner who lost the device can ask for a rescue link; it goes only to a
   confirmed address.
5. **Release.** After the waiting time it pushes the release itself (needs no key; the contract
   pays only the vault's own wallet) and emails that the money landed.

What it can and cannot do, if this box is taken over: an attacker holding the guardian key can
move vaults into their owners' own backup wallets early, or stop sending alerts. They cannot move
money anywhere else. Without any watcher at all, owners can still withdraw and release; they just
lose the alert and the button.

Registrations are bound to the hot key, so a stranger who learns a vault card cannot subscribe to
it or trigger rescues. A vault can have several confirmed addresses; a thief who stole the hot key
could add their own address, but nothing they sign removes the owner's: only that address's own
link stops its emails.

## Install on the Studio box (vmi3019233)

Everything below as root. The watcher runs as its own user, `vaultwatch`, beside Kasla's watcher
(port 7331, untouched); this one listens on 127.0.0.1:7332.

**1. The node's JSON RPC, localhost only.** Add `--rpclisten-json=127.0.0.1:18110` to kaspad's
ExecStart, then reload:

```bash
systemctl cat kaspad | grep ExecStart          # see the current line
systemctl edit --full kaspad                   # add the flag to ExecStart
systemctl daemon-reload && systemctl restart kaspad
```

**2. User, code, packages.**

```bash
adduser --system --group --home /home/vaultwatch --shell /usr/sbin/nologin vaultwatch
git clone /root/kaspa-vault-repo /var/www/vault-watcher-public
cd /var/www/vault-watcher-public && npm ci --omit=dev && (cd watcher && npm ci --omit=dev)
chown -R vaultwatch:vaultwatch /var/www/vault-watcher-public
```

**3. Key and settings.**

```bash
cd /var/www/vault-watcher-public/watcher
sudo -u vaultwatch node gen-key.js                     # copy the GUARDIAN_PRIVKEY line; back it up offline now
sudo -u vaultwatch cp .env.example .env && nano .env   # paste the key; mail settings; MIN_DELAY_DAA=3000 for the test round
chmod 600 .env && chown vaultwatch:vaultwatch .env
sudo -u vaultwatch node node-check.js                  # every node: reads, and a refused fake spend naming our id
```

`node-check.js` must end with `all nodes usable`. If the local node fails while it is still syncing,
the watcher uses the next one in `KASPA_NODES` meanwhile.

**4. Run it.**

```bash
npm i -g pm2   # if this box does not have it
sudo -u vaultwatch -H pm2 start /var/www/vault-watcher-public/watcher/deploy/ecosystem.config.cjs
sudo -u vaultwatch -H pm2 save
pm2 startup systemd -u vaultwatch --hp /home/vaultwatch      # run the line it prints
sudo -u vaultwatch -H pm2 logs vault-watcher-public --lines 30
curl -s http://127.0.0.1:7332/health
```

**5. nginx and TLS.** DNS: `watch.kaspavault.com` A record to this box, **DNS only** (grey cloud).
Then copy `deploy/nginx-watch.kaspavault.com.conf` to `/etc/nginx/sites-available/`, create
`/etc/nginx/kv-proxy.conf` from the three lines at its end, link it into `sites-enabled`,
`nginx -t && systemctl reload nginx`, and `certbot --nginx -d watch.kaspavault.com`.

```bash
curl -s https://watch.kaspavault.com/v1/guardian       # your guardian pubkey, from outside
```

**Updating:** `cd /var/www/vault-watcher-public && git pull && chown -R vaultwatch: . &&
sudo -u vaultwatch -H pm2 reload vault-watcher-public`.

**Backups:** `.env` (the key) offline in two places; `data/` daily. The key cannot be recovered;
the data can be rebuilt by owners registering again.

## The mainnet drill (before anyone else uses it)

Small amounts, a 5-minute vault, your own Kasware as the backup wallet. From any folder on the box
(`try-vault.json` lands in the current folder and holds the test vault's key):

```bash
TV="node /var/www/vault-watcher-public/tools/try-vault.js"
$TV new --watcher https://watch.kaspavault.com --backup <your Kasware address> --email <you> --delay 3000
#   -> confirm in the email (check the backup address it shows is yours)
$TV address                       # send 3 KAS here from Kasware
$TV deposit 2 && $TV status       # 2 KAS into the vault
$TV withdraw all                  # -> "Withdrawal started" email
#   wait 5 minutes: the watcher releases it -> "Withdrawal complete" email
$TV deposit all && $TV withdraw all
#   -> in the new alert email press "This was not me" -> the KAS lands in Kasware
$TV status                        # vault and waiting both 0
$TV send <your Kasware address> all   # bring back whatever is left in the vault's wallet
$TV lost --email <you>            # the lost-access link arrives; nothing left to move now
```

Then set `MIN_DELAY_DAA=864000` in `.env` and reload. Delete `try-vault.json`.

Rehearse it with no money first, on this box or anywhere: `node test/dev-world.js` in one shell,
`tools/drill-local.sh` in another.

## Running the box without the server

`rescue.js` does the emergency from any machine with the guardian key and a vault card (or this
box's `data/`): `node rescue.js --card vault-card.json --node https://api.kaspa.org --dry`, then
without `--dry`. It can only pay that vault's backup wallet.

## HTTP

| | |
|---|---|
| `GET /v1/guardian` | guardian pubkey, network, minimum delay (CORS) |
| `POST /v1/register` | `{ card, email, time, signature }`, the hot key's signature over `registrationMessage()` from `core/card.js` (CORS) |
| `GET /v1/status/:vault` | `{ watched }` (CORS) |
| `POST /v1/lost` | `{ vaultAddress, email }`: emails a rescue link to a confirmed address; same answer either way (CORS) |
| `GET/POST /confirm/:token`, `/rescue/:token`, `/unsubscribe/:token` | the pages behind email links; GET shows, POST acts |
| `GET /health` | poll state, node, vault count |
