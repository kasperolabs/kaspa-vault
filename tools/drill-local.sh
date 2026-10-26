#!/usr/bin/env bash
# tools/drill-local.sh - the mainnet drill, rehearsed against test/dev-world.js (no money anywhere).
# Start the world first:  node test/dev-world.js     then:  tools/drill-local.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"; cd "$WORK"
TV="node $HERE/tools/try-vault.js --node ws://127.0.0.1:18210"
CTL=http://127.0.0.1:7398
step() { printf '\n== %s\n' "$*"; }
advance() { curl -s -X POST $CTL/advance -H 'Content-Type: application/json' -d "{\"daa\":$1}" >/dev/null; }
mail_link() { curl -s $CTL/mail | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const m=JSON.parse(s).filter(x=>x.text.includes('/$1/')).at(-1);console.log(((m||{}).text||'').match(/\/$1\/([0-9a-f]{48})/)?.[1]||'')})"; }
mails() { curl -s $CTL/mail | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const m of JSON.parse(s).slice(-$1))console.log('   mail to '+m.to+': '+m.subject)})"; }
BACKUP=$(node --input-type=module -e "import * as K from '$HERE/core/kaspa.js'; console.log(K.addressOfKey('mainnet', K.randomPrivateKey()))")

step "1. create a vault (backup wallet $BACKUP), 5-minute delay"
$TV new --watcher http://127.0.0.1:7399 --backup "$BACKUP" --email you@example.com --delay 3000
step "2. press Confirm in the email"
curl -s -X POST -o /dev/null -w "   confirm page answered %{http_code}\n" "http://127.0.0.1:7399/confirm/$(mail_link confirm)"
mails 1
step "3. fund the vault's wallet with 30 KAS and put 20 in the vault"
curl -s -X POST $CTL/fund -H 'Content-Type: application/json' -d "{\"address\":\"$($TV address)\",\"kas\":30}" >/dev/null
$TV deposit 20; advance 40; $TV status
step "4. take it out (a withdrawal you made)"
$TV withdraw all; advance 10; mails 1
step "5. five minutes later: the watcher releases it on its own"
advance 3100; $TV status; mails 1
step "6. put 15 back in, then someone else starts a withdrawal"
$TV deposit 15; advance 40; $TV withdraw all; advance 10; mails 1
step "7. you press \"This was not me\" in the email"
curl -s -X POST -o /dev/null -w "   rescue page answered %{http_code}\n" "http://127.0.0.1:7399/rescue/$(mail_link rescue)"
mails 1; $TV status
step "8. the backup wallet now holds the rescued money"
curl -s "$CTL/balance/$BACKUP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const b=JSON.parse(s);console.log('   '+b.kas+' KAS in '+b.coins+' coin(s) at '+b.address)})"
echo "   (on mainnet you open Kasware and see it there)"
rm -rf "$WORK"
