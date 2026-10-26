#!/usr/bin/env node
// watcher/gen-key.js - make this watcher's guardian key, once. Prints the .env line and the facts a
// vault site pins. Back the key up offline in two places: it is what rescues vaults if this box dies.
//
//   node gen-key.js                 new key
//   node gen-key.js --show          the public facts for the key already in .env

import { randomPrivateKey, xOnlyPublicKey } from '../core/kaspa.js';
import { loadDotEnv } from './config.js';

if (process.argv.includes('--show')) {
    const env = { ...loadDotEnv(), ...process.env };
    const priv = String(env.GUARDIAN_PRIVKEY || '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(priv)) { console.error('no GUARDIAN_PRIVKEY in .env'); process.exit(1); }
    console.log(`guardian pubkey: ${xOnlyPublicKey(priv)}`);
    process.exit(0);
}

const priv = randomPrivateKey();
const pub = xOnlyPublicKey(priv);
console.log(`# Put this in .env (chmod 600). Back it up offline, in two places, now.
GUARDIAN_PRIVKEY=${priv}

# The public half. A vault site pins it (site config "guardianPubkey"), so a swapped watcher is refused:
#   guardian pubkey: ${pub}
#
# Running a second watcher for the same vaults? Copy the SAME key there; the contracts name one key.`);
