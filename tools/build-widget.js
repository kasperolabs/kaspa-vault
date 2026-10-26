#!/usr/bin/env node
// tools/build-widget.js - bundles widget/src into one file anyone can host or audit.
//   widget/dist/kaspa-vault.js       readable, what the tests run
//   widget/dist/kaspa-vault.min.js   the same, minified
//   widget/dist/SHA256SUMS           so a page can be checked against a tagged release
// The bundle is reproducible: same sources and the pinned esbuild give the same bytes.
import { build } from 'esbuild';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'widget/dist');
fs.mkdirSync(out, { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const banner = `/*! kaspa-vault ${pkg.version} | MIT | https://github.com/kasperolabs/kaspa-vault | bundles @noble/hashes, @noble/secp256k1, @scure/bip39 (MIT), kaspa-ksm (MIT), qrcode-generator (MIT) */`;
const common = { entryPoints: [path.join(root, 'widget/src/index.js')], bundle: true, format: 'esm', target: 'es2022', banner: { js: banner }, legalComments: 'none', logLevel: 'warning' };
await build({ ...common, outfile: path.join(out, 'kaspa-vault.js') });
await build({ ...common, outfile: path.join(out, 'kaspa-vault.min.js'), minify: true });
const sums = ['kaspa-vault.js', 'kaspa-vault.min.js'].map(f => {
    const buf = fs.readFileSync(path.join(out, f));
    return { f, kb: (buf.length / 1024).toFixed(1), hex: crypto.createHash('sha256').update(buf).digest('hex'), sri: 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64') };
});
fs.writeFileSync(path.join(out, 'SHA256SUMS'), sums.map(s => `${s.hex}  ${s.f}`).join('\n') + '\n');
// the static site serves the minified bundle next to its page
if (fs.existsSync(path.join(root, 'site'))) fs.copyFileSync(path.join(out, 'kaspa-vault.min.js'), path.join(root, 'site/kaspa-vault.min.js'));
for (const s of sums) console.log(`${s.f.padEnd(20)} ${s.kb.padStart(6)} KB  sha256 ${s.hex}\n${' '.repeat(29)}integrity="${s.sri}"`);
