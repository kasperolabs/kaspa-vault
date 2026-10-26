#!/usr/bin/env bash
# tools/engine-test.sh - run the 33 vault path tests on the real Kaspa script engine.
#   tools/engine-test.sh /path/to/silverscript      (a checkout of kaspanet/silverscript at 3ed9733)
set -euo pipefail
SS="${1:?usage: tools/engine-test.sh /path/to/silverscript-checkout}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
want=3ed9733
have="$(git -C "$SS" rev-parse --short=7 HEAD)"
[ "$have" = "$want" ] || { echo "silverscript checkout is at $have, the templates were built on $want"; exit 1; }
cp "$HERE/test/engine/vault_paths.rs" "$SS/silverscript-lang/tests/vault_paths.rs"
cd "$SS"
VAULT_CONTRACTS_DIR="$HERE/contracts" cargo test -q -p silverscript-lang --test vault_paths -- --nocapture
