#!/usr/bin/env bash
# tools/engine-test.sh - run the vault's script-engine and consensus tests.
#   tools/engine-test.sh /path/to/silverscript      (a checkout of kaspanet/silverscript at 3ed9733)
#
#   vault_paths      33 contract paths compiled by silverc, signed and run on the Kaspa script engine
#   vault_consensus  every transaction test/spend.js builds (run `node test/spend.js` first): its id,
#                    masses and fee checked with rusty-kaspa's code, every input run on the engine
set -euo pipefail
SS="${1:?usage: tools/engine-test.sh /path/to/silverscript-checkout}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
want=3ed9733
have="$(git -C "$SS" rev-parse --short=7 HEAD)"
[ "$have" = "$want" ] || { echo "silverscript checkout is at $have, the templates were built on $want"; exit 1; }
[ -f "$HERE/test/engine/fixtures.json" ] || (cd "$HERE" && node test/spend.js)
cp "$HERE/test/engine/vault_paths.rs" "$SS/silverscript-lang/tests/vault_paths.rs"
cp "$HERE/test/engine/consensus.rs" "$SS/silverscript-lang/tests/vault_consensus.rs"
cd "$SS"
VAULT_CONTRACTS_DIR="$HERE/contracts" cargo test -q -p silverscript-lang --test vault_paths -- --nocapture
VAULT_FIXTURES="$HERE/test/engine/fixtures.json" cargo test -q -p silverscript-lang --test vault_consensus -- --nocapture
