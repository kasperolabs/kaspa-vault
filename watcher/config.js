// watcher/config.js - settings from the environment (and a .env file beside this one, if present).
// Refuses to start on anything unsafe rather than guessing.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as K from '../core/kaspa.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** KEY=value lines; # comments; optional quotes. No variable expansion. */
export function loadDotEnv(file = path.join(HERE, '.env')) {
    if (!fs.existsSync(file)) return {};
    const out = {};
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const i = line.indexOf('=');
        if (i < 1) continue;
        let v = line.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        out[line.slice(0, i).trim()] = v;
    }
    return out;
}

const int = (v, d, min, max) => { const n = parseInt(v, 10); return Math.min(max, Math.max(min, Number.isFinite(n) ? n : d)); };
const bool = (v, d) => v == null || v === '' ? d : /^(1|true|yes|on)$/i.test(String(v));

export function readConfig(env = { ...loadDotEnv(), ...process.env }) {
    const problems = [];
    const priv = String(env.GUARDIAN_PRIVKEY || '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(priv)) problems.push('GUARDIAN_PRIVKEY must be a 64-hex private key (node gen-key.js)');
    const publicUrl = String(env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^/]+/.test(publicUrl)) problems.push('PUBLIC_URL must be the https address people reach this watcher at');
    const network = String(env.NETWORK || 'mainnet').trim();
    if (!['mainnet', 'testnet-10'].includes(network)) problems.push('NETWORK must be mainnet or testnet-10');
    const mail = String(env.MAIL_TRANSPORT || 'smtp').trim();
    if (mail === 'smtp' && !(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM)) problems.push('SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM are required (or MAIL_TRANSPORT=log for testing)');
    if (problems.length) { const e = new Error('watcher config:\n  - ' + problems.join('\n  - ')); e.problems = problems; throw e; }

    const minDelay = int(env.MIN_DELAY_DAA, 864000, 100, 25920000);
    return {
        version: '0.1.0',
        name: String(env.WATCHER_NAME || new URL(publicUrl).host).slice(0, 60),
        publicUrl,
        siteUrl: String(env.SITE_URL || 'https://kaspavault.com').replace(/\/+$/, ''),
        port: int(env.PORT, 7332, 1, 65535),
        host: String(env.HOST || '127.0.0.1'),
        network,
        guardianPriv: priv,
        guardianPub: K.xOnlyPublicKey(priv),
        dataDir: path.resolve(HERE, env.DATA_DIR || 'data'),
        nodes: String(env.KASPA_NODES || 'ws://127.0.0.1:18110,https://api.kaspa.org').split(',').map(s => s.trim()).filter(Boolean),
        minDelayDaa: BigInt(minDelay),
        pollMs: int(env.POLL_MS, 20000, 5000, 600000),
        pollFailAlert: int(env.POLL_FAIL_ALERT, 5, 2, 1000),
        release: bool(env.RELEASE, true),
        limits: {
            vaults: int(env.MAX_VAULTS, 1000, 1, 1000000),
            vaultsPerEmail: int(env.MAX_VAULTS_PER_EMAIL, 5, 1, 1000),
            subscribersPerVault: int(env.MAX_SUBSCRIBERS_PER_VAULT, 5, 1, 50),
            pending: int(env.MAX_PENDING, 500, 1, 100000),
            pendingTtlMs: int(env.PENDING_TTL_HOURS, 24, 1, 168) * 3600000,
            registerPerIpHour: int(env.REGISTER_PER_IP_HOUR, 6, 1, 10000),
            registerPerHour: int(env.REGISTER_PER_HOUR, 120, 1, 1000000),
            emergencyPerIpHour: int(env.EMERGENCY_PER_IP_HOUR, 6, 1, 10000),
            signatureMaxAgeMs: int(env.SIGNATURE_MAX_AGE_MIN, 30, 1, 1440) * 60000
        },
        trustProxy: String(env.TRUST_PROXY || 'nginx'),              // nginx: X-Real-IP from 127.0.0.1; cloudflare: CF-Connecting-IP; none
        corsOrigins: String(env.CORS_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean),
        mail: {
            transport: mail,
            host: env.SMTP_HOST, port: int(env.SMTP_PORT, 465, 1, 65535), secure: bool(env.SMTP_SECURE, true),
            user: env.SMTP_USER, pass: env.SMTP_PASS, from: env.MAIL_FROM,
            admin: String(env.ADMIN_EMAIL || '').trim() || null
        }
    };
}
