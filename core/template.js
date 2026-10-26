// core/template.js - fill a contract template with a user's values. No dependencies; runs in the
// browser and in Node.
//
// A template is the compiled script cut into fixed byte segments and parameter slots
// (contracts/templates.json, made by tools/build-templates.js and checked against silverc by
// test/compiler-equality.js). Filling it means encoding each value exactly the way silverc does
// and concatenating. There is no compiler in the browser and no server is asked for anything.
//
// Encodings (silverc v1, kaspanet/silverscript 3ed9733):
//   pubkey, byte[32]   OP_DATA_32 (0x20) + the 32 bytes
//   int                the minimal script-number push: 0 -> OP_0, 1..16 -> OP_1..OP_16,
//                      -1 -> OP_1NEGATE, otherwise little-endian sign-magnitude bytes with the
//                      shortest push opcode (OP_DATA_n)

const HEX = /^[0-9a-f]*$/;
const INT_MIN = -(2n ** 63n) + 1n;
const INT_MAX = 2n ** 63n - 1n;

function clean(h) { return String(h == null ? '' : h).trim().toLowerCase().replace(/^0x/, ''); }

function byteHex(n) { return (n < 16 ? '0' : '') + n.toString(16); }

/** Minimal little-endian sign-magnitude bytes of a script number (empty for zero). */
function scriptNumBytes(value) {
    let n = BigInt(value);
    if (n === 0n) return [];
    const neg = n < 0n;
    if (neg) n = -n;
    const out = [];
    while (n > 0n) { out.push(Number(n & 0xffn)); n >>= 8n; }
    if (out[out.length - 1] & 0x80) out.push(neg ? 0x80 : 0x00);
    else if (neg) out[out.length - 1] |= 0x80;
    return out;
}

/** The push of one byte string, shortest form (only up to 75 bytes is ever needed here). */
function pushBytes(bytes) {
    if (bytes.length > 75) throw new Error('push longer than 75 bytes is not used by these templates');
    return byteHex(bytes.length) + bytes.map(byteHex).join('');
}

function parseInt64(value, name) {
    const s = String(value == null ? '' : value).trim();
    if (!/^-?\d+$/.test(s)) throw new Error(`${name}: expected a whole number, got "${value}"`);
    const n = BigInt(s);
    if (n < INT_MIN || n > INT_MAX) throw new Error(`${name}: out of the 64-bit script range`);
    return n;
}

function pubkeyHex(value, name) {
    let h = clean(value);
    if (/^(02|03)[0-9a-f]{64}$/.test(h)) h = h.slice(2);            // compressed secp256k1 -> x only
    if (!/^[0-9a-f]{64}$/.test(h)) throw new Error(`${name}: expected a 32-byte x-only public key (64 hex)`);
    return h;
}

/** Encode one parameter value as silverc pushes it. Returns lowercase hex. */
function encodeParam(type, value, name) {
    const label = name || type;
    if (type === 'pubkey') return '20' + pubkeyHex(value, label);
    if (type === 'byte[32]') {
        const h = clean(value);
        if (!/^[0-9a-f]{64}$/.test(h)) throw new Error(`${label}: expected 32 bytes (64 hex)`);
        return '20' + h;
    }
    if (type === 'int') {
        const n = parseInt64(value, label);
        if (n === 0n) return '00';                                  // OP_0
        if (n === -1n) return '4f';                                 // OP_1NEGATE
        if (n >= 1n && n <= 16n) return byteHex(0x50 + Number(n));  // OP_1..OP_16
        return pushBytes(scriptNumBytes(n));
    }
    throw new Error(`${label}: type "${type}" has no template encoding`);
}

/**
 * Fill a template. `values` maps parameter name -> value (hex keys, decimal ints).
 * Every parameter must be given; unknown names are refused. Returns the script as lowercase hex.
 */
function fill(template, values) {
    if (!template || !Array.isArray(template.segments) || !Array.isArray(template.params)) throw new Error('not a template');
    const v = values || {};
    for (const k of Object.keys(v)) if (!template.params.some(p => p.name === k)) throw new Error(`${template.id}: unknown parameter "${k}"`);
    const enc = {};
    for (const p of template.params) {
        if (v[p.name] == null) throw new Error(`${template.id}: missing value for "${p.name}"`);
        enc[p.name] = encodeParam(p.type, v[p.name], p.name);
    }
    let out = '';
    for (const s of template.segments) {
        if (s.hex != null) {
            if (!HEX.test(s.hex) || s.hex.length % 2) throw new Error(`${template.id}: bad template segment`);
            out += s.hex;
        } else if (s.param) {
            if (!(s.param in enc)) throw new Error(`${template.id}: template slot "${s.param}" is not a parameter`);
            out += enc[s.param];
        } else throw new Error(`${template.id}: bad template segment`);
    }
    return out;
}

export { encodeParam, fill, scriptNumBytes, pubkeyHex };
