/*! kaspa-vault 0.1.0 | MIT | https://github.com/kasperolabs/kaspa-vault | bundles @noble/hashes, @noble/secp256k1, @scure/bip39 (MIT), kaspa-ksm (MIT), qrcode-generator (MIT) */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/kaspa-ksm/src/blake2b.js
var require_blake2b = __commonJS({
  "node_modules/kaspa-ksm/src/blake2b.js"(exports, module) {
    "use strict";
    var M2 = (1n << 64n) - 1n;
    var IV = [
      0x6a09e667f3bcc908n,
      0xbb67ae8584caa73bn,
      0x3c6ef372fe94f82bn,
      0xa54ff53a5f1d36f1n,
      0x510e527fade682d1n,
      0x9b05688c2b3e6c1fn,
      0x1f83d9abfb41bd6bn,
      0x5be0cd19137e2179n
    ];
    var SIGMA = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
      [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
      [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
      [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
      [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
      [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
      [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
      [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
      [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]
    ];
    var rotr2 = (x, n) => (x >> BigInt(n) | x << BigInt(64 - n)) & M2;
    function compress(h, block, t, last) {
      const m = new Array(16);
      for (let i = 0; i < 16; i++) {
        let w = 0n;
        for (let j = 7; j >= 0; j--) w = w << 8n | BigInt(block[i * 8 + j]);
        m[i] = w;
      }
      const v = h.concat(IV);
      v[12] ^= t & M2;
      v[13] ^= t >> 64n & M2;
      if (last) v[14] ^= M2;
      const G2 = (a, b, c, d, x, y) => {
        v[a] = v[a] + v[b] + x & M2;
        v[d] = rotr2(v[d] ^ v[a], 32);
        v[c] = v[c] + v[d] & M2;
        v[b] = rotr2(v[b] ^ v[c], 24);
        v[a] = v[a] + v[b] + y & M2;
        v[d] = rotr2(v[d] ^ v[a], 16);
        v[c] = v[c] + v[d] & M2;
        v[b] = rotr2(v[b] ^ v[c], 63);
      };
      for (let r = 0; r < 12; r++) {
        const s = SIGMA[r % 10];
        G2(0, 4, 8, 12, m[s[0]], m[s[1]]);
        G2(1, 5, 9, 13, m[s[2]], m[s[3]]);
        G2(2, 6, 10, 14, m[s[4]], m[s[5]]);
        G2(3, 7, 11, 15, m[s[6]], m[s[7]]);
        G2(0, 5, 10, 15, m[s[8]], m[s[9]]);
        G2(1, 6, 11, 12, m[s[10]], m[s[11]]);
        G2(2, 7, 8, 13, m[s[12]], m[s[13]]);
        G2(3, 4, 9, 14, m[s[14]], m[s[15]]);
      }
      for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
    }
    function blake2b2(data, outLen = 64) {
      if (!(outLen >= 1 && outLen <= 64)) throw new Error("blake2b: output length must be 1..64");
      const h = IV.slice();
      h[0] ^= 0x01010000n ^ BigInt(outLen);
      const n = data.length;
      let off = 0;
      while (n - off > 128) {
        compress(h, data.subarray(off, off + 128), BigInt(off + 128), false);
        off += 128;
      }
      const last = new Uint8Array(128);
      last.set(data.subarray(off));
      compress(h, last, BigInt(n), true);
      const out = new Uint8Array(outLen);
      for (let i = 0; i < outLen; i++) out[i] = Number(h[i >> 3] >> BigInt(8 * (i & 7)) & 0xffn);
      return out;
    }
    var blake2b256 = (data) => blake2b2(data, 32);
    module.exports = { blake2b: blake2b2, blake2b256 };
  }
});

// node_modules/kaspa-ksm/src/bytes.js
var require_bytes = __commonJS({
  "node_modules/kaspa-ksm/src/bytes.js"(exports, module) {
    "use strict";
    function hexToBytes3(hex, label) {
      const s = String(hex == null ? "" : hex).trim().replace(/^0x/i, "").toLowerCase();
      if (s.length % 2 || !/^[0-9a-f]*$/.test(s)) throw new Error(`${label || "value"}: expected hex bytes`);
      const out = new Uint8Array(s.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
      return out;
    }
    function bytesToHex3(b) {
      let s = "";
      for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
      return s;
    }
    function concatBytes2(...parts) {
      const n = parts.reduce((a, p) => a + p.length, 0);
      const out = new Uint8Array(n);
      let o = 0;
      for (const p of parts) {
        out.set(p, o);
        o += p.length;
      }
      return out;
    }
    function bytesEqual(a, b) {
      if (!a || !b || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }
    function utf8(s) {
      return new TextEncoder().encode(String(s));
    }
    function isHex(s, bytes) {
      const h = String(s == null ? "" : s);
      if (!/^[0-9a-f]*$/.test(h) || h.length % 2) return false;
      return bytes === void 0 || h.length === bytes * 2;
    }
    module.exports = { hexToBytes: hexToBytes3, bytesToHex: bytesToHex3, concatBytes: concatBytes2, bytesEqual, utf8, isHex };
  }
});

// node_modules/kaspa-ksm/src/address.js
var require_address = __commonJS({
  "node_modules/kaspa-ksm/src/address.js"(exports, module) {
    "use strict";
    var { blake2b256 } = require_blake2b();
    var { hexToBytes: hexToBytes3, bytesToHex: bytesToHex3, concatBytes: concatBytes2 } = require_bytes();
    var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    var GEN = [0x98f2bc8e61n, 0x79b76d99e2n, 0xf33e5fb3c4n, 0xae2eabe2a8n, 0x1e4f43e470n];
    var NETWORKS2 = {
      mainnet: "kaspa",
      "testnet-10": "kaspatest",
      "testnet-11": "kaspatest",
      "testnet-12": "kaspatest",
      simnet: "kaspasim",
      devnet: "kaspadev"
    };
    function convertBits(data, from, to, pad) {
      let acc = 0, bits = 0;
      const out = [];
      const maxv = (1 << to) - 1;
      for (const v of data) {
        acc = acc << from | v;
        bits += from;
        while (bits >= to) {
          bits -= to;
          out.push(acc >> bits & maxv);
        }
      }
      if (pad && bits > 0) out.push(acc << to - bits & maxv);
      return out;
    }
    function polymod(values) {
      let c = 1n;
      for (const v of values) {
        const c0 = c >> 35n;
        c = (c & 0x07ffffffffn) << 5n ^ BigInt(v);
        for (let i = 0; i < 5; i++) if (c0 >> BigInt(i) & 1n) c ^= GEN[i];
      }
      return c;
    }
    function checksumWords(prefix, words) {
      const hrp = [...prefix].map((ch) => ch.charCodeAt(0) & 31).concat([0]);
      const pm = polymod(hrp.concat(words, [0, 0, 0, 0, 0, 0, 0, 0])) ^ 1n;
      const out = [];
      for (let i = 7; i >= 0; i--) out.push(Number(pm >> BigInt(5 * i) & 31n));
      return out;
    }
    function encodeAddress(prefix, version, payload) {
      const words = convertBits(concatBytes2(Uint8Array.of(version), payload), 8, 5, true);
      return prefix + ":" + words.concat(checksumWords(prefix, words)).map((w) => CHARSET[w]).join("");
    }
    function decodeAddress(addr) {
      const s = String(addr || "").trim();
      if (s !== s.toLowerCase() && s !== s.toUpperCase()) throw new Error("address: mixed case");
      const lower = s.toLowerCase();
      const i = lower.lastIndexOf(":");
      if (i < 1) throw new Error("address: missing prefix");
      const prefix = lower.slice(0, i), data = lower.slice(i + 1);
      if (data.length < 9) throw new Error("address: too short");
      const words = [];
      for (const ch of data) {
        const v = CHARSET.indexOf(ch);
        if (v < 0) throw new Error(`address: invalid character "${ch}"`);
        words.push(v);
      }
      const body = words.slice(0, -8), sum3 = words.slice(-8);
      const want = checksumWords(prefix, body);
      if (want.some((w, k) => w !== sum3[k])) throw new Error("address: bad checksum");
      const bytes = convertBits(body, 5, 8, false);
      return { prefix, version: bytes[0], payload: Uint8Array.from(bytes.slice(1)) };
    }
    function prefixOf(network) {
      const p = NETWORKS2[network];
      if (!p) throw new Error(`unknown network "${network}"`);
      return p;
    }
    function p2shAddress(network, script) {
      const b = typeof script === "string" ? hexToBytes3(script, "script") : script;
      return encodeAddress(prefixOf(network), 8, blake2b256(b));
    }
    function p2pkAddress2(network, pubkeyHex2) {
      const pk = hexToBytes3(pubkeyHex2, "pubkey");
      if (pk.length !== 32) throw new Error("pubkey: expected 32 bytes (x-only Schnorr key)");
      return encodeAddress(prefixOf(network), 0, pk);
    }
    function p2shScriptPublicKey(script) {
      const b = typeof script === "string" ? hexToBytes3(script, "script") : script;
      return { version: 0, script: "aa20" + bytesToHex3(blake2b256(b)) + "87" };
    }
    function pubkeyFromInput(value) {
      if (value == null) return null;
      let s = String(value).trim();
      if (/^[a-z]+:/i.test(s)) {
        try {
          const d = decodeAddress(s);
          if (d.version !== 0 || d.payload.length !== 32) return null;
          return bytesToHex3(d.payload);
        } catch (_) {
          return null;
        }
      }
      s = s.replace(/^0x/i, "").toLowerCase();
      return /^[0-9a-f]{64}$/.test(s) ? s : null;
    }
    module.exports = {
      NETWORKS: NETWORKS2,
      prefixOf,
      encodeAddress,
      decodeAddress,
      p2shAddress,
      p2pkAddress: p2pkAddress2,
      p2shScriptPublicKey,
      pubkeyFromInput
    };
  }
});

// node_modules/kaspa-ksm/src/script.js
var require_script = __commonJS({
  "node_modules/kaspa-ksm/src/script.js"(exports, module) {
    "use strict";
    var { hexToBytes: hexToBytes3, bytesToHex: bytesToHex3, bytesEqual } = require_bytes();
    var OP = {
      OP_0: 0,
      OP_PUSHDATA1: 76,
      OP_PUSHDATA2: 77,
      OP_PUSHDATA4: 78,
      OP_1NEGATE: 79,
      OP_IF: 99,
      OP_NOTIF: 100,
      OP_ELSE: 103,
      OP_ENDIF: 104,
      OP_VERIFY: 105,
      OP_DUP: 118,
      OP_CAT: 126,
      OP_EQUAL: 135,
      OP_NUMEQUAL: 156,
      OP_WITHIN: 165,
      OP_CHECKSIG: 172,
      OP_CHECKSIGVERIFY: 173,
      OP_CHECKMULTISIG: 174,
      OP_CHECKMULTISIGVERIFY: 175,
      OP_CHECKLOCKTIMEVERIFY: 176,
      OP_CHECKSEQUENCEVERIFY: 177
    };
    var NAMES = {
      0: "OP_0",
      79: "OP_1NEGATE",
      97: "OP_NOP",
      99: "OP_IF",
      100: "OP_NOTIF",
      103: "OP_ELSE",
      104: "OP_ENDIF",
      105: "OP_VERIFY",
      106: "OP_RETURN",
      107: "OP_TOALTSTACK",
      108: "OP_FROMALTSTACK",
      109: "OP_2DROP",
      110: "OP_2DUP",
      111: "OP_3DUP",
      112: "OP_2OVER",
      113: "OP_2ROT",
      114: "OP_2SWAP",
      115: "OP_IFDUP",
      116: "OP_DEPTH",
      117: "OP_DROP",
      118: "OP_DUP",
      119: "OP_NIP",
      120: "OP_OVER",
      121: "OP_PICK",
      122: "OP_ROLL",
      123: "OP_ROT",
      124: "OP_SWAP",
      125: "OP_TUCK",
      126: "OP_CAT",
      127: "OP_SUBSTR",
      128: "OP_LEFT",
      129: "OP_RIGHT",
      130: "OP_SIZE",
      135: "OP_EQUAL",
      136: "OP_EQUALVERIFY",
      139: "OP_1ADD",
      140: "OP_1SUB",
      143: "OP_NEGATE",
      144: "OP_ABS",
      145: "OP_NOT",
      146: "OP_0NOTEQUAL",
      147: "OP_ADD",
      148: "OP_SUB",
      154: "OP_BOOLAND",
      155: "OP_BOOLOR",
      156: "OP_NUMEQUAL",
      157: "OP_NUMEQUALVERIFY",
      158: "OP_NUMNOTEQUAL",
      159: "OP_LESSTHAN",
      160: "OP_GREATERTHAN",
      161: "OP_LESSTHANOREQUAL",
      162: "OP_GREATERTHANOREQUAL",
      163: "OP_MIN",
      164: "OP_MAX",
      165: "OP_WITHIN",
      168: "OP_SHA256",
      170: "OP_BLAKE2B",
      172: "OP_CHECKSIG",
      173: "OP_CHECKSIGVERIFY",
      174: "OP_CHECKMULTISIG",
      175: "OP_CHECKMULTISIGVERIFY",
      176: "OP_CHECKLOCKTIMEVERIFY",
      177: "OP_CHECKSEQUENCEVERIFY"
    };
    var LOCK_TIME_THRESHOLD = 500000000000n;
    var toBytes = (s) => typeof s === "string" ? hexToBytes3(s, "script") : s;
    function pushData(bytes) {
      const b = typeof bytes === "string" ? hexToBytes3(bytes) : bytes;
      if (b.length === 0) return "00";
      if (b.length === 1 && b[0] >= 1 && b[0] <= 16) return (80 + b[0]).toString(16);
      if (b.length === 1 && b[0] === 129) return "4f";
      const n = b.length, h = bytesToHex3(b);
      if (n <= 75) return n.toString(16).padStart(2, "0") + h;
      if (n <= 255) return "4c" + n.toString(16).padStart(2, "0") + h;
      if (n <= 65535) return "4d" + (n & 255).toString(16).padStart(2, "0") + (n >> 8 & 255).toString(16).padStart(2, "0") + h;
      throw new Error("push too large");
    }
    function scriptNum(n) {
      let v = BigInt(n);
      if (v === 0n) return new Uint8Array(0);
      const neg = v < 0n;
      if (neg) v = -v;
      const out = [];
      while (v > 0n) {
        out.push(Number(v & 0xffn));
        v >>= 8n;
      }
      if (out[out.length - 1] & 128) out.push(neg ? 128 : 0);
      else if (neg) out[out.length - 1] |= 128;
      return Uint8Array.from(out);
    }
    function decodeScriptNum(b) {
      if (!b.length) return 0n;
      let v = 0n;
      for (let i = b.length - 1; i >= 0; i--) v = v << 8n | BigInt(b[i] & (i === b.length - 1 ? 127 : 255));
      return b[b.length - 1] & 128 ? -v : v;
    }
    function tokenize(script) {
      const b = toBytes(script);
      const toks = [];
      const rd16 = (i2) => b[i2] | b[i2 + 1] << 8;
      const rd32 = (i2) => (b[i2] | b[i2 + 1] << 8 | b[i2 + 2] << 16) + b[i2 + 3] * 16777216;
      let i = 0;
      while (i < b.length) {
        const op = b[i];
        let n = -1, hdr = 1;
        if (op >= 1 && op <= 75) n = op;
        else if (op === 76) {
          n = b[i + 1];
          hdr = 2;
        } else if (op === 77) {
          n = rd16(i + 1);
          hdr = 3;
        } else if (op === 78) {
          n = rd32(i + 1);
          hdr = 5;
        }
        if (n >= 0) {
          if (i + hdr + n > b.length) throw new Error(`script: push at byte ${i} runs past the end`);
          toks.push({ op, data: b.subarray(i + hdr, i + hdr + n), at: i });
          i += hdr + n;
        } else {
          toks.push({ op, data: null, at: i });
          i += 1;
        }
      }
      return toks;
    }
    function disassemble(script) {
      return tokenize(script).map((t) => {
        if (t.data) return "<" + bytesToHex3(t.data) + ">";
        if (t.op >= 81 && t.op <= 96) return "OP_" + (t.op - 80);
        return NAMES[t.op] || "0x" + t.op.toString(16).padStart(2, "0");
      }).join(" ");
    }
    var numOf = (t) => t.op === 0 ? 0n : t.data ? decodeScriptNum(t.data) : t.op >= 81 && t.op <= 96 ? BigInt(t.op - 80) : t.op === 79 ? -1n : null;
    function tagGuardIndex(toks, tagHex) {
      const tag = hexToBytes3(tagHex);
      for (let i = 0; i + 3 < toks.length; i++) {
        if (toks[i].op === 118 && toks[i + 1].data && bytesEqual(toks[i + 1].data, tag) && toks[i + 2].op === 135 && toks[i + 3].op === 99) return i + 4;
      }
      return -1;
    }
    function selectorGuardIndex(toks, n) {
      for (let i = 0; i + 3 < toks.length; i++) {
        const t = toks[i + 1];
        const isN = n === 0 ? t.op === 0 || t.data && t.data.length === 0 : t.op === 80 + n || t.data && t.data.length === 1 && t.data[0] === n;
        if (toks[i].op === 118 && isN && toks[i + 2].op === 156 && toks[i + 3].op === 99) return i + 4;
      }
      return -1;
    }
    function pathTokens(script, dispatch) {
      const toks = tokenize(script);
      const d = dispatch || { kind: "none" };
      if (d.kind === "none") return { tokens: toks, scoped: false, found: true };
      const start = d.kind === "tag" ? tagGuardIndex(toks, d.hex) : selectorGuardIndex(toks, d.n);
      if (start < 0) return { tokens: toks, scoped: false, found: false };
      let depth = 1, end = toks.length;
      for (let i = start; i < toks.length && depth > 0; i++) {
        const t = toks[i];
        if (t.op === 99 || t.op === 100) depth++;
        else if (t.op === 104) depth--;
        else if (t.op === 103 && depth === 1) {
          end = i;
          break;
        }
      }
      return { tokens: toks.slice(start, end), scoped: true, found: true };
    }
    function locksIn(tokens) {
      const locks = { cltv: [], csv: [] };
      let lastPush = null, held = null;
      const isRangeOp = (op) => op === 105 || op >= 159 && op <= 165;
      for (const t of tokens) {
        const n = numOf(t);
        if (n !== null) {
          lastPush = n;
          continue;
        }
        if (t.op === 118) {
          if (lastPush !== null) {
            held = lastPush;
            lastPush = null;
            continue;
          }
          if (held !== null) continue;
        }
        if (isRangeOp(t.op) && held !== null) {
          lastPush = null;
          continue;
        }
        if (t.op === 176 || t.op === 177) {
          const v = lastPush !== null ? lastPush : held;
          if (v !== null) (t.op === 176 ? locks.cltv : locks.csv).push(v);
        }
        lastPush = null;
        held = null;
      }
      return locks;
    }
    function sigOpsIn(tokens) {
      return Math.max(1, tokens.filter((t) => !t.data && t.op >= 172 && t.op <= 175).length);
    }
    function pinnedPayeeIn(tokens) {
      const pre = hexToBytes3("000020"), ac = hexToBytes3("ac");
      for (let i = 0; i + 4 < tokens.length; i++) {
        const [a, k, c1, x, c2] = tokens.slice(i, i + 5);
        if (a.data && bytesEqual(a.data, pre) && k.data && k.data.length === 32 && c1.op === 126 && x.data && bytesEqual(x.data, ac) && c2.op === 126) return bytesToHex3(k.data);
      }
      return null;
    }
    function analyzePath(script, dispatch) {
      const p = pathTokens(script, dispatch);
      const locks = locksIn(p.tokens);
      return {
        guardFound: p.found,
        scoped: p.scoped,
        locks: { cltv: locks.cltv.map(String), csv: locks.csv.map(String) },
        sigOps: sigOpsIn(p.tokens),
        payTo: (() => {
          const k = pinnedPayeeIn(p.tokens);
          return k ? { kind: "p2pk", pubkey: k } : null;
        })()
      };
    }
    module.exports = {
      OP,
      LOCK_TIME_THRESHOLD,
      pushData,
      scriptNum,
      decodeScriptNum,
      tokenize,
      disassemble,
      tagGuardIndex,
      selectorGuardIndex,
      pathTokens,
      locksIn,
      sigOpsIn,
      pinnedPayeeIn,
      analyzePath
    };
  }
});

// node_modules/kaspa-ksm/src/args.js
var require_args = __commonJS({
  "node_modules/kaspa-ksm/src/args.js"(exports, module) {
    "use strict";
    var { hexToBytes: hexToBytes3, bytesToHex: bytesToHex3, utf8, isHex } = require_bytes();
    var { pushData, scriptNum } = require_script();
    var { pubkeyFromInput } = require_address();
    var FIXED = /^byte\[(\d+)\]$/;
    function normType(t) {
      const s = String(t || "").trim().toLowerCase();
      return s === "bytes" ? "byte[]" : s;
    }
    function bytesFrom(v, label) {
      const s = String(v == null ? "" : v);
      if (s.startsWith("text:")) return utf8(s.slice(5));
      return hexToBytes3(s, label);
    }
    function intFrom(v, label) {
      const s = String(v == null ? "" : v).trim();
      if (!/^-?\d+$/.test(s)) throw new Error(`${label}: expected an integer (decimal string)`);
      return BigInt(s);
    }
    function temporalFrom(v, label) {
      const s = String(v == null ? "" : v).trim();
      if (/^-?\d+$/.test(s)) return BigInt(s);
      const ms = Date.parse(s);
      if (!Number.isFinite(ms)) throw new Error(`${label}: expected Unix milliseconds or an ISO date`);
      return BigInt(ms);
    }
    function canonicalValue(type, v, label = "value") {
      const t = normType(type);
      switch (t) {
        case "int":
          return intFrom(v, label).toString();
        case "temporal":
          return temporalFrom(v, label).toString();
        case "bool":
          return v === true || v === "true" || v === 1 || v === "1";
        case "byte": {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0 || n > 255) throw new Error(`${label}: expected a byte 0..255`);
          return n;
        }
        case "pubkey": {
          const pk = pubkeyFromInput(v);
          if (!pk) throw new Error(`${label}: expected a 32-byte x-only public key (hex) or a version-0 kaspa address`);
          return pk;
        }
        case "sig": {
          const b = bytesFrom(v, label);
          if (b.length !== 65) throw new Error(`${label}: a sig is 65 bytes`);
          return bytesToHex3(b);
        }
        case "datasig": {
          const b = bytesFrom(v, label);
          if (b.length !== 64) throw new Error(`${label}: a datasig is 64 bytes`);
          return bytesToHex3(b);
        }
        case "string":
          return String(v == null ? "" : v);
        case "byte[]":
          return bytesToHex3(bytesFrom(v, label));
        default: {
          const m = t.match(FIXED);
          if (m) {
            const b = bytesFrom(v, label);
            if (b.length !== Number(m[1])) throw new Error(`${label}: expected ${m[1]} bytes, got ${b.length}`);
            return bytesToHex3(b);
          }
          throw new Error(`${label}: unsupported type "${type}"`);
        }
      }
    }
    function encodeArg(type, v, label = "argument") {
      const t = normType(type);
      const c = canonicalValue(t, v, label);
      switch (t) {
        case "int":
        case "temporal":
          return pushData(scriptNum(BigInt(c)));
        case "bool":
          return pushData(scriptNum(c ? 1 : 0));
        case "byte":
          return pushData(Uint8Array.of(c));
        case "string":
          return pushData(utf8(c));
        default:
          return pushData(hexToBytes3(c));
      }
    }
    function toSilvercValue(type, v, label = "value") {
      const t = normType(type);
      const c = canonicalValue(t, v, label);
      switch (t) {
        case "int":
          return { kind: "int", value: Number(c) };
        case "temporal":
          return { kind: "int", value: Number(c) };
        case "bool":
          return { kind: "bool", value: c };
        case "byte":
          return { kind: "byte", value: c };
        case "string":
          return { kind: "text", value: c };
        default:
          return { kind: "bytes", value: Array.from(hexToBytes3(c)) };
      }
    }
    function typeFromArtifact(t) {
      if (!t) return "unknown";
      if (typeof t === "string") return t;
      switch (t.kind) {
        case "bytes":
          return "byte[]";
        case "fixed_bytes":
          return `byte[${t.len}]`;
        case "dynamic_array":
          return `${typeFromArtifact(t.item)}[]`;
        case "fixed_array":
          return `${typeFromArtifact(t.item)}[${t.len}]`;
        default:
          return t.kind || "unknown";
      }
    }
    function typeFromAst(r) {
      if (!r) return "unknown";
      let s = r.base || "unknown";
      for (const d of r.array_dims || []) s += d.kind === "dynamic" ? "[]" : `[${d.value}]`;
      return s;
    }
    module.exports = { normType, canonicalValue, encodeArg, toSilvercValue, typeFromArtifact, typeFromAst, isHex };
  }
});

// node_modules/kaspa-ksm/src/manifest.js
var require_manifest = __commonJS({
  "node_modules/kaspa-ksm/src/manifest.js"(exports, module) {
    "use strict";
    var { blake2b256 } = require_blake2b();
    var { hexToBytes: hexToBytes3, bytesToHex: bytesToHex3, isHex } = require_bytes();
    var { NETWORKS: NETWORKS2, prefixOf, decodeAddress, p2shAddress, p2pkAddress: p2pkAddress2, pubkeyFromInput } = require_address();
    var { tokenize, tagGuardIndex, selectorGuardIndex, analyzePath } = require_script();
    var { normType, canonicalValue, typeFromArtifact, typeFromAst } = require_args();
    var KSM_VERSION = 1;
    var MAX_SELECTOR = 16;
    var KNOWN_TYPES = /^(int|bool|byte|temporal|pubkey|sig|datasig|string|byte\[\]|byte\[\d+\])$/;
    var KsmError = class extends Error {
      constructor(message, problems) {
        super(message);
        this.name = "KsmError";
        this.problems = problems || [];
      }
    };
    var clean3 = (h) => String(h == null ? "" : h).trim().replace(/^0x/i, "").toLowerCase();
    var tagHexOf = (t) => Array.isArray(t) ? bytesToHex3(Uint8Array.from(t)) : t ? clean3(t) : null;
    function inferDispatch(entries) {
      const anyTag = entries.some((e) => e.dispatch && e.dispatch.kind === "tag" || e.dispatchTag || e.dispatch_tag);
      return entries.map((e, i) => {
        if (e.dispatch && e.dispatch.kind) {
          const d = e.dispatch;
          return d.kind === "tag" ? { kind: "tag", hex: clean3(d.hex) } : d.kind === "selector" ? { kind: "selector", n: Number(d.n) } : { kind: "none" };
        }
        const tag = tagHexOf(e.dispatchTag || e.dispatch_tag);
        if (tag) return { kind: "tag", hex: tag };
        if (anyTag) return { kind: "none" };
        return entries.length > 1 ? { kind: "selector", n: i } : { kind: "none" };
      });
    }
    function signersFromSource(source, entryName) {
      const src = String(source || "");
      if (!src) return null;
      const re = new RegExp("\\b(?:entry|entrypoint\\s+function)\\s+" + entryName.replace(/\W/g, "") + "\\s*\\([^)]*\\)\\s*\\{", "g");
      const m = re.exec(src);
      if (!m) return null;
      let depth = 1, i = re.lastIndex;
      while (i < src.length && depth > 0) {
        const ch = src[i];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        i++;
      }
      const body = src.slice(re.lastIndex, i - 1);
      const out = [];
      const sigRe = /\bcheckSig\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
      let c;
      while (c = sigRe.exec(body)) out.push({ sig: c[1], key: c[2] });
      return out;
    }
    function create(input) {
      if (!input || typeof input !== "object") throw new KsmError("create: input object required");
      const network = input.network;
      prefixOf(network);
      const scriptBytes = typeof input.script === "string" ? hexToBytes3(input.script, "script") : input.script;
      if (!scriptBytes || !scriptBytes.length) throw new KsmError("create: script is empty");
      tokenize(scriptBytes);
      const scriptHex = bytesToHex3(scriptBytes);
      const src = typeof input.source === "string" ? { text: input.source } : input.source || null;
      const ctorArgs = (Array.isArray(input.constructorArgs) ? input.constructorArgs : []).map((p, i) => {
        const type = normType(p.type);
        return { name: p.name || `param_${i}`, type, value: canonicalValue(type, p.value, p.name || `constructor[${i}]`) };
      });
      const ctorKeys = Object.fromEntries(ctorArgs.filter((p) => p.type === "pubkey").map((p) => [p.name, p.value]));
      const rawEntries = input.entries || [];
      if (!rawEntries.length) throw new KsmError("create: at least one entry is required");
      const dispatch = inferDispatch(rawEntries);
      const entries = rawEntries.map((e, i) => {
        const params = (e.params || e.inputs || []).map((p) => ({ name: p.name, type: normType(typeof p.type === "object" ? typeFromArtifact(p.type) : p.type) }));
        const a = analyzePath(scriptBytes, dispatch[i]);
        const out = { name: e.name, params, dispatch: dispatch[i], locks: a.locks, sigOps: a.sigOps, payTo: a.payTo };
        const s = src && src.text ? signersFromSource(src.text, e.name) : null;
        if (s) {
          out.signers = s.map((x) => {
            const r = { sig: x.sig, key: x.key };
            if (ctorKeys[x.key]) r.pubkey = ctorKeys[x.key];
            else if (params.some((p) => p.name === x.key)) r.open = true;
            return r;
          });
        }
        return out;
      });
      let parties = input.parties;
      if (!parties) parties = ctorArgs.filter((p) => p.type === "pubkey").map((p) => ({ role: p.name, pubkey: p.value }));
      parties = parties.map((p) => {
        const pk = pubkeyFromInput(p.pubkey);
        if (!pk) throw new KsmError(`create: party "${p.role}" has no valid pubkey`);
        const r = { role: p.role, pubkey: pk, address: p2pkAddress2(network, pk) };
        if (p.creator) r.creator = true;
        return r;
      });
      const m = {
        ksm: KSM_VERSION,
        network,
        address: p2shAddress(network, scriptBytes),
        name: input.name || src && src.contract || null,
        script: { hex: scriptHex, hash: bytesToHex3(blake2b256(scriptBytes)) },
        entries
      };
      if (ctorArgs.length) m.constructorArgs = ctorArgs;
      if (parties.length) m.parties = parties;
      if (src && src.text) m.source = { language: src.language || "silverscript", contract: src.contract || null, text: src.text };
      if (input.compiler) m.compiler = input.compiler;
      if (input.funding) m.funding = input.funding;
      if (input.created) m.created = input.created;
      if (input.extensions) m.extensions = input.extensions;
      if (m.name === null) delete m.name;
      if (m.source && m.source.contract === null) delete m.source.contract;
      return m;
    }
    function fromSilvercArtifact(artifact, opts = {}) {
      const art = typeof artifact === "string" ? JSON.parse(artifact) : artifact;
      const asList = (x) => Array.isArray(x) ? x.map((v) => [v.name, v]) : Object.entries(x || {}).map(([k, v]) => [v && v.name ? v.name : k, v]);
      const contracts = asList(art && art.contracts);
      if (!contracts.length) throw new KsmError("artifact has no contracts");
      const [cname, c] = contracts.find(([n]) => n === opts.contract) || contracts[0];
      const comp = c.compiled || {};
      const bytecode = comp.bytecode ? Uint8Array.from(comp.bytecode) : comp.script_hex ? hexToBytes3(comp.script_hex) : null;
      if (!bytecode) throw new KsmError("artifact has no bytecode");
      const entries = asList(c.entries).map(([name, e]) => ({
        name,
        dispatchTag: e.dispatch_tag || null,
        params: (e.params || []).map((p) => ({ name: p.name, type: typeFromArtifact(p.type) }))
      }));
      let ctorArgs = Array.isArray(opts.constructorArgs) ? opts.constructorArgs : null;
      if (!ctorArgs && opts.ast && opts.constructorValues) {
        ctorArgs = (opts.ast.params || []).map((p, i) => ({ name: p.name, type: typeFromAst(p.type_ref), value: opts.constructorValues[i] }));
      }
      const compiler = { name: "silverc" };
      if (art.compiler_version != null) compiler.version = String(art.compiler_version);
      if (art.schema_version != null) compiler.abiSchema = art.schema_version;
      if (Array.isArray(comp.template_hash)) compiler.templateHash = bytesToHex3(Uint8Array.from(comp.template_hash));
      return create({
        network: opts.network,
        script: bytecode,
        entries,
        constructorArgs: ctorArgs || [],
        name: opts.name || cname,
        parties: opts.parties,
        source: opts.source ? { text: opts.source, contract: cname } : null,
        compiler: Object.assign(compiler, opts.compiler || {}),
        funding: opts.funding,
        created: opts.created,
        extensions: opts.extensions
      });
    }
    function parse(input) {
      let m = input;
      if (typeof input === "string" || input instanceof Uint8Array) {
        const text = typeof input === "string" ? input : new TextDecoder().decode(input);
        try {
          m = JSON.parse(text);
        } catch (e) {
          throw new KsmError("not valid JSON: " + e.message);
        }
      }
      const p = [];
      if (!m || typeof m !== "object" || Array.isArray(m)) throw new KsmError("manifest must be a JSON object");
      if (m.ksm !== KSM_VERSION) p.push(`ksm: expected ${KSM_VERSION}, got ${JSON.stringify(m.ksm)}`);
      if (!NETWORKS2[m.network]) p.push(`network: unknown "${m.network}"`);
      if (typeof m.address !== "string") p.push("address: missing");
      if (!m.script || !isHex(m.script.hex) || !m.script.hex.length) p.push("script.hex: missing or not lowercase hex");
      if (!Array.isArray(m.entries) || !m.entries.length) p.push("entries: at least one required");
      else m.entries.forEach((e, i) => {
        if (!e || typeof e.name !== "string" || !e.name) p.push(`entries[${i}].name: missing`);
        if (!Array.isArray(e && e.params)) p.push(`entries[${i}].params: missing`);
        if (!e || !e.dispatch || !["tag", "selector", "none"].includes(e.dispatch.kind)) p.push(`entries[${i}].dispatch: missing or unknown kind`);
      });
      if (p.length) throw new KsmError("invalid manifest: " + p.join("; "), p);
      return m;
    }
    function verify(input) {
      const errors = [], warnings = [];
      let m;
      try {
        m = parse(input);
      } catch (e) {
        return { ok: false, errors: e.problems && e.problems.length ? e.problems : [e.message], warnings, derived: null };
      }
      let script;
      try {
        script = hexToBytes3(m.script.hex);
        tokenize(script);
      } catch (e) {
        return { ok: false, errors: ["script.hex: " + e.message], warnings, derived: null };
      }
      const hash = bytesToHex3(blake2b256(script));
      const address = p2shAddress(m.network, script);
      if (m.script.hash !== void 0 && clean3(m.script.hash) !== hash) errors.push(`script.hash: stored ${m.script.hash}, script hashes to ${hash}`);
      if (m.address !== address) {
        let why = "does not match the script";
        try {
          const d = decodeAddress(m.address);
          if (d.prefix !== prefixOf(m.network)) why = `prefix "${d.prefix}" does not match network ${m.network}`;
        } catch (e) {
          why = e.message;
        }
        errors.push(`address: ${m.address} ${why}; the script gives ${address}`);
      }
      const toks = tokenize(script);
      const names = /* @__PURE__ */ new Set();
      const kinds = new Set(m.entries.map((e) => e.dispatch.kind));
      if (kinds.has("tag") && kinds.size > 1) errors.push("entries: tagged and untagged dispatch mixed in one covenant");
      if (kinds.has("none") && m.entries.length > 1) errors.push('entries: several entries but dispatch "none" (a spender cannot select a path)');
      const derivedEntries = m.entries.map((e, i) => {
        if (names.has(e.name)) errors.push(`entries[${i}]: duplicate name "${e.name}"`);
        names.add(e.name);
        const d = e.dispatch;
        if (d.kind === "tag") {
          if (!/^[0-9a-f]{8}$/.test(clean3(d.hex))) errors.push(`entries[${i}].dispatch.hex: expected 4 bytes hex`);
          else if (tagGuardIndex(toks, clean3(d.hex)) < 0) errors.push(`entries[${i}] (${e.name}): dispatch tag ${d.hex} has no branch in the script`);
        } else if (d.kind === "selector") {
          if (!Number.isInteger(d.n) || d.n < 0 || d.n > MAX_SELECTOR) errors.push(`entries[${i}].dispatch.n: expected 0..${MAX_SELECTOR}`);
          else if (selectorGuardIndex(toks, d.n) < 0) errors.push(`entries[${i}] (${e.name}): selector ${d.n} has no branch in the script`);
        }
        (e.params || []).forEach((p, k) => {
          if (!p || !p.name) errors.push(`entries[${i}].params[${k}]: missing name`);
          else if (!KNOWN_TYPES.test(normType(p.type))) warnings.push(`entries[${i}].params[${k}] (${p.name}): type "${p.type}" has no defined push encoding in ksm/1`);
        });
        const a = analyzePath(script, d);
        const same = (x, y) => JSON.stringify((x || []).map(String)) === JSON.stringify((y || []).map(String));
        if (e.locks && (!same(e.locks.cltv, a.locks.cltv) || !same(e.locks.csv, a.locks.csv)))
          warnings.push(`entries[${i}] (${e.name}): stored locks differ from the script's (${JSON.stringify(a.locks)})`);
        if (e.sigOps !== void 0 && e.sigOps !== a.sigOps) warnings.push(`entries[${i}] (${e.name}): stored sigOps ${e.sigOps}, script has ${a.sigOps}`);
        if (e.payTo !== void 0 && JSON.stringify(e.payTo || null) !== JSON.stringify(a.payTo || null))
          warnings.push(`entries[${i}] (${e.name}): stored payTo differs from the script's (${JSON.stringify(a.payTo)})`);
        return Object.assign({ name: e.name }, a);
      });
      (Array.isArray(m.constructorArgs) ? m.constructorArgs : []).forEach((p, i) => {
        try {
          canonicalValue(p.type, p.value, p.name);
        } catch (e) {
          warnings.push(`constructorArgs[${i}]: ${e.message}`);
        }
      });
      (m.parties || []).forEach((p, i) => {
        const pk = pubkeyFromInput(p.pubkey);
        if (!pk) {
          errors.push(`parties[${i}] (${p.role}): invalid pubkey`);
          return;
        }
        const want = p2pkAddress2(m.network, pk);
        if (p.address && p.address !== want) errors.push(`parties[${i}] (${p.role}): address ${p.address} is not the key's address ${want}`);
      });
      if (!m.source) warnings.push("source: absent; the covenant can be spent but not re-derived or read as source");
      return { ok: errors.length === 0, errors, warnings, derived: { address, hash, entries: derivedEntries } };
    }
    module.exports = { KSM_VERSION, KsmError, create, fromSilvercArtifact, parse, verify, inferDispatch, signersFromSource };
  }
});

// node_modules/kaspa-ksm/src/spend.js
var require_spend = __commonJS({
  "node_modules/kaspa-ksm/src/spend.js"(exports, module) {
    "use strict";
    var { hexToBytes: hexToBytes3, bytesToHex: bytesToHex3 } = require_bytes();
    var { pushData, scriptNum, analyzePath, LOCK_TIME_THRESHOLD } = require_script();
    var { encodeArg, normType } = require_args();
    var { p2pkAddress: p2pkAddress2 } = require_address();
    var { parse } = require_manifest();
    var DAA_PER_DAY2 = 864000n;
    function findEntry(m, name) {
      const e = m.entries.find((x) => x.name === name);
      if (!e) throw new Error(`no entry "${name}"; entries are: ${m.entries.map((x) => x.name).join(", ")}`);
      return e;
    }
    function dispatchPush(d) {
      if (!d || d.kind === "none") return "";
      if (d.kind === "tag") return pushData(hexToBytes3(d.hex));
      if (d.kind === "selector") return pushData(scriptNum(d.n));
      throw new Error("unknown dispatch kind " + d.kind);
    }
    function planSpend(manifest, entryName, opts = {}) {
      const m = parse(manifest);
      const e = findEntry(m, entryName);
      const a = analyzePath(m.script.hex, e.dispatch);
      const args = opts.args || {};
      const layout = [];
      const sigParams = [];
      for (const p of e.params) {
        if (normType(p.type) === "sig") {
          layout.push({ kind: "sig", name: p.name });
          sigParams.push(p.name);
          continue;
        }
        if (!(p.name in args)) throw new Error(`missing argument "${p.name}" (${p.type})`);
        layout.push({ kind: "push", name: p.name, hex: encodeArg(p.type, args[p.name], p.name) });
      }
      const suffixHex = dispatchPush(e.dispatch) + pushData(hexToBytes3(m.script.hex));
      const cltv = a.locks.cltv.map(BigInt), csv = a.locks.csv.map(BigInt);
      const blockers = [];
      let lockTime = 0n, sequence = 0n;
      const daa = opts.chain && opts.chain.daa != null ? BigInt(opts.chain.daa) : null;
      const nowMs = opts.chain && opts.chain.nowMs != null ? BigInt(opts.chain.nowMs) : null;
      const unlock2 = {};
      if (cltv.length) {
        const byDaa = cltv.filter((v) => v < LOCK_TIME_THRESHOLD), byTime = cltv.filter((v) => v >= LOCK_TIME_THRESHOLD);
        if (byDaa.length && byTime.length) blockers.push("path mixes DAA-score and timestamp locks; not spendable in one transaction");
        else if (byTime.length) {
          lockTime = byTime.reduce((x, v) => v > x ? v : x, 0n);
          unlock2.atMs = lockTime.toString();
          if (nowMs === null) blockers.push("unknown: pass chain.nowMs to judge the timestamp lock");
          else if (nowMs < lockTime) blockers.push(`locked until ${new Date(Number(lockTime)).toISOString()}`);
        } else {
          lockTime = byDaa.reduce((x, v) => v > x ? v : x, 0n);
          unlock2.atDaa = lockTime.toString();
          if (daa === null) blockers.push("unknown: pass chain.daa to judge the DAA-score lock");
          else if (daa < lockTime) blockers.push(`locked until DAA ${lockTime} (now ${daa}, about ${(lockTime - daa + DAA_PER_DAY2 - 1n) / DAA_PER_DAY2} day(s))`);
        }
      }
      if (csv.length) {
        sequence = csv.reduce((x, v) => v > x ? v : x, 0n);
        unlock2.ageDaa = sequence.toString();
        if (sequence >= 1n << 32n) blockers.push("relative lock out of range");
        const utxos = opts.utxos || [];
        if (daa === null || !utxos.length) blockers.push(`unknown: coins must be ${sequence} DAA old; pass chain.daa and utxos[].blockDaaScore`);
        else for (const u of utxos) {
          if (u.blockDaaScore == null) {
            blockers.push("unknown: a utxo has no blockDaaScore");
            break;
          }
          const at = BigInt(u.blockDaaScore) + sequence;
          if (daa < at) {
            blockers.push(`coins still aging: unlock at DAA ${at} (now ${daa})`);
            break;
          }
        }
      }
      if (!a.guardFound) blockers.push(`script has no branch for ${e.name}; the manifest and the script disagree`);
      return {
        entry: e.name,
        ready: blockers.length === 0,
        blockers,
        signaturesNeeded: sigParams,
        layout,
        suffixHex,
        lockTime: lockTime.toString(),
        sequence: sequence.toString(),
        sigOpCount: a.sigOps,
        payTo: a.payTo ? Object.assign({}, a.payTo, { address: p2pkAddress2(m.network, a.payTo.pubkey) }) : null,
        unlock: unlock2,
        note: a.sigOps > 1 ? "every input must commit sigOpCount = " + a.sigOps : void 0
      };
    }
    function applyPlan(plan, txJsonString) {
      const tx = typeof txJsonString === "string" ? JSON.parse(txJsonString) : txJsonString;
      if (BigInt(plan.lockTime) > 0n) tx.lockTime = plan.lockTime;
      for (const inp of tx.inputs || []) {
        if (BigInt(plan.sequence) > 0n) inp.sequence = plan.sequence;
        if (plan.sigOpCount > 1) inp.sigOpCount = plan.sigOpCount;
      }
      return JSON.stringify(tx);
    }
    function signatureFromWallet(sigScriptHex) {
      const h = String(sigScriptHex || "").toLowerCase().replace(/^0x/, "");
      if (h.length === 132 && h.startsWith("41")) return h.slice(2);
      if (h.length === 130) return h;
      if (h.length === 128) return h + "01";
      throw new Error("unrecognized signature: expected 41<64-byte sig><sighash>, 65 or 64 bytes");
    }
    function signatureScript(plan, sigs) {
      let out = "";
      for (const x of plan.layout) {
        if (x.kind === "push") {
          out += x.hex;
          continue;
        }
        const s = sigs && sigs[x.name];
        if (!s) throw new Error(`missing signature for "${x.name}"`);
        out += pushData(hexToBytes3(signatureFromWallet(s)));
      }
      return out + plan.suffixHex;
    }
    function finalize(plan, txJsonString, sigsPerInput) {
      const tx = typeof txJsonString === "string" ? JSON.parse(txJsonString) : txJsonString;
      (tx.inputs || []).forEach((inp, i) => {
        inp.signatureScript = signatureScript(plan, sigsPerInput[i]);
      });
      return JSON.stringify(tx);
    }
    module.exports = { planSpend, applyPlan, signatureFromWallet, signatureScript, finalize, DAA_PER_DAY: DAA_PER_DAY2 };
  }
});

// node_modules/kaspa-ksm/src/index.js
var require_src = __commonJS({
  "node_modules/kaspa-ksm/src/index.js"(exports, module) {
    "use strict";
    var manifest = require_manifest();
    var spend = require_spend();
    var address = require_address();
    var script = require_script();
    var args = require_args();
    var { blake2b: blake2b2, blake2b256 } = require_blake2b();
    var bytes = require_bytes();
    module.exports = {
      ...manifest,
      ...spend,
      address,
      script,
      args,
      bytes,
      blake2b: blake2b2,
      blake2b256,
      p2shAddress: address.p2shAddress,
      p2pkAddress: address.p2pkAddress,
      disassemble: script.disassemble
      // buildSpendTx lives in 'kaspa-ksm/sdk' so the core never touches the SDK
    };
  }
});

// widget/src/style.js
var style_default = `
:host {
    --kv-accent: #134e4a;
    --kv-accent-soft: #f0fdfa;
    --kv-accent-line: #99f6e4;
    --kv-ink: #0f172a;
    --kv-text: #334155;
    --kv-muted: #64748b;
    --kv-line: #e5e9f0;
    --kv-bg: #f6f8fb;
    --kv-card: #ffffff;
    --kv-good: #16a34a;
    --kv-warn-bg: #fff7ed; --kv-warn-line: #fed7aa; --kv-warn-ink: #7c2d12;
    --kv-info-bg: #eff6ff; --kv-info-line: #bfdbfe; --kv-info-ink: #1d4ed8;
    --kv-bad: #b91c1c;
    --kv-radius: 16px;
    --kv-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --kv-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    display: block; font-family: var(--kv-font); color: var(--kv-text); font-size: 15px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
button { font: inherit; }
a { color: inherit; }
.kv { max-width: 640px; margin: 0 auto; }
.kv-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.kv-title { margin: 0; font-size: 24px; font-weight: 700; color: var(--kv-ink); letter-spacing: -0.01em; }
.kv-sub { margin: 2px 0 0; font-size: 14px; color: var(--kv-muted); }
.kv-head-r { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.kv-ws { display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 600; border: 1px solid; cursor: pointer; white-space: nowrap; background: #fff; }
.kv-ws-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.kv-ws-online { color: #15803d; border-color: #bbf7d0; background: #f0fdf4; }
.kv-ws-online .kv-ws-dot { box-shadow: 0 0 0 3px rgba(34, 197, 94, .2); }
.kv-ws-stale { color: #b45309; border-color: #fde68a; background: #fffbeb; }
.kv-ws-offline { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
.kv-ws-checking { color: var(--kv-muted); border-color: var(--kv-line); }
.kv-net { font-size: 12px; font-weight: 600; color: var(--kv-warn-ink); background: var(--kv-warn-bg); border: 1px solid var(--kv-warn-line); border-radius: 999px; padding: 3px 10px; white-space: nowrap; }

.kv-card { background: var(--kv-card); border: 1px solid var(--kv-line); border-radius: var(--kv-radius); padding: 22px; margin-bottom: 14px; }
.kv-card h2 { font-size: 17px; font-weight: 600; margin: 0 0 6px; color: var(--kv-ink); }
.kv-card p { margin: 0; }
.kv-card p + p { margin-top: 10px; }
.kv-muted { color: var(--kv-muted); font-size: 13px; }
.kv-center { text-align: center; }
.kv-mono { font-family: var(--kv-mono); font-size: 13px; color: var(--kv-ink); word-break: break-all; }
.kv-gap { margin-top: 14px; }

.kv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px 18px; border-radius: 12px; border: 1px solid var(--kv-accent); background: var(--kv-accent); color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; transition: filter .15s, background .15s; }
.kv-btn:hover:not(:disabled) { filter: brightness(1.12); }
.kv-btn:disabled { opacity: .45; cursor: not-allowed; }
.kv-btn-line { background: #fff; color: var(--kv-accent); }
.kv-btn-line:hover:not(:disabled) { background: var(--kv-accent-soft); filter: none; }
.kv-btn-quiet { background: transparent; border-color: transparent; color: var(--kv-muted); font-weight: 500; }
.kv-btn-quiet:hover:not(:disabled) { color: var(--kv-ink); filter: none; }
.kv-btn-small { white-space: nowrap; flex: none; width: auto; padding: 8px 14px; font-size: 14px; border-radius: 10px; }
.kv-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.kv-link { background: none; border: 0; padding: 0; color: var(--kv-muted); font-size: 13px; cursor: pointer; text-decoration: none; }
.kv-link:hover { color: var(--kv-accent); text-decoration: underline; }

.kv-input { width: 100%; padding: 12px 14px; border: 1.5px solid var(--kv-line); border-radius: 12px; font: inherit; color: var(--kv-ink); background: #fff; outline: none; transition: border-color .15s; }
.kv-input:focus { border-color: var(--kv-accent); }
.kv-input.kv-mono { font-size: 13px; }
.kv-label { display: block; font-size: 13px; font-weight: 600; color: var(--kv-ink); margin: 12px 0 6px; }
.kv-err { color: var(--kv-bad); font-size: 14px; margin-top: 10px; }
.kv-err:empty { display: none; }

/* hero */
.kv-hero { display: flex; gap: 18px; align-items: flex-start; }
.kv-hero svg { flex-shrink: 0; }
.kv-hints { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
.kv-hints div { background: var(--kv-bg); border-radius: 12px; padding: 12px; font-size: 13px; line-height: 1.4; }
.kv-hints b { display: block; color: var(--kv-ink); margin-bottom: 3px; }

/* setup */
.kv-step { display: flex; gap: 14px; }
.kv-num { width: 28px; height: 28px; border-radius: 50%; background: var(--kv-accent); color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-num-done { background: var(--kv-good); }
.kv-num-todo { background: #e2e8f0; color: var(--kv-muted); }
.kv-step-body { flex: 1; min-width: 0; }
.kv-step-body .kv-btn { margin-top: 14px; }
.kv-step-sum { font-size: 14px; color: var(--kv-muted); margin-top: 2px; }
.kv-words { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0 4px; padding: 14px; background: var(--kv-bg); border-radius: 12px; counter-reset: w; }
.kv-words span { font-family: var(--kv-mono); font-size: 14px; color: var(--kv-ink); background: #fff; border: 1px solid var(--kv-line); border-radius: 8px; padding: 7px 9px; }
.kv-words span::before { counter-increment: w; content: counter(w) ". "; color: var(--kv-muted); font-size: 12px; }
.kv-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.kv-tile { border: 1.5px solid var(--kv-line); border-radius: 14px; padding: 14px; cursor: pointer; background: #fff; text-align: left; }
.kv-tile:hover:not(:disabled) { border-color: #c7d2e3; }
.kv-tile:disabled { opacity: .5; cursor: not-allowed; }
.kv-tile-sel { border-color: var(--kv-accent); background: var(--kv-accent-soft); }
.kv-tile b { display: block; font-size: 15px; color: var(--kv-ink); }
.kv-tile span { font-size: 13px; color: var(--kv-muted); line-height: 1.35; }
.kv-wallets { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.kv-wallet { display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; text-align: left; cursor: pointer; }
.kv-wallet:hover:not(:disabled) { border-color: var(--kv-accent); background: var(--kv-bg); }
.kv-wallet:disabled { opacity: .55; cursor: not-allowed; }
.kv-wallet-ic { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 17px; color: #fff; flex: none; }
.kv-wallet-t { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.kv-wallet-t b { font-size: 15px; color: var(--kv-ink); }
.kv-wallet-t span { font-size: 13px; color: var(--kv-muted); }
.kv-ok { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 14px; color: var(--kv-ink); }
.kv-ok svg { flex: none; }
.kv-warn { margin-top: 12px; font-size: 14px; line-height: 1.5; color: var(--kv-warn-ink); background: var(--kv-warn-bg); border: 1px solid var(--kv-warn-line); border-radius: 12px; padding: 12px 14px; }
.kv-check { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; font-size: 14px; line-height: 1.45; cursor: pointer; }
.kv-check input { margin-top: 3px; width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--kv-accent); }
.kv-quiz { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* account */
.kv-balance { text-align: center; padding: 26px 22px 22px; }
.kv-lbl { font-size: 13px; color: var(--kv-muted); text-transform: uppercase; letter-spacing: .06em; }
.kv-amt { font-size: 38px; font-weight: 700; margin: 6px 0 2px; letter-spacing: -0.02em; color: var(--kv-ink); font-variant-numeric: tabular-nums; }
.kv-amt small { font-size: 18px; color: var(--kv-muted); font-weight: 600; margin-left: 6px; }
.kv-pill { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 6px 12px; border-radius: 999px; background: #f0fdf4; color: #166534; font-size: 13px; font-weight: 500; max-width: 100%; }
.kv-pill-off { background: var(--kv-warn-bg); color: var(--kv-warn-ink); }
.kv-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex: none; }
.kv-pill-off .kv-dot { background: #f59e0b; }
.kv-spend { display: flex; align-items: center; gap: 14px; }
.kv-spend-t { flex: 1; min-width: 0; }
.kv-spend-t b { display: block; color: var(--kv-ink); font-size: 15px; }
.kv-spend-amt { font-size: 22px; font-weight: 700; color: var(--kv-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.kv-spend-btns { display: flex; gap: 8px; margin-top: 14px; }
.kv-spend-btns .kv-btn { flex: 1; }

.kv-banner { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; margin-bottom: 14px; background: var(--kv-warn-bg); border: 1px solid var(--kv-warn-line); color: var(--kv-warn-ink); font-size: 14px; }
.kv-banner b { display: block; color: var(--kv-ink); font-size: 15px; margin-bottom: 2px; }
.kv-banner .kv-btn { margin-top: 10px; }
.kv-strip { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; margin-bottom: 14px; background: var(--kv-info-bg); border: 1px solid var(--kv-info-line); }
.kv-strip-ic { width: 36px; height: 36px; border-radius: 10px; background: #dbeafe; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-strip b { display: block; font-size: 15px; margin-bottom: 2px; color: var(--kv-ink); }
.kv-strip p { font-size: 14px; margin: 0; }
.kv-strip .kv-link { color: var(--kv-info-ink); font-weight: 600; margin-top: 6px; display: inline-block; }

.kv-row { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-top: 1px solid #f1f5f9; }
.kv-row:first-of-type { border-top: 0; }
.kv-row-ic { width: 38px; height: 38px; border-radius: 10px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-row-t { flex: 1; min-width: 0; }
.kv-row-t b { display: block; font-size: 15px; color: var(--kv-ink); font-weight: 600; }
.kv-row-t span { font-size: 13px; color: var(--kv-muted); }
.kv-row-amt { font-size: 16px; font-weight: 700; white-space: nowrap; color: var(--kv-ink); font-variant-numeric: tabular-nums; }
.kv-empty { padding: 18px; background: var(--kv-bg); border: 1px dashed #d5dce6; border-radius: 12px; font-size: 14px; color: var(--kv-muted); text-align: center; }
.kv-foot { display: flex; gap: 8px 18px; justify-content: center; flex-wrap: wrap; margin: 6px 0 4px; }
.kv-small-print { text-align: center; font-size: 12px; color: var(--kv-muted); margin-top: 12px; }

/* sheets */
.kv-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 2147483000; }
.kv-sheet { background: #fff; border-radius: 20px; padding: 24px; width: 100%; max-width: 460px; max-height: calc(100vh - 32px); overflow: auto; box-shadow: 0 24px 60px rgba(15, 23, 42, .25); }
.kv-sheet h3 { font-size: 19px; font-weight: 700; margin: 0 0 4px; color: var(--kv-ink); }
.kv-sheet > .kv-muted { margin: 0 0 14px; }
.kv-sheet .kv-btn { margin-top: 10px; }
.kv-amt-in { display: flex; align-items: baseline; gap: 8px; border-bottom: 2px solid var(--kv-line); padding: 6px 0; margin: 4px 0 8px; }
.kv-amt-in input { font: inherit; font-size: 34px; font-weight: 700; border: 0; outline: 0; width: 100%; color: var(--kv-ink); background: transparent; font-variant-numeric: tabular-nums; }
.kv-amt-in span { font-size: 18px; color: var(--kv-muted); font-weight: 600; }
.kv-amt-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 26px; margin-bottom: 10px; }
.kv-tabs { display: flex; gap: 6px; background: var(--kv-bg); border-radius: 12px; padding: 4px; margin: 10px 0 12px; }
.kv-tab { flex: 1; border: 0; background: transparent; border-radius: 9px; padding: 8px 6px; font-size: 13px; font-weight: 600; color: var(--kv-muted); cursor: pointer; }
.kv-tab-on { background: #fff; color: var(--kv-ink); box-shadow: 0 1px 3px rgba(15,23,42,.12); }
.kv-note { font-size: 14px; line-height: 1.5; background: var(--kv-bg); border-radius: 12px; padding: 12px 14px; margin: 10px 0; }
.kv-note b { color: var(--kv-ink); }
.kv-pick { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; max-height: 40vh; overflow: auto; }
.kv-pick label { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border: 1.5px solid var(--kv-line); border-radius: 12px; cursor: pointer; }
.kv-pick input { width: 18px; height: 18px; accent-color: var(--kv-accent); }
.kv-pick b { display: block; color: var(--kv-ink); }
.kv-pick span { font-size: 13px; color: var(--kv-muted); }
.kv-qr { display: flex; gap: 16px; align-items: center; margin: 8px 0; }
.kv-qr-box { width: 132px; height: 132px; flex: none; border: 1px solid var(--kv-line); border-radius: 10px; overflow: hidden; background: #fff; }
.kv-qr-box svg { width: 100%; height: 100%; display: block; }
.kv-kv { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 13px; margin: 12px 0; }
.kv-kv dt { color: var(--kv-muted); }
.kv-kv dd { margin: 0; font-family: var(--kv-mono); color: var(--kv-ink); word-break: break-all; }
.kv-progress { display: flex; flex-direction: column; gap: 10px; margin: 16px 0 6px; }
.kv-pstep { display: flex; align-items: center; gap: 12px; font-size: 15px; color: #94a3b8; }
.kv-pdot { width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0; color: var(--kv-muted); font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-pstep-done { color: var(--kv-ink); }
.kv-pstep-done .kv-pdot { background: var(--kv-good); color: #fff; }
.kv-pstep-now { color: var(--kv-ink); }
.kv-pstep-now .kv-pdot { background: var(--kv-accent); color: #fff; animation: kv-pulse 1.4s ease-in-out infinite; }
@keyframes kv-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(19, 78, 74, .35); } 50% { box-shadow: 0 0 0 6px rgba(19, 78, 74, 0); } }
.kv-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--kv-ink); color: #fff; padding: 11px 18px; border-radius: 12px; font-size: 14px; z-index: 2147483001; box-shadow: 0 10px 30px rgba(0,0,0,.2); max-width: calc(100vw - 32px); }
.kv-toast-bad { background: var(--kv-bad); }

@media (max-width: 520px) {
    .kv-card { padding: 18px; }
    .kv-hero { flex-direction: column; gap: 12px; }
    .kv-hints, .kv-tiles { grid-template-columns: 1fr; }
    .kv-words { grid-template-columns: repeat(2, 1fr); }
    .kv-amt { font-size: 32px; }
    .kv-row2 .kv-btn { padding: 12px 10px; font-size: 14px; }
    .kv-qr { flex-direction: column; align-items: flex-start; }
    .kv-overlay { align-items: flex-end; padding: 0; }
    .kv-sheet { border-radius: 20px 20px 0 0; max-height: 92vh; }
}
`;

// node_modules/qrcode-generator/dist/qrcode.mjs
var qrcode = function(typeNumber, errorCorrectionLevel) {
  const PAD0 = 236;
  const PAD1 = 17;
  let _typeNumber = typeNumber;
  const _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
  let _modules = null;
  let _moduleCount = 0;
  let _dataCache = null;
  const _dataList = [];
  const _this = {};
  const makeImpl = function(test, maskPattern) {
    _moduleCount = _typeNumber * 4 + 17;
    _modules = (function(moduleCount) {
      const modules = new Array(moduleCount);
      for (let row = 0; row < moduleCount; row += 1) {
        modules[row] = new Array(moduleCount);
        for (let col = 0; col < moduleCount; col += 1) {
          modules[row][col] = null;
        }
      }
      return modules;
    })(_moduleCount);
    setupPositionProbePattern(0, 0);
    setupPositionProbePattern(_moduleCount - 7, 0);
    setupPositionProbePattern(0, _moduleCount - 7);
    setupPositionAdjustPattern();
    setupTimingPattern();
    setupTypeInfo(test, maskPattern);
    if (_typeNumber >= 7) {
      setupTypeNumber(test);
    }
    if (_dataCache == null) {
      _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
    }
    mapData(_dataCache, maskPattern);
  };
  const setupPositionProbePattern = function(row, col) {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || _moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || _moduleCount <= col + c) continue;
        if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
          _modules[row + r][col + c] = true;
        } else {
          _modules[row + r][col + c] = false;
        }
      }
    }
  };
  const getBestMaskPattern = function() {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i += 1) {
      makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(_this);
      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  };
  const setupTimingPattern = function() {
    for (let r = 8; r < _moduleCount - 8; r += 1) {
      if (_modules[r][6] != null) {
        continue;
      }
      _modules[r][6] = r % 2 == 0;
    }
    for (let c = 8; c < _moduleCount - 8; c += 1) {
      if (_modules[6][c] != null) {
        continue;
      }
      _modules[6][c] = c % 2 == 0;
    }
  };
  const setupPositionAdjustPattern = function() {
    const pos = QRUtil.getPatternPosition(_typeNumber);
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {
        const row = pos[i];
        const col = pos[j];
        if (_modules[row][col] != null) {
          continue;
        }
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
              _modules[row + r][col + c] = true;
            } else {
              _modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  };
  const setupTypeNumber = function(test) {
    const bits = QRUtil.getBCHTypeNumber(_typeNumber);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  };
  const setupTypeInfo = function(test, maskPattern) {
    const data = _errorCorrectionLevel << 3 | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 6) {
        _modules[i][8] = mod;
      } else if (i < 8) {
        _modules[i + 1][8] = mod;
      } else {
        _modules[_moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && (bits >> i & 1) == 1;
      if (i < 8) {
        _modules[8][_moduleCount - i - 1] = mod;
      } else if (i < 9) {
        _modules[8][15 - i - 1 + 1] = mod;
      } else {
        _modules[8][15 - i - 1] = mod;
      }
    }
    _modules[_moduleCount - 8][8] = !test;
  };
  const mapData = function(data, maskPattern) {
    let inc = -1;
    let row = _moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const maskFunc = QRUtil.getMaskFunction(maskPattern);
    for (let col = _moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          if (_modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (data[byteIndex] >>> bitIndex & 1) == 1;
            }
            const mask = maskFunc(row, col - c);
            if (mask) {
              dark = !dark;
            }
            _modules[row][col - c] = dark;
            bitIndex -= 1;
            if (bitIndex == -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || _moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  };
  const createBytes = function(buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r += 1) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i += 1) {
        dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i += 1) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < dcdata[r].length) {
          data[index] = dcdata[r][i];
          index += 1;
        }
      }
    }
    for (let i = 0; i < maxEcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < ecdata[r].length) {
          data[index] = ecdata[r][i];
          index += 1;
        }
      }
    }
    return data;
  };
  const createData = function(typeNumber2, errorCorrectionLevel2, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, errorCorrectionLevel2);
    const buffer = qrBitBuffer();
    for (let i = 0; i < dataList.length; i += 1) {
      const data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD1, 8);
    }
    return createBytes(buffer, rsBlocks);
  };
  _this.addData = function(data, mode) {
    mode = mode || "Byte";
    let newData = null;
    switch (mode) {
      case "Numeric":
        newData = qrNumber(data);
        break;
      case "Alphanumeric":
        newData = qrAlphaNum(data);
        break;
      case "Byte":
        newData = qr8BitByte(data);
        break;
      case "Kanji":
        newData = qrKanji(data);
        break;
      default:
        throw "mode:" + mode;
    }
    _dataList.push(newData);
    _dataCache = null;
  };
  _this.isDark = function(row, col) {
    if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
      throw row + "," + col;
    }
    return _modules[row][col];
  };
  _this.getModuleCount = function() {
    return _moduleCount;
  };
  _this.make = function() {
    if (_typeNumber < 1) {
      let typeNumber2 = 1;
      for (; typeNumber2 < 40; typeNumber2++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, _errorCorrectionLevel);
        const buffer = qrBitBuffer();
        for (let i = 0; i < _dataList.length; i++) {
          const data = _dataList[i];
          buffer.put(data.getMode(), 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
          data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8) {
          break;
        }
      }
      _typeNumber = typeNumber2;
    }
    makeImpl(false, getBestMaskPattern());
  };
  _this.createTableTag = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    let qrHtml = "";
    qrHtml += '<table style="';
    qrHtml += " border-width: 0px; border-style: none;";
    qrHtml += " border-collapse: collapse;";
    qrHtml += " padding: 0px; margin: " + margin + "px;";
    qrHtml += '">';
    qrHtml += "<tbody>";
    for (let r = 0; r < _this.getModuleCount(); r += 1) {
      qrHtml += "<tr>";
      for (let c = 0; c < _this.getModuleCount(); c += 1) {
        qrHtml += '<td style="';
        qrHtml += " border-width: 0px; border-style: none;";
        qrHtml += " border-collapse: collapse;";
        qrHtml += " padding: 0px; margin: 0px;";
        qrHtml += " width: " + cellSize + "px;";
        qrHtml += " height: " + cellSize + "px;";
        qrHtml += " background-color: ";
        qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
        qrHtml += ";";
        qrHtml += '"/>';
      }
      qrHtml += "</tr>";
    }
    qrHtml += "</tbody>";
    qrHtml += "</table>";
    return qrHtml;
  };
  _this.createSvgTag = function(cellSize, margin, alt, title) {
    let opts = {};
    if (typeof arguments[0] == "object") {
      opts = arguments[0];
      cellSize = opts.cellSize;
      margin = opts.margin;
      alt = opts.alt;
      title = opts.title;
    }
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    alt = typeof alt === "string" ? { text: alt } : alt || {};
    alt.text = alt.text || null;
    alt.id = alt.text ? alt.id || "qrcode-description" : null;
    title = typeof title === "string" ? { text: title } : title || {};
    title.text = title.text || null;
    title.id = title.text ? title.id || "qrcode-title" : null;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let c, mc, r, mr, qrSvg2 = "", rect;
    rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
    qrSvg2 += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    qrSvg2 += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : "";
    qrSvg2 += ' viewBox="0 0 ' + size + " " + size + '" ';
    qrSvg2 += ' preserveAspectRatio="xMinYMin meet"';
    qrSvg2 += title.text || alt.text ? ' role="img" aria-labelledby="' + escapeXml([title.id, alt.id].join(" ").trim()) + '"' : "";
    qrSvg2 += ">";
    qrSvg2 += title.text ? '<title id="' + escapeXml(title.id) + '">' + escapeXml(title.text) + "</title>" : "";
    qrSvg2 += alt.text ? '<description id="' + escapeXml(alt.id) + '">' + escapeXml(alt.text) + "</description>" : "";
    qrSvg2 += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
    qrSvg2 += '<path d="';
    for (r = 0; r < _this.getModuleCount(); r += 1) {
      mr = r * cellSize + margin;
      for (c = 0; c < _this.getModuleCount(); c += 1) {
        if (_this.isDark(r, c)) {
          mc = c * cellSize + margin;
          qrSvg2 += "M" + mc + "," + mr + rect;
        }
      }
    }
    qrSvg2 += '" stroke="transparent" fill="black"/>';
    qrSvg2 += "</svg>";
    return qrSvg2;
  };
  _this.createDataURL = function(cellSize, margin) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    return createDataURL(size, size, function(x, y) {
      if (min <= x && x < max && min <= y && y < max) {
        const c = Math.floor((x - min) / cellSize);
        const r = Math.floor((y - min) / cellSize);
        return _this.isDark(r, c) ? 0 : 1;
      } else {
        return 1;
      }
    });
  };
  _this.createImgTag = function(cellSize, margin, alt) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    let img = "";
    img += "<img";
    img += ' src="';
    img += _this.createDataURL(cellSize, margin);
    img += '"';
    img += ' width="';
    img += size;
    img += '"';
    img += ' height="';
    img += size;
    img += '"';
    if (alt) {
      img += ' alt="';
      img += escapeXml(alt);
      img += '"';
    }
    img += "/>";
    return img;
  };
  const escapeXml = function(s) {
    let escaped = "";
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charAt(i);
      switch (c) {
        case "<":
          escaped += "&lt;";
          break;
        case ">":
          escaped += "&gt;";
          break;
        case "&":
          escaped += "&amp;";
          break;
        case '"':
          escaped += "&quot;";
          break;
        default:
          escaped += c;
          break;
      }
    }
    return escaped;
  };
  const _createHalfASCII = function(margin) {
    const cellSize = 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r1, r2, p;
    const blocks = {
      "\u2588\u2588": "\u2588",
      "\u2588 ": "\u2580",
      " \u2588": "\u2584",
      "  ": " "
    };
    const blocksLastLineNoMargin = {
      "\u2588\u2588": "\u2580",
      "\u2588 ": "\u2580",
      " \u2588": " ",
      "  ": " "
    };
    let ascii = "";
    for (y = 0; y < size; y += 2) {
      r1 = Math.floor((y - min) / cellSize);
      r2 = Math.floor((y + 1 - min) / cellSize);
      for (x = 0; x < size; x += 1) {
        p = "\u2588";
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
          p = " ";
        }
        if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
          p += " ";
        } else {
          p += "\u2588";
        }
        ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
      }
      ascii += "\n";
    }
    if (size % 2 && margin > 0) {
      return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("\u2580");
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.createASCII = function(cellSize, margin) {
    cellSize = cellSize || 1;
    if (cellSize < 2) {
      return _createHalfASCII(margin);
    }
    cellSize -= 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;
    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;
    let y, x, r, p;
    const white = Array(cellSize + 1).join("\u2588\u2588");
    const black = Array(cellSize + 1).join("  ");
    let ascii = "";
    let line = "";
    for (y = 0; y < size; y += 1) {
      r = Math.floor((y - min) / cellSize);
      line = "";
      for (x = 0; x < size; x += 1) {
        p = 1;
        if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
          p = 0;
        }
        line += p ? white : black;
      }
      for (r = 0; r < cellSize; r += 1) {
        ascii += line + "\n";
      }
    }
    return ascii.substring(0, ascii.length - 1);
  };
  _this.renderTo2dContext = function(context, cellSize) {
    cellSize = cellSize || 2;
    const length = _this.getModuleCount();
    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        context.fillStyle = _this.isDark(row, col) ? "black" : "white";
        context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  };
  return _this;
};
qrcode.stringToBytes = function(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    bytes.push(c & 255);
  }
  return bytes;
};
qrcode.createStringToBytes = function(unicodeData, numChars) {
  const unicodeMap = (function() {
    const bin = base64DecodeInputStream(unicodeData);
    const read = function() {
      const b = bin.read();
      if (b == -1) throw "eof";
      return b;
    };
    let count = 0;
    const unicodeMap2 = {};
    while (true) {
      const b0 = bin.read();
      if (b0 == -1) break;
      const b1 = read();
      const b2 = read();
      const b3 = read();
      const k = String.fromCharCode(b0 << 8 | b1);
      const v = b2 << 8 | b3;
      unicodeMap2[k] = v;
      count += 1;
    }
    if (count != numChars) {
      throw count + " != " + numChars;
    }
    return unicodeMap2;
  })();
  const unknownChar = "?".charCodeAt(0);
  return function(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else {
        const b = unicodeMap[s.charAt(i)];
        if (typeof b == "number") {
          if ((b & 255) == b) {
            bytes.push(b);
          } else {
            bytes.push(b >>> 8);
            bytes.push(b & 255);
          }
        } else {
          bytes.push(unknownChar);
        }
      }
    }
    return bytes;
  };
};
var QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3
};
var QRErrorCorrectionLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
};
var QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
};
var QRUtil = (function() {
  const PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170]
  ];
  const G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
  const G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
  const G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
  const _this = {};
  const getBCHDigit = function(data) {
    let digit = 0;
    while (data != 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  };
  _this.getBCHTypeInfo = function(data) {
    let d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
      d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
    }
    return (data << 10 | d) ^ G15_MASK;
  };
  _this.getBCHTypeNumber = function(data) {
    let d = data << 12;
    while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
      d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
    }
    return data << 12 | d;
  };
  _this.getPatternPosition = function(typeNumber) {
    return PATTERN_POSITION_TABLE[typeNumber - 1];
  };
  _this.getMaskFunction = function(maskPattern) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return function(i, j) {
          return (i + j) % 2 == 0;
        };
      case QRMaskPattern.PATTERN001:
        return function(i, j) {
          return i % 2 == 0;
        };
      case QRMaskPattern.PATTERN010:
        return function(i, j) {
          return j % 3 == 0;
        };
      case QRMaskPattern.PATTERN011:
        return function(i, j) {
          return (i + j) % 3 == 0;
        };
      case QRMaskPattern.PATTERN100:
        return function(i, j) {
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        };
      case QRMaskPattern.PATTERN101:
        return function(i, j) {
          return i * j % 2 + i * j % 3 == 0;
        };
      case QRMaskPattern.PATTERN110:
        return function(i, j) {
          return (i * j % 2 + i * j % 3) % 2 == 0;
        };
      case QRMaskPattern.PATTERN111:
        return function(i, j) {
          return (i * j % 3 + (i + j) % 2) % 2 == 0;
        };
      default:
        throw "bad maskPattern:" + maskPattern;
    }
  };
  _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
    let a = qrPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i += 1) {
      a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  };
  _this.getLengthInBits = function(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 41) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw "mode:" + mode;
      }
    } else {
      throw "type:" + type;
    }
  };
  _this.getLostPoint = function(qrcode2) {
    const moduleCount = qrcode2.getModuleCount();
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        let sameCount = 0;
        const dark = qrcode2.isDark(row, col);
        for (let r = -1; r <= 1; r += 1) {
          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }
          for (let c = -1; c <= 1; c += 1) {
            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }
            if (r == 0 && c == 0) {
              continue;
            }
            if (dark == qrcode2.isDark(row + r, col + c)) {
              sameCount += 1;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }
    ;
    for (let row = 0; row < moduleCount - 1; row += 1) {
      for (let col = 0; col < moduleCount - 1; col += 1) {
        let count = 0;
        if (qrcode2.isDark(row, col)) count += 1;
        if (qrcode2.isDark(row + 1, col)) count += 1;
        if (qrcode2.isDark(row, col + 1)) count += 1;
        if (qrcode2.isDark(row + 1, col + 1)) count += 1;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount - 6; col += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row, col + 1) && qrcode2.isDark(row, col + 2) && qrcode2.isDark(row, col + 3) && qrcode2.isDark(row, col + 4) && !qrcode2.isDark(row, col + 5) && qrcode2.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount - 6; row += 1) {
        if (qrcode2.isDark(row, col) && !qrcode2.isDark(row + 1, col) && qrcode2.isDark(row + 2, col) && qrcode2.isDark(row + 3, col) && qrcode2.isDark(row + 4, col) && !qrcode2.isDark(row + 5, col) && qrcode2.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount; row += 1) {
        if (qrcode2.isDark(row, col)) {
          darkCount += 1;
        }
      }
    }
    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  };
  return _this;
})();
var QRMath = (function() {
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i += 1) {
    EXP_TABLE[i] = 1 << i;
  }
  for (let i = 8; i < 256; i += 1) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i += 1) {
    LOG_TABLE[EXP_TABLE[i]] = i;
  }
  const _this = {};
  _this.glog = function(n) {
    if (n < 1) {
      throw "glog(" + n + ")";
    }
    return LOG_TABLE[n];
  };
  _this.gexp = function(n) {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return EXP_TABLE[n];
  };
  return _this;
})();
var qrPolynomial = function(num, shift) {
  if (typeof num.length == "undefined") {
    throw num.length + "/" + shift;
  }
  const _num = (function() {
    let offset = 0;
    while (offset < num.length && num[offset] == 0) {
      offset += 1;
    }
    const _num2 = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i += 1) {
      _num2[i] = num[i + offset];
    }
    return _num2;
  })();
  const _this = {};
  _this.getAt = function(index) {
    return _num[index];
  };
  _this.getLength = function() {
    return _num.length;
  };
  _this.multiply = function(e) {
    const num2 = new Array(_this.getLength() + e.getLength() - 1);
    for (let i = 0; i < _this.getLength(); i += 1) {
      for (let j = 0; j < e.getLength(); j += 1) {
        num2[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
      }
    }
    return qrPolynomial(num2, 0);
  };
  _this.mod = function(e) {
    if (_this.getLength() - e.getLength() < 0) {
      return _this;
    }
    const ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
    const num2 = new Array(_this.getLength());
    for (let i = 0; i < _this.getLength(); i += 1) {
      num2[i] = _this.getAt(i);
    }
    for (let i = 0; i < e.getLength(); i += 1) {
      num2[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
    }
    return qrPolynomial(num2, 0).mod(e);
  };
  return _this;
};
var QRRSBlock = (function() {
  const RS_BLOCK_TABLE = [
    // L
    // M
    // Q
    // H
    // 1
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    // 2
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    // 3
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    // 4
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    // 5
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    // 6
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    // 7
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    // 8
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    // 9
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    // 10
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    // 11
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    // 12
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    // 13
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    // 14
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    // 15
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    // 16
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    // 17
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    // 18
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    // 19
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    // 20
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    // 21
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    // 22
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    // 23
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    // 24
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    // 25
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    // 26
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    // 27
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    // 28
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    // 29
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    // 30
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    // 31
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    // 32
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    // 33
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    // 34
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    // 35
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    // 36
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    // 37
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    // 38
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    // 39
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    // 40
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16]
  ];
  const qrRSBlock = function(totalCount, dataCount) {
    const _this2 = {};
    _this2.totalCount = totalCount;
    _this2.dataCount = dataCount;
    return _this2;
  };
  const _this = {};
  const getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H:
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return void 0;
    }
  };
  _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
    const rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (typeof rsBlock == "undefined") {
      throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i += 1) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j += 1) {
        list.push(qrRSBlock(totalCount, dataCount));
      }
    }
    return list;
  };
  return _this;
})();
var qrBitBuffer = function() {
  const _buffer = [];
  let _length = 0;
  const _this = {};
  _this.getBuffer = function() {
    return _buffer;
  };
  _this.getAt = function(index) {
    const bufIndex = Math.floor(index / 8);
    return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
  };
  _this.put = function(num, length) {
    for (let i = 0; i < length; i += 1) {
      _this.putBit((num >>> length - i - 1 & 1) == 1);
    }
  };
  _this.getLengthInBits = function() {
    return _length;
  };
  _this.putBit = function(bit) {
    const bufIndex = Math.floor(_length / 8);
    if (_buffer.length <= bufIndex) {
      _buffer.push(0);
    }
    if (bit) {
      _buffer[bufIndex] |= 128 >>> _length % 8;
    }
    _length += 1;
  };
  return _this;
};
var qrNumber = function(data) {
  const _mode = QRMode.MODE_NUMBER;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const data2 = _data;
    let i = 0;
    while (i + 2 < data2.length) {
      buffer.put(strToNum(data2.substring(i, i + 3)), 10);
      i += 3;
    }
    if (i < data2.length) {
      if (data2.length - i == 1) {
        buffer.put(strToNum(data2.substring(i, i + 1)), 4);
      } else if (data2.length - i == 2) {
        buffer.put(strToNum(data2.substring(i, i + 2)), 7);
      }
    }
  };
  const strToNum = function(s) {
    let num = 0;
    for (let i = 0; i < s.length; i += 1) {
      num = num * 10 + chatToNum(s.charAt(i));
    }
    return num;
  };
  const chatToNum = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    }
    throw "illegal char :" + c;
  };
  return _this;
};
var qrAlphaNum = function(data) {
  const _mode = QRMode.MODE_ALPHA_NUM;
  const _data = data;
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _data.length;
  };
  _this.write = function(buffer) {
    const s = _data;
    let i = 0;
    while (i + 1 < s.length) {
      buffer.put(
        getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)),
        11
      );
      i += 2;
    }
    if (i < s.length) {
      buffer.put(getCode(s.charAt(i)), 6);
    }
  };
  const getCode = function(c) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    } else if ("A" <= c && c <= "Z") {
      return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
    } else {
      switch (c) {
        case " ":
          return 36;
        case "$":
          return 37;
        case "%":
          return 38;
        case "*":
          return 39;
        case "+":
          return 40;
        case "-":
          return 41;
        case ".":
          return 42;
        case "/":
          return 43;
        case ":":
          return 44;
        default:
          throw "illegal char :" + c;
      }
    }
  };
  return _this;
};
var qr8BitByte = function(data) {
  const _mode = QRMode.MODE_8BIT_BYTE;
  const _data = data;
  const _bytes = qrcode.stringToBytes(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return _bytes.length;
  };
  _this.write = function(buffer) {
    for (let i = 0; i < _bytes.length; i += 1) {
      buffer.put(_bytes[i], 8);
    }
  };
  return _this;
};
var qrKanji = function(data) {
  const _mode = QRMode.MODE_KANJI;
  const _data = data;
  const stringToBytes2 = qrcode.stringToBytes;
  !(function(c, code) {
    const test = stringToBytes2(c);
    if (test.length != 2 || (test[0] << 8 | test[1]) != code) {
      throw "sjis not supported.";
    }
  })("\u53CB", 38726);
  const _bytes = stringToBytes2(data);
  const _this = {};
  _this.getMode = function() {
    return _mode;
  };
  _this.getLength = function(buffer) {
    return ~~(_bytes.length / 2);
  };
  _this.write = function(buffer) {
    const data2 = _bytes;
    let i = 0;
    while (i + 1 < data2.length) {
      let c = (255 & data2[i]) << 8 | 255 & data2[i + 1];
      if (33088 <= c && c <= 40956) {
        c -= 33088;
      } else if (57408 <= c && c <= 60351) {
        c -= 49472;
      } else {
        throw "illegal char at " + (i + 1) + "/" + c;
      }
      c = (c >>> 8 & 255) * 192 + (c & 255);
      buffer.put(c, 13);
      i += 2;
    }
    if (i < data2.length) {
      throw "illegal char at " + (i + 1);
    }
  };
  return _this;
};
var byteArrayOutputStream = function() {
  const _bytes = [];
  const _this = {};
  _this.writeByte = function(b) {
    _bytes.push(b & 255);
  };
  _this.writeShort = function(i) {
    _this.writeByte(i);
    _this.writeByte(i >>> 8);
  };
  _this.writeBytes = function(b, off, len) {
    off = off || 0;
    len = len || b.length;
    for (let i = 0; i < len; i += 1) {
      _this.writeByte(b[i + off]);
    }
  };
  _this.writeString = function(s) {
    for (let i = 0; i < s.length; i += 1) {
      _this.writeByte(s.charCodeAt(i));
    }
  };
  _this.toByteArray = function() {
    return _bytes;
  };
  _this.toString = function() {
    let s = "";
    s += "[";
    for (let i = 0; i < _bytes.length; i += 1) {
      if (i > 0) {
        s += ",";
      }
      s += _bytes[i];
    }
    s += "]";
    return s;
  };
  return _this;
};
var base64EncodeOutputStream = function() {
  let _buffer = 0;
  let _buflen = 0;
  let _length = 0;
  let _base64 = "";
  const _this = {};
  const writeEncoded = function(b) {
    _base64 += String.fromCharCode(encode(b & 63));
  };
  const encode = function(n) {
    if (n < 0) {
      throw "n:" + n;
    } else if (n < 26) {
      return 65 + n;
    } else if (n < 52) {
      return 97 + (n - 26);
    } else if (n < 62) {
      return 48 + (n - 52);
    } else if (n == 62) {
      return 43;
    } else if (n == 63) {
      return 47;
    } else {
      throw "n:" + n;
    }
  };
  _this.writeByte = function(n) {
    _buffer = _buffer << 8 | n & 255;
    _buflen += 8;
    _length += 1;
    while (_buflen >= 6) {
      writeEncoded(_buffer >>> _buflen - 6);
      _buflen -= 6;
    }
  };
  _this.flush = function() {
    if (_buflen > 0) {
      writeEncoded(_buffer << 6 - _buflen);
      _buffer = 0;
      _buflen = 0;
    }
    if (_length % 3 != 0) {
      const padlen = 3 - _length % 3;
      for (let i = 0; i < padlen; i += 1) {
        _base64 += "=";
      }
    }
  };
  _this.toString = function() {
    return _base64;
  };
  return _this;
};
var base64DecodeInputStream = function(str) {
  const _str = str;
  let _pos = 0;
  let _buffer = 0;
  let _buflen = 0;
  const _this = {};
  _this.read = function() {
    while (_buflen < 8) {
      if (_pos >= _str.length) {
        if (_buflen == 0) {
          return -1;
        }
        throw "unexpected end of file./" + _buflen;
      }
      const c = _str.charAt(_pos);
      _pos += 1;
      if (c == "=") {
        _buflen = 0;
        return -1;
      } else if (c.match(/^\s$/)) {
        continue;
      }
      _buffer = _buffer << 6 | decode(c.charCodeAt(0));
      _buflen += 6;
    }
    const n = _buffer >>> _buflen - 8 & 255;
    _buflen -= 8;
    return n;
  };
  const decode = function(c) {
    if (65 <= c && c <= 90) {
      return c - 65;
    } else if (97 <= c && c <= 122) {
      return c - 97 + 26;
    } else if (48 <= c && c <= 57) {
      return c - 48 + 52;
    } else if (c == 43) {
      return 62;
    } else if (c == 47) {
      return 63;
    } else {
      throw "c:" + c;
    }
  };
  return _this;
};
var gifImage = function(width, height) {
  const _width = width;
  const _height = height;
  const _data = new Array(width * height);
  const _this = {};
  _this.setPixel = function(x, y, pixel) {
    _data[y * _width + x] = pixel;
  };
  _this.write = function(out) {
    out.writeString("GIF87a");
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(128);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(0);
    out.writeByte(255);
    out.writeByte(255);
    out.writeByte(255);
    out.writeString(",");
    out.writeShort(0);
    out.writeShort(0);
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(0);
    const lzwMinCodeSize = 2;
    const raster = getLZWRaster(lzwMinCodeSize);
    out.writeByte(lzwMinCodeSize);
    let offset = 0;
    while (raster.length - offset > 255) {
      out.writeByte(255);
      out.writeBytes(raster, offset, 255);
      offset += 255;
    }
    out.writeByte(raster.length - offset);
    out.writeBytes(raster, offset, raster.length - offset);
    out.writeByte(0);
    out.writeString(";");
  };
  const bitOutputStream = function(out) {
    const _out = out;
    let _bitLength = 0;
    let _bitBuffer = 0;
    const _this2 = {};
    _this2.write = function(data, length) {
      if (data >>> length != 0) {
        throw "length over";
      }
      while (_bitLength + length >= 8) {
        _out.writeByte(255 & (data << _bitLength | _bitBuffer));
        length -= 8 - _bitLength;
        data >>>= 8 - _bitLength;
        _bitBuffer = 0;
        _bitLength = 0;
      }
      _bitBuffer = data << _bitLength | _bitBuffer;
      _bitLength = _bitLength + length;
    };
    _this2.flush = function() {
      if (_bitLength > 0) {
        _out.writeByte(_bitBuffer);
      }
    };
    return _this2;
  };
  const getLZWRaster = function(lzwMinCodeSize) {
    const clearCode = 1 << lzwMinCodeSize;
    const endCode = (1 << lzwMinCodeSize) + 1;
    let bitLength = lzwMinCodeSize + 1;
    const table = lzwTable();
    for (let i = 0; i < clearCode; i += 1) {
      table.add(String.fromCharCode(i));
    }
    table.add(String.fromCharCode(clearCode));
    table.add(String.fromCharCode(endCode));
    const byteOut = byteArrayOutputStream();
    const bitOut = bitOutputStream(byteOut);
    bitOut.write(clearCode, bitLength);
    let dataIndex = 0;
    let s = String.fromCharCode(_data[dataIndex]);
    dataIndex += 1;
    while (dataIndex < _data.length) {
      const c = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;
      if (table.contains(s + c)) {
        s = s + c;
      } else {
        bitOut.write(table.indexOf(s), bitLength);
        if (table.size() < 4095) {
          if (table.size() == 1 << bitLength) {
            bitLength += 1;
          }
          table.add(s + c);
        }
        s = c;
      }
    }
    bitOut.write(table.indexOf(s), bitLength);
    bitOut.write(endCode, bitLength);
    bitOut.flush();
    return byteOut.toByteArray();
  };
  const lzwTable = function() {
    const _map = {};
    let _size = 0;
    const _this2 = {};
    _this2.add = function(key) {
      if (_this2.contains(key)) {
        throw "dup key:" + key;
      }
      _map[key] = _size;
      _size += 1;
    };
    _this2.size = function() {
      return _size;
    };
    _this2.indexOf = function(key) {
      return _map[key];
    };
    _this2.contains = function(key) {
      return typeof _map[key] != "undefined";
    };
    return _this2;
  };
  return _this;
};
var createDataURL = function(width, height, getPixel) {
  const gif = gifImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gif.setPixel(x, y, getPixel(x, y));
    }
  }
  const b = byteArrayOutputStream();
  gif.write(b);
  const base64 = base64EncodeOutputStream();
  const bytes = b.toByteArray();
  for (let i = 0; i < bytes.length; i += 1) {
    base64.writeByte(bytes[i]);
  }
  base64.flush();
  return "data:image/gif;base64," + base64;
};
var qrcode_default = qrcode;
var stringToBytes = qrcode.stringToBytes;

// node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
var atitle = (title) => title ? `"${title}" ` : "";
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length))
    return value;
  if (length !== void 0)
    anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
}
function copyBytes(bytes) {
  return Uint8Array.from(abytes(bytes));
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new TypeError("expected hash wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
  if (h.outputLen < 1 || h.blockLen < 1)
    throw new Error("hash blockLen / outputLen must be >= 1");
}
var aobject = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
var aopts = (value, label) => {
  aobject(value, label);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null)
    throw new TypeError(`"${label}" expected plain object`);
  if (Object.hasOwn(value, "__proto__"))
    throw new TypeError(`"${label}.__proto__" is not allowed`);
};
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("hash was destroyed");
  if (checkFinished && instance.finished)
    throw new Error("digest() was already called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function rotl(word, shift) {
  return word << shift | word >>> 32 - shift >>> 0;
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
var swap8IfBE = isLE ? (n) => n : (n) => byteSwap(n) >>> 0;
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new TypeError("string expected");
  const encoded = new TextEncoder().encode(str);
  try {
    return new Uint8Array(encoded);
  } finally {
    clean(encoded);
  }
}
function kdfInputToBytes(data, errorTitle = "") {
  if (typeof data === "string")
    return utf8ToBytes(data);
  return abytes(data, void 0, errorTitle);
}
function checkOpts(defaults, opts, title = "opts") {
  aopts(defaults, "defaults");
  if (opts !== void 0)
    aopts(opts, title);
  const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
  return merged;
}
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
function randomBytes(bytesLength = 32) {
  anumber(bytesLength, "bytesLength");
  const cr = typeof globalThis === "object" ? globalThis.crypto : null;
  if (typeof cr?.getRandomValues !== "function")
    throw new Error("crypto.getRandomValues must be defined");
  if (bytesLength > 65536)
    throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
  return cr.getRandomValues(new Uint8Array(bytesLength));
}
var oidNist = (suffix) => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// node_modules/@noble/hashes/_blake.js
var BSIGMA = /* @__PURE__ */ Uint8Array.from([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9,
  12,
  5,
  1,
  15,
  14,
  13,
  4,
  10,
  0,
  7,
  6,
  3,
  9,
  2,
  8,
  11,
  13,
  11,
  7,
  14,
  12,
  1,
  3,
  9,
  5,
  0,
  15,
  4,
  8,
  6,
  2,
  10,
  6,
  15,
  14,
  9,
  11,
  3,
  0,
  8,
  12,
  2,
  13,
  7,
  1,
  4,
  10,
  5,
  10,
  2,
  8,
  4,
  7,
  6,
  1,
  5,
  15,
  11,
  9,
  14,
  3,
  12,
  13,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  // Blake1, unused in others
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9
]);

// node_modules/@noble/hashes/_u64.js
var U32_MASK64 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var fromNumH = (n) => n / 2 ** 32 | 0;
var fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE2) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE2 ? l : h, isLE2);
  view.setUint32(byteOffset + 4, isLE2 ? h : l, isLE2);
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
var rotr32H = (_h, l) => l;
var rotr32L = (h, _l) => h;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

// node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class {
  blockLen;
  outputLen;
  canXOF = false;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE2) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE2;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    let processed = false;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        processed = true;
        continue;
      }
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
        processed = true;
      }
    }
    this.length += data.length;
    if (processed)
      this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE: isLE2 } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    buffer.fill(0, pos);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      buffer.fill(0);
    }
    setU64FromNum(view, blockLen - 8, this.length * 8, isLE2);
    this.process(view, 0);
    this.roundClean();
    const oview = out === buffer ? view : createView(out);
    const len = this.outputLen;
    const outLen = len / 4;
    const state = this.get();
    if (len % 4 || outLen > state.length)
      throw new Error("invalid outputLen");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE2);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneIntoMeta(to) {
    const { buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (pos)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]);

// node_modules/@noble/hashes/blake2.js
var B2B_IV = /* @__PURE__ */ Uint32Array.from([
  4089235720,
  1779033703,
  2227873595,
  3144134277,
  4271175723,
  1013904242,
  1595750129,
  2773480762,
  2917565137,
  1359893119,
  725511199,
  2600822924,
  4215389547,
  528734635,
  327033209,
  1541459225
]);
var BBUF = /* @__PURE__ */ new Uint32Array(32);
function G1b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  const ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  let xh = Dh ^ Ah, xl = Dl ^ Al;
  Dh = rotr32H(xh, xl);
  Dl = rotr32L(xh, xl);
  ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
  xh = Bh ^ Ch;
  xl = Bl ^ Cl;
  Bh = rotrSH(xh, xl, 24);
  Bl = rotrSL(xh, xl, 24);
  BBUF[2 * a] = Al;
  BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl;
  BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl;
  BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl;
  BBUF[2 * d + 1] = Dh;
}
function G2b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  const ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  let xh = Dh ^ Ah, xl = Dl ^ Al;
  Dh = rotrSH(xh, xl, 16);
  Dl = rotrSL(xh, xl, 16);
  ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
  xh = Bh ^ Ch;
  xl = Bl ^ Cl;
  Bh = rotrBH(xh, xl, 63);
  Bl = rotrBL(xh, xl, 63);
  BBUF[2 * a] = Al;
  BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl;
  BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl;
  BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl;
  BBUF[2 * d + 1] = Dh;
}
function checkBlake2Opts(outputLen, opts = {}, keyLen, saltLen, persLen) {
  anumber(keyLen);
  if (outputLen <= 0 || outputLen > keyLen)
    throw new Error('"dkLen" must be 1..' + keyLen + ", got " + outputLen);
  const { key, salt, personalization } = opts;
  if (key !== void 0 && (key.length < 1 || key.length > keyLen))
    throw new Error('"key" expected to be undefined or of length=1..' + keyLen);
  if (salt !== void 0)
    abytes(salt, saltLen, "salt");
  if (personalization !== void 0)
    abytes(personalization, persLen, "personalization");
}
var _BLAKE2 = class {
  buffer;
  buffer32;
  finished = false;
  destroyed = false;
  length = 0;
  pos = 0;
  blockLen;
  outputLen;
  canXOF = false;
  constructor(blockLen, outputLen) {
    anumber(blockLen);
    anumber(outputLen);
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.buffer = new Uint8Array(blockLen);
    this.buffer32 = u32(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { blockLen, buffer, buffer32 } = this;
    const len = data.length;
    const offset = data.byteOffset;
    const buf = data.buffer;
    for (let pos = 0; pos < len; ) {
      if (this.pos === blockLen) {
        swap32IfBE(buffer32);
        this.compress(buffer32, 0, false);
        swap32IfBE(buffer32);
        this.pos = 0;
      }
      const take = Math.min(blockLen - this.pos, len - pos);
      const dataOffset = offset + pos;
      if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
        const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
        swap32IfBE(data32);
        for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
          this.length += blockLen;
          this.compress(data32, pos32, false);
        }
        swap32IfBE(data32);
        continue;
      }
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      this.length += take;
      pos += take;
    }
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    if (out.byteOffset & 3)
      throw new RangeError('"output" expected 4-byte aligned byteOffset, got ' + out.byteOffset);
    const { pos, buffer32 } = this;
    this.finished = true;
    this.buffer.fill(0, pos);
    swap32IfBE(buffer32);
    this.compress(buffer32, 0, true);
    swap32IfBE(buffer32);
    const state = this.get();
    const out32 = out === this.buffer ? buffer32 : u32(out);
    const full = Math.floor(this.outputLen / 4);
    for (let i = 0; i < full; i++)
      out32[i] = swap8IfBE(state[i]);
    const tail = this.outputLen % 4;
    if (!tail)
      return;
    const off = full * 4;
    const word = state[full];
    for (let i = 0; i < tail; i++)
      out[off + i] = word >>> 8 * i;
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    const { buffer, length, finished, destroyed, outputLen, pos } = this;
    to ||= new this.constructor({ dkLen: outputLen });
    to.set(...this.get());
    to.buffer.set(buffer);
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    to.outputLen = outputLen;
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var _BLAKE2b = class extends _BLAKE2 {
  // Same IV words as SHA-512 / BLAKE2b, encoded as LE u32 low/high halves.
  v0l = B2B_IV[0] | 0;
  v0h = B2B_IV[1] | 0;
  v1l = B2B_IV[2] | 0;
  v1h = B2B_IV[3] | 0;
  v2l = B2B_IV[4] | 0;
  v2h = B2B_IV[5] | 0;
  v3l = B2B_IV[6] | 0;
  v3h = B2B_IV[7] | 0;
  v4l = B2B_IV[8] | 0;
  v4h = B2B_IV[9] | 0;
  v5l = B2B_IV[10] | 0;
  v5h = B2B_IV[11] | 0;
  v6l = B2B_IV[12] | 0;
  v6h = B2B_IV[13] | 0;
  v7l = B2B_IV[14] | 0;
  v7h = B2B_IV[15] | 0;
  constructor(opts = {}) {
    opts = checkOpts({}, opts);
    const olen = opts.dkLen === void 0 ? 64 : opts.dkLen;
    super(128, olen);
    checkBlake2Opts(olen, opts, 64, 16, 16);
    let { key, personalization, salt } = opts;
    let keyLength = 0;
    if (key !== void 0) {
      abytes(key, void 0, "key");
      keyLength = key.length;
    }
    this.v0l ^= this.outputLen | keyLength << 8 | 1 << 16 | 1 << 24;
    if (salt !== void 0) {
      abytes(salt, void 0, "salt");
      const slt = u32(copyBytes(salt));
      this.v4l ^= swap8IfBE(slt[0]);
      this.v4h ^= swap8IfBE(slt[1]);
      this.v5l ^= swap8IfBE(slt[2]);
      this.v5h ^= swap8IfBE(slt[3]);
    }
    if (personalization !== void 0) {
      abytes(personalization, void 0, "personalization");
      const pers = u32(copyBytes(personalization));
      this.v6l ^= swap8IfBE(pers[0]);
      this.v6h ^= swap8IfBE(pers[1]);
      this.v7l ^= swap8IfBE(pers[2]);
      this.v7h ^= swap8IfBE(pers[3]);
    }
    if (key !== void 0) {
      const tmp = new Uint8Array(this.blockLen);
      tmp.set(key);
      this.update(tmp);
      clean(tmp);
    }
  }
  // prettier-ignore
  get() {
    let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
    return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
  }
  // prettier-ignore
  set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
    this.v0l = v0l | 0;
    this.v0h = v0h | 0;
    this.v1l = v1l | 0;
    this.v1h = v1h | 0;
    this.v2l = v2l | 0;
    this.v2h = v2h | 0;
    this.v3l = v3l | 0;
    this.v3h = v3h | 0;
    this.v4l = v4l | 0;
    this.v4h = v4h | 0;
    this.v5l = v5l | 0;
    this.v5h = v5h | 0;
    this.v6l = v6l | 0;
    this.v6h = v6h | 0;
    this.v7l = v7l | 0;
    this.v7h = v7h | 0;
  }
  compress(msg, offset, isLast) {
    const { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
    {
      BBUF[0] = v0l;
      BBUF[1] = v0h;
      BBUF[2] = v1l;
      BBUF[3] = v1h;
      BBUF[4] = v2l;
      BBUF[5] = v2h;
      BBUF[6] = v3l;
      BBUF[7] = v3h;
      BBUF[8] = v4l;
      BBUF[9] = v4h;
      BBUF[10] = v5l;
      BBUF[11] = v5h;
      BBUF[12] = v6l;
      BBUF[13] = v6h;
      BBUF[14] = v7l;
      BBUF[15] = v7h;
    }
    BBUF.set(B2B_IV, 16);
    const l = fromNumL(this.length);
    const h = fromNumH(this.length);
    BBUF[24] = B2B_IV[8] ^ l;
    BBUF[25] = B2B_IV[9] ^ h;
    if (isLast) {
      BBUF[28] = ~BBUF[28];
      BBUF[29] = ~BBUF[29];
    }
    let j = 0;
    const s = BSIGMA;
    for (let i = 0; i < 12; i++) {
      G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
    }
    this.v0l ^= BBUF[0] ^ BBUF[16];
    this.v0h ^= BBUF[1] ^ BBUF[17];
    this.v1l ^= BBUF[2] ^ BBUF[18];
    this.v1h ^= BBUF[3] ^ BBUF[19];
    this.v2l ^= BBUF[4] ^ BBUF[20];
    this.v2h ^= BBUF[5] ^ BBUF[21];
    this.v3l ^= BBUF[6] ^ BBUF[22];
    this.v3h ^= BBUF[7] ^ BBUF[23];
    this.v4l ^= BBUF[8] ^ BBUF[24];
    this.v4h ^= BBUF[9] ^ BBUF[25];
    this.v5l ^= BBUF[10] ^ BBUF[26];
    this.v5h ^= BBUF[11] ^ BBUF[27];
    this.v6l ^= BBUF[12] ^ BBUF[28];
    this.v6h ^= BBUF[13] ^ BBUF[29];
    this.v7l ^= BBUF[14] ^ BBUF[30];
    this.v7h ^= BBUF[15] ^ BBUF[31];
    clean(BBUF);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer32);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var blake2b = /* @__PURE__ */ createHasher((opts) => new _BLAKE2b(opts));

// node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and makes sha256 3x slower (measured).
  A = 0;
  B = 0;
  C = 0;
  D = 0;
  E = 0;
  F = 0;
  G = 0;
  H = 0;
  constructor(outputLen, IV) {
    super(64, outputLen, 8, false);
    this.A = IV[0] | 0;
    this.B = IV[1] | 0;
    this.C = IV[2] | 0;
    this.D = IV[3] | 0;
    this.E = IV[4] | 0;
    this.F = IV[5] | 0;
    this.G = IV[6] | 0;
    this.H = IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G: G2, H } = this;
    return [A, B, C, D, E, F, G2, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G2, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G2 | 0;
    this.H = H | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G: G2, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G2) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G2;
      G2 = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G2 = G2 + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G2, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.destroyed = true;
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var _SHA256 = class extends SHA2_32B {
  constructor() {
    super(32, SHA256_IV);
  }
};
var K512 = /* @__PURE__ */ (() => split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA2_64B = class extends HashMD {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // h -- high 32 bits, l -- low 32 bits
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and slows hashing down (measured on sha256).
  Ah = 0;
  Al = 0;
  Bh = 0;
  Bl = 0;
  Ch = 0;
  Cl = 0;
  Dh = 0;
  Dl = 0;
  Eh = 0;
  El = 0;
  Fh = 0;
  Fl = 0;
  Gh = 0;
  Gl = 0;
  Hh = 0;
  Hl = 0;
  constructor(outputLen, IV) {
    super(128, outputLen, 16, false);
    this.Ah = IV[0] | 0;
    this.Al = IV[1] | 0;
    this.Bh = IV[2] | 0;
    this.Bl = IV[3] | 0;
    this.Ch = IV[4] | 0;
    this.Cl = IV[5] | 0;
    this.Dh = IV[6] | 0;
    this.Dl = IV[7] | 0;
    this.Eh = IV[8] | 0;
    this.El = IV[9] | 0;
    this.Fh = IV[10] | 0;
    this.Fl = IV[11] | 0;
    this.Gh = IV[12] | 0;
    this.Gl = IV[13] | 0;
    this.Hh = IV[14] | 0;
    this.Hl = IV[15] | 0;
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4) {
      SHA512_W_H[i] = view.getUint32(offset);
      SHA512_W_L[i] = view.getUint32(offset += 4);
    }
    for (let i = 16; i < 80; i++) {
      const W15h = SHA512_W_H[i - 15] | 0;
      const W15l = SHA512_W_L[i - 15] | 0;
      const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
      const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i - 2] | 0;
      const W2l = SHA512_W_L[i - 2] | 0;
      const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
      const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
      const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
      const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
      SHA512_W_H[i] = SUMh | 0;
      SHA512_W_L[i] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i = 0; i < 80; i++) {
      const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
      const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
      const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
      const T1l = T1ll | 0;
      const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
      const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = add3L(T1l, sigma0l, MAJl);
      Ah = add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    clean(SHA512_W_H, SHA512_W_L);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var _SHA512 = class extends SHA2_64B {
  constructor() {
    super(64, SHA512_IV);
  }
};
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);
var sha512 = /* @__PURE__ */ createHasher(
  () => new _SHA512(),
  /* @__PURE__ */ oidNist(3)
);

// node_modules/@noble/hashes/hmac.js
var _HMAC = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  canXOF = false;
  finished = false;
  destroyed = false;
  constructor(hash, key) {
    ahash(hash);
    abytes(key, void 0, "key");
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("expected Hash instance");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const buf = out.subarray(0, this.outputLen);
    this.iHash.digestInto(buf);
    this.oHash.update(buf);
    this.oHash.digestInto(buf);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.canXOF = canXOF;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = /* @__PURE__ */ (() => {
  const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
  hmac_.create = (hash, key) => new _HMAC(hash, key);
  return hmac_;
})();

// node_modules/@noble/secp256k1/index.js
var freeze = Object.freeze;
var P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
var N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
var Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
var Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
var secp256k1_CURVE = freeze({
  p: P,
  n: N,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx,
  Gy
});
var L = 32;
var isBytes2 = (a) => {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && a.BYTES_PER_ELEMENT === 1;
};
var abytes2 = (value, length, title = "") => {
  if (isBytes2(value) && (length === void 0 || value.length === length))
    return value;
  const bytes = isBytes2(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = (title ? `"${title}" ` : "") + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
};
var cloneBytes = (value) => Uint8Array.from(value);
var snapshotBytes = (value, title, length) => cloneBytes(abytes2(value, length, title));
var padh = (n, pad) => n.toString(16).padStart(pad, "0");
var bytesToHex = (bytes) => {
  let hex = "";
  for (const byte of abytes2(bytes))
    hex += padh(byte, 2);
  return hex;
};
var hexToBytes = (hex) => {
  const e = "hex invalid";
  if (typeof hex !== "string")
    throw new TypeError(e);
  if (hex.length % 2 || !/^[\da-f]*$/i.test(hex))
    throw new RangeError(e);
  const array = new Uint8Array(hex.length / 2);
  for (let ai = 0, hi = 0; ai < array.length; ai++, hi += 2) {
    const n1 = hex.charCodeAt(hi);
    const n2 = hex.charCodeAt(hi + 1);
    array[ai] = ((n1 & 15) + (n1 >> 6) * 9) * 16 + (n2 & 15) + (n2 >> 6) * 9;
  }
  return array;
};
var subtle = () => {
  const s = globalThis?.crypto?.subtle;
  if (s)
    return s;
  throw new Error("crypto.subtle must be defined, consider polyfill");
};
var concatBytes = (...arrays) => {
  let sum3 = 0;
  for (const a of arrays)
    sum3 += abytes2(a).length;
  const res = new Uint8Array(sum3);
  let pad = 0;
  for (const a of arrays) {
    res.set(a, pad);
    pad += a.length;
  }
  return res;
};
var randomBytes2 = (len = L) => {
  const c = globalThis?.crypto;
  if (typeof c?.getRandomValues !== "function")
    throw new Error("crypto.getRandomValues must be defined, consider polyfill");
  return c.getRandomValues(new Uint8Array(len));
};
var big = BigInt;
var arange = (n, min, max, msg = "bad number: out of range") => {
  if (typeof n !== "bigint")
    throw new TypeError(msg);
  if (min <= n && n < max)
    return n;
  throw new RangeError(msg);
};
var M = (a, b = P) => (a %= b) >= 0n ? a : b + a;
var modN = (a) => M(a, N);
var invert = (number, modulo) => {
  if (number === 0n)
    throw new Error("invert: expected non-zero number");
  if (modulo <= 1n)
    throw new Error("invert: expected modulus > 1, got " + modulo);
  let a = M(number, modulo);
  let b = modulo;
  let x = 0n, u = 1n;
  while (a !== 0n) {
    const q = b / a;
    const r = b - a * q;
    const m = x - u * q;
    b = a, a = r, x = u, u = m;
  }
  const gcd = b;
  if (gcd !== 1n)
    throw new Error("invert: does not exist");
  return M(x, modulo);
};
var _hash = (name) => {
  const fn = hashes[name];
  if (typeof fn !== "function")
    throw new Error("hashes." + name + " not set");
  return fn;
};
var callHash = (name, a, b) => abytes2(_hash(name)(a, b), L, "digest");
var callHashAsync = async (name, a, b) => abytes2(await _hash(name)(a, b), L, "digest");
var apoint = (p) => {
  if (p instanceof Point)
    return p;
  throw new TypeError("Point expected");
};
var E_BADPOINT = "bad point: not on curve";
var koblitz = (x) => M(M(x * x) * x + 7n);
var FpIsValid = (n) => arange(n, 0n, P);
var FpIsValidNot0 = (n) => arange(n, 1n, P);
var FnIsValidNot0 = (n) => arange(n, 1n, N);
var isEven = (y) => !(y & 1n);
var getPrefix = (y) => Uint8Array.of(isEven(y) ? 2 : 3);
var lift_x = (x) => {
  const c = koblitz(FpIsValidNot0(x));
  let r = 1n;
  for (let num = c, e = (P + 1n) / 4n; e > 0n; e >>= 1n) {
    if (e & 1n)
      r = r * num % P;
    num = num * num % P;
  }
  if (M(r * r) !== c)
    throw new Error("sqrt invalid");
  return new Point(x, isEven(r) ? r : M(-r), 1n);
};
var Point = class _Point {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(X, Y, Z) {
    this.X = FpIsValid(X);
    this.Y = FpIsValidNot0(Y);
    this.Z = FpIsValid(Z);
    freeze(this);
  }
  /** Returns the shared curve metadata object by reference.
   * It is readonly only at type level, and mutating it won't retarget arithmetic,
   * which already uses module-load snapshots. */
  static CURVE() {
    return secp256k1_CURVE;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(ap) {
    const { x, y } = ap;
    return x === 0n && y === 0n ? I : new _Point(x, y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(bytes) {
    abytes2(bytes);
    const length = bytes.length;
    const head = bytes[0];
    const x = sliceBytesNumBE(bytes, 1, 33);
    try {
      if (length === 33 && (head === 2 || head === 3)) {
        const p = lift_x(x);
        return head === 3 ? p.negate() : p;
      }
      if (length === 65 && head === 4)
        return new _Point(x, sliceBytesNumBE(bytes, 33, 65), 1n).assertValidity();
    } catch (error) {
      throw new Error(E_BADPOINT);
    }
    throw new Error(E_BADPOINT);
  }
  static fromHex(hex) {
    return _Point.fromBytes(hexToBytes(hex));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(other) {
    const { X: X1, Y: Y1, Z: Z1 } = this;
    const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
    return M(X1 * Z2) === M(X2 * Z1) && M(Y1 * Z2) === M(Y2 * Z1);
  }
  is0() {
    return this.Z === 0n;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new _Point(this.X, M(-this.Y), this.Z);
  }
  /** Point doubling: P+P, complete formula. */
  double() {
    return this.add(this);
  }
  /**
   * Point addition: P+Q, complete, exception-free formula
   * (Renes-Costello-Batina, algo 1 of [2015/1060](https://eprint.iacr.org/2015/1060)).
   * Cost: `12M + 0S + 3*a + 3*b3 + 23add`.
   */
  // prettier-ignore
  add(other) {
    const { X: X1, Y: Y1, Z: Z1 } = this;
    const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
    const a = 0n;
    const b = 7n;
    let X3 = 0n, Y3 = 0n, Z3 = 0n;
    const b3 = M(b * 3n);
    let t0 = M(X1 * X2), t1 = M(Y1 * Y2), t2 = M(Z1 * Z2), t3 = M(X1 + Y1);
    let t4 = M(X2 + Y2);
    t3 = M(t3 * t4);
    t4 = M(t0 + t1);
    t3 = M(t3 - t4);
    t4 = M(X1 + Z1);
    let t5 = M(X2 + Z2);
    t4 = M(t4 * t5);
    t5 = M(t0 + t2);
    t4 = M(t4 - t5);
    t5 = M(Y1 + Z1);
    X3 = M(Y2 + Z2);
    t5 = M(t5 * X3);
    X3 = M(t1 + t2);
    t5 = M(t5 - X3);
    Z3 = M(a * t4);
    X3 = M(b3 * t2);
    Z3 = M(X3 + Z3);
    X3 = M(t1 - Z3);
    Z3 = M(t1 + Z3);
    Y3 = M(X3 * Z3);
    t1 = M(t0 + t0);
    t1 = M(t1 + t0);
    t2 = M(a * t2);
    t4 = M(b3 * t4);
    t1 = M(t1 + t2);
    t2 = M(t0 - t2);
    t2 = M(a * t2);
    t4 = M(t4 + t2);
    t0 = M(t1 * t4);
    Y3 = M(Y3 + t0);
    t0 = M(t5 * t4);
    X3 = M(t3 * X3);
    X3 = M(X3 - t0);
    t0 = M(t3 * t1);
    Z3 = M(t5 * Z3);
    Z3 = M(Z3 + t0);
    return new _Point(X3, Y3, Z3);
  }
  subtract(other) {
    return this.add(apoint(other).negate());
  }
  /**
   * Point-by-scalar multiplication. Scalar must be in range 1 <= n < CURVE.n.
   * Uses {@link wNAF} for base point.
   * Uses fake point to mitigate leakage shape in JS, not as a hard constant-time guarantee.
   * @param n scalar by which point is multiplied
   * @param safe safe mode guards against timing attacks; unsafe mode is faster
   */
  multiply(n, safe = true) {
    if (!safe && n === 0n)
      return I;
    FnIsValidNot0(n);
    if (n === 1n)
      return this;
    if (this.equals(G))
      return wNAF(n).p;
    let p = I;
    let f = G;
    let d = this;
    for (let i = 0; safe ? i < 256 : n > 0n; i++) {
      if (n & 1n)
        p = p.add(d);
      else if (safe)
        f = f.add(d);
      d = d.double();
      n >>= 1n;
    }
    return p;
  }
  multiplyUnsafe(scalar) {
    return this.multiply(scalar, false);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: x, Y: y, Z: z } = this;
    if (z === 0n)
      return { x: 0n, y: 0n };
    if (z === 1n)
      return { x, y };
    const iz = invert(z, P);
    if (M(z * iz) !== 1n)
      throw new Error("inverse invalid");
    return { x: M(x * iz), y: M(y * iz) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x, y } = this.toAffine();
    FpIsValidNot0(x);
    FpIsValidNot0(y);
    if (M(y * y) !== koblitz(x))
      throw new Error(E_BADPOINT);
    return this;
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(isCompressed = true) {
    const { x, y } = this.assertValidity().toAffine();
    const x32b = numTo32b(x);
    if (isCompressed)
      return concatBytes(getPrefix(y), x32b);
    return concatBytes(Uint8Array.of(4), x32b, numTo32b(y));
  }
  toHex(isCompressed) {
    return bytesToHex(this.toBytes(isCompressed));
  }
};
var G = new Point(Gx, Gy, 1n);
var I = new Point(0n, 1n, 0n);
Point.BASE = G;
Point.ZERO = I;
var doubleScalarMulUns = (R, u1, u2) => {
  return G.multiply(u1, false).add(R.multiply(u2, false)).assertValidity();
};
var bytesToNumBE = (b) => big("0x" + (bytesToHex(b) || "0"));
var sliceBytesNumBE = (b, from, to) => bytesToNumBE(b.subarray(from, to));
var numTo32b = (num) => hexToBytes(padh(arange(num, 0n, 2n ** 256n), L * 2));
var secretKeyToScalar = (secretKey) => {
  const num = bytesToNumBE(abytes2(secretKey, L, "secret key"));
  return arange(num, 1n, N, "invalid secret key: outside of range");
};
var getPublicKey = (privKey, isCompressed = true) => {
  return G.multiply(secretKeyToScalar(privKey)).toBytes(isCompressed);
};
var _sha = "SHA-256";
var hashes = {
  hmacSha256Async: async (key, message) => {
    const s = subtle();
    const k = await s.importKey("raw", key, { name: "HMAC", hash: _sha }, false, ["sign"]);
    return new Uint8Array(await s.sign("HMAC", k, message));
  },
  hmacSha256: void 0,
  sha256Async: async (msg) => new Uint8Array(await subtle().digest(_sha, msg)),
  sha256: void 0
};
var randomSecretKey = (seed) => {
  seed = seed === void 0 ? randomBytes2(48) : seed;
  abytes2(seed);
  if (seed.length < 48 || seed.length > 1024)
    throw new RangeError("expected 48-1024b");
  const num = M(bytesToNumBE(seed), N - 1n);
  return numTo32b(num + 1n);
};
var createKeygen = (getPublicKey2) => (seed) => {
  const secretKey = randomSecretKey(seed);
  return { secretKey, publicKey: getPublicKey2(secretKey) };
};
var getTag = (tag) => Uint8Array.from("BIP0340/" + tag, (c) => c.charCodeAt(0));
var taggedHash = (tag, ...messages) => {
  const tagH = callHash("sha256", getTag(tag));
  return callHash("sha256", concatBytes(tagH, tagH, ...messages));
};
var taggedHashAsync = (tag, ...messages) => callHashAsync("sha256Async", getTag(tag)).then((tagH) => callHashAsync("sha256Async", concatBytes(tagH, tagH, ...messages)));
var extpubSchnorr = (priv) => {
  const d_ = secretKeyToScalar(priv);
  const p = G.multiply(d_);
  const { x, y } = p.assertValidity().toAffine();
  const d = isEven(y) ? d_ : modN(-d_);
  const px = numTo32b(x);
  return { d, px };
};
var bytesModN = (bytes) => modN(bytesToNumBE(bytes));
var challenge = (...args) => bytesModN(taggedHash("challenge", ...args));
var challengeAsync = async (...args) => bytesModN(await taggedHashAsync("challenge", ...args));
var pubSchnorr = (secretKey) => {
  return extpubSchnorr(secretKey).px;
};
var keygenSchnorr = /* @__PURE__ */ createKeygen(pubSchnorr);
var prepSigSchnorr = (message, secretKey, auxRand) => {
  const m = snapshotBytes(message, "message");
  const { px, d } = extpubSchnorr(secretKey);
  return { m, px, d, a: abytes2(auxRand, L) };
};
var extractK = (rand) => {
  const k_ = bytesModN(rand);
  if (k_ === 0n)
    throw new Error("sign failed: k is zero");
  const { px, d } = extpubSchnorr(numTo32b(k_));
  return { rx: px, k: d };
};
var createSigSchnorr = (k, px, e, d) => {
  return concatBytes(px, numTo32b(modN(k + e * d)));
};
var E_INVSIG = "invalid signature produced";
var signSchnorr = (message, secretKey, auxRand = randomBytes2(L)) => {
  const { m, px, d, a } = prepSigSchnorr(message, secretKey, auxRand);
  const t = numTo32b(d ^ bytesToNumBE(taggedHash("aux", a)));
  const { rx, k } = extractK(taggedHash("nonce", t, px, m));
  const sig = createSigSchnorr(k, rx, challenge(rx, px, m), d);
  if (!verifySchnorr(sig, m, px))
    throw new Error(E_INVSIG);
  return sig;
};
var signSchnorrAsync = async (message, secretKey, auxRand = randomBytes2(L)) => {
  const { m, px, d, a } = prepSigSchnorr(message, secretKey, auxRand);
  const t = numTo32b(d ^ bytesToNumBE(await taggedHashAsync("aux", a)));
  const { rx, k } = extractK(await taggedHashAsync("nonce", t, px, m));
  const sig = createSigSchnorr(k, rx, await challengeAsync(rx, px, m), d);
  if (!await verifySchnorrAsync(sig, m, px))
    throw new Error(E_INVSIG);
  return sig;
};
var callSyncAsyncFn = (res, later) => {
  return res instanceof Promise ? res.then(later) : later(res);
};
var _verifSchnorr = (signature, message, publicKey, challengeFn) => {
  const sig = abytes2(signature, 64, "signature");
  const msg = abytes2(message, void 0, "message");
  const pub = abytes2(publicKey, L, "publicKey");
  let P_;
  let r;
  let s;
  let chalInput;
  try {
    const x = bytesToNumBE(pub);
    P_ = lift_x(x);
    r = FpIsValidNot0(sliceBytesNumBE(sig, 0, L));
    s = FnIsValidNot0(sliceBytesNumBE(sig, L, 64));
    chalInput = concatBytes(numTo32b(r), pub, msg);
  } catch (error) {
    return false;
  }
  return callSyncAsyncFn(challengeFn(chalInput), (e) => {
    try {
      const { x, y } = doubleScalarMulUns(P_, s, modN(-e)).toAffine();
      if (!isEven(y) || x !== r)
        return false;
      return true;
    } catch (error) {
      return false;
    }
  });
};
var verifySchnorr = (s, m, p) => _verifSchnorr(s, m, p, challenge);
var verifySchnorrAsync = async (s, m, p) => _verifSchnorr(s, m, p, challengeAsync);
var schnorr = /* @__PURE__ */ freeze({
  keygen: keygenSchnorr,
  getPublicKey: pubSchnorr,
  sign: signSchnorr,
  verify: verifySchnorr,
  signAsync: signSchnorrAsync,
  verifyAsync: verifySchnorrAsync
});
var precompute = () => {
  const points = [];
  let p = G;
  let b = p;
  for (let w = 0; w < 33; w++) {
    b = p;
    points.push(b);
    for (let i = 1; i < 128; i++) {
      b = b.add(p);
      points.push(b);
    }
    p = b.double();
  }
  return points;
};
var Gpows = void 0;
var ctneg = (cnd, p) => {
  const n = p.negate();
  return cnd ? n : p;
};
var wNAF = (n) => {
  const comp = Gpows || (Gpows = precompute());
  let p = I;
  let f = G;
  for (let w = 0; w < 33; w++) {
    let wbits = Number(n & 255n);
    n >>= 8n;
    if (wbits > 128) {
      wbits -= 256;
      n += 1n;
    }
    const off = w * 128;
    const offP = off + Math.abs(wbits) - 1;
    const isOddW = w % 2 !== 0;
    const isNeg = wbits < 0;
    if (wbits === 0) {
      f = f.add(ctneg(isOddW, comp[off]));
    } else {
      p = p.add(ctneg(isNeg, comp[offP]));
    }
  }
  if (n !== 0n)
    throw new Error("invalid wnaf");
  return { p, f };
};

// core/kaspa.js
var import_kaspa_ksm = __toESM(require_src(), 1);
hashes.sha256 = sha256;
hashes.hmacSha256 = (k, m) => hmac(sha256, k, m);
var SOMPI_PER_KAS = 100000000n;
var SIGHASH_ALL = 1;
var SUBNETWORK_NATIVE = new Uint8Array(20);
var MASS_PER_TX_BYTE = 1n;
var MASS_PER_SPK_BYTE = 10n;
var MASS_PER_SIGOP = 1000n;
var TRANSIENT_BYTE_TO_MASS = 4n;
var STORAGE_MASS_PARAMETER = SOMPI_PER_KAS * 10000n;
var BLOCK_MASS = { compute: 500000n, storage: 500000n, transient: 1000000n };
var MIN_RELAY_FEE_PER_GRAM = 100n;
var MAX_SAFE_MASS = 100000n;
var enc = new TextEncoder();
function hexToBytes2(h) {
  const s = String(h == null ? "" : h).trim().toLowerCase().replace(/^0x/, "");
  if (s.length % 2 || !/^[0-9a-f]*$/.test(s)) throw new Error("not hex");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}
function bytesToHex2(b) {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
function concat(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
function u16(n) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, Number(n), true);
  return b;
}
function u322(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, Number(n), true);
  return b;
}
function u64(n) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(n), true);
  return b;
}
function varBytes(b) {
  return concat([u64(b.length), b]);
}
var Hasher = class {
  constructor(domain) {
    this.key = enc.encode(domain);
    this.parts = [];
  }
  update(b) {
    this.parts.push(b);
    return this;
  }
  finalize() {
    return blake2b(concat(this.parts), { dkLen: 32, key: this.key });
  }
};
function scriptPublicKey(address) {
  const d = import_kaspa_ksm.default.address.decodeAddress(String(address).trim().toLowerCase());
  const payload = typeof d.payload === "string" ? hexToBytes2(d.payload) : Uint8Array.from(d.payload);
  if (d.version === 0 && payload.length === 32) return { version: 0, script: concat([Uint8Array.of(32), payload, Uint8Array.of(172)]) };
  if (d.version === 1 && payload.length === 33) return { version: 0, script: concat([Uint8Array.of(33), payload, Uint8Array.of(171)]) };
  if (d.version === 8 && payload.length === 32) return { version: 0, script: concat([Uint8Array.of(170, 32), payload, Uint8Array.of(135)]) };
  throw new Error(`unsupported address ${address}`);
}
function networkOf(address) {
  const p = String(address).split(":")[0];
  return { kaspa: "mainnet", kaspatest: "testnet-10", kaspasim: "simnet", kaspadev: "devnet" }[p] || null;
}
function xOnlyPublicKey(privHex) {
  return bytesToHex2(schnorr.getPublicKey(hexToBytes2(privHex)));
}
function p2pkAddress(network, xonlyHex) {
  return import_kaspa_ksm.default.p2pkAddress(network, xonlyHex);
}
function addressOfKey(network, privHex) {
  return p2pkAddress(network, xOnlyPublicKey(privHex));
}
function newTx() {
  return { version: 0, inputs: [], outputs: [], lockTime: 0n, subnetworkId: SUBNETWORK_NATIVE, gas: 0n, payload: new Uint8Array(0) };
}
function transactionId(tx) {
  if (tx.version !== 0) throw new Error("only version 0 transactions are built here");
  const h = new Hasher("TransactionID");
  h.update(u16(tx.version)).update(u64(tx.inputs.length));
  for (const i of tx.inputs) {
    h.update(hexToBytes2(i.txid)).update(u322(i.index)).update(varBytes(new Uint8Array(0))).update(u64(i.sequence));
  }
  h.update(u64(tx.outputs.length));
  for (const o of tx.outputs) h.update(u64(o.value)).update(u16(o.spk.version)).update(varBytes(o.spk.script));
  h.update(u64(tx.lockTime)).update(tx.subnetworkId).update(u64(tx.gas)).update(varBytes(tx.payload));
  return bytesToHex2(h.finalize());
}
var ZERO32 = new Uint8Array(32);
function isNativeSubnet(s) {
  return s.every((b) => b === 0);
}
function signatureHash(tx, entries, i) {
  if (tx.version !== 0) throw new Error("only version 0 transactions are built here");
  const H = (d) => new Hasher(d);
  const prevOuts = H("TransactionSigningHash");
  for (const x of tx.inputs) prevOuts.update(hexToBytes2(x.txid)).update(u322(x.index));
  const seqs = H("TransactionSigningHash");
  for (const x of tx.inputs) seqs.update(u64(x.sequence));
  const sigops = H("TransactionSigningHash");
  for (const x of tx.inputs) sigops.update(Uint8Array.of(x.sigOpCount));
  const outs = H("TransactionSigningHash");
  for (const o of tx.outputs) outs.update(u64(o.value)).update(u16(o.spk.version)).update(varBytes(o.spk.script));
  const payloadHash = isNativeSubnet(tx.subnetworkId) && tx.payload.length === 0 ? ZERO32 : H("TransactionSigningHash").update(varBytes(tx.payload)).finalize();
  const inp = tx.inputs[i], e = entries[i];
  return H("TransactionSigningHash").update(u16(tx.version)).update(prevOuts.finalize()).update(seqs.finalize()).update(sigops.finalize()).update(hexToBytes2(inp.txid)).update(u322(inp.index)).update(u16(e.spk.version)).update(varBytes(e.spk.script)).update(u64(e.amount)).update(u64(inp.sequence)).update(Uint8Array.of(inp.sigOpCount)).update(outs.finalize()).update(u64(tx.lockTime)).update(tx.subnetworkId).update(u64(tx.gas)).update(payloadHash).update(Uint8Array.of(SIGHASH_ALL)).finalize();
}
function schnorrSign(sighash, privHex) {
  const sig = schnorr.sign(sighash, hexToBytes2(privHex));
  return bytesToHex2(sig) + "01";
}
function schnorrVerify(sig65Hex, sighash, xonlyHex) {
  const s = hexToBytes2(sig65Hex);
  if (s.length !== 65 || s[64] !== SIGHASH_ALL) return false;
  return schnorr.verify(s.slice(0, 64), sighash, hexToBytes2(xonlyHex));
}
function messageHash(text) {
  return new Hasher("PersonalMessageSigningHash").update(enc.encode(String(text))).finalize();
}
function signMessage(text, privHex, auxRand) {
  return bytesToHex2(schnorr.sign(messageHash(text), hexToBytes2(privHex), auxRand));
}
function verifyMessage(text, sigHex, xonlyHex) {
  try {
    const s = hexToBytes2(sigHex);
    if (s.length !== 64) return false;
    return schnorr.verify(s, messageHash(text), hexToBytes2(xonlyHex));
  } catch (e) {
    return false;
  }
}
function p2pkSignatureScript(sig65Hex) {
  return "41" + sig65Hex;
}
function serializedSize(tx) {
  let n = 2n + 8n;
  for (const i of tx.inputs) n += 32n + 4n + 8n + BigInt(hexToBytes2(i.signatureScript || "").length) + 8n;
  n += 8n;
  for (const o of tx.outputs) n += 8n + 2n + 8n + BigInt(o.spk.script.length);
  n += 8n + 20n + 8n + 32n + 8n + BigInt(tx.payload.length);
  return n;
}
function computeMass(tx) {
  const size = serializedSize(tx);
  const spk = tx.outputs.reduce((a, o) => a + 2n + BigInt(o.spk.script.length), 0n);
  const sigops = tx.inputs.reduce((a, i) => a + BigInt(i.sigOpCount), 0n);
  return size * MASS_PER_TX_BYTE + spk * MASS_PER_SPK_BYTE + sigops * MASS_PER_SIGOP;
}
function transientMass(tx) {
  return serializedSize(tx) * TRANSIENT_BYTE_TO_MASS;
}
function plurality(spk) {
  return BigInt(Math.ceil((63 + spk.script.length) / 100));
}
function storageMass(tx, entries) {
  const C = STORAGE_MASS_PARAMETER;
  let outsPlur = 0n, harmOuts = 0n;
  for (const o of tx.outputs) {
    const p = plurality(o.spk);
    outsPlur += p;
    harmOuts += C * p * p / BigInt(o.value);
  }
  const ins = entries.map((e) => ({ p: plurality(e.spk), a: BigInt(e.amount) }));
  const insPlur = ins.reduce((a, x) => a + x.p, 0n);
  const relaxed = outsPlur === 1n || ins.length <= 2 && (insPlur === 1n || outsPlur === 2n && insPlur === 2n);
  if (relaxed) {
    const harmIns = ins.reduce((a, x) => a + C * x.p * x.p / x.a, 0n);
    return harmOuts > harmIns ? harmOuts - harmIns : 0n;
  }
  const sumIns = ins.reduce((a, x) => a + x.a, 0n);
  let mean = sumIns / insPlur;
  if (mean < 1n) mean = 1n;
  const arith = insPlur * (C / mean);
  return harmOuts > arith ? harmOuts - arith : 0n;
}
var ceilDiv = (a, b) => (a + b - 1n) / b;
function masses(tx, entries) {
  const compute = computeMass(tx), transient = transientMass(tx), storage = storageMass(tx, entries);
  const transientNorm = ceilDiv(transient * BLOCK_MASS.compute, BLOCK_MASS.transient);
  const storageNorm = ceilDiv(storage * BLOCK_MASS.compute, BLOCK_MASS.storage);
  const relay = compute > transientNorm ? compute : transientNorm;
  const priced = relay > storageNorm ? relay : storageNorm;
  return { compute, transient, storage, relay, priced };
}
function feeFor(m, feeRate) {
  const r = BigInt(feeRate == null ? MIN_RELAY_FEE_PER_GRAM : feeRate);
  const rate = r < MIN_RELAY_FEE_PER_GRAM ? MIN_RELAY_FEE_PER_GRAM : r;
  return m.priced * rate;
}
function toRestTransaction(tx) {
  return {
    version: tx.version,
    inputs: tx.inputs.map((i) => ({
      previousOutpoint: { transactionId: i.txid, index: i.index },
      signatureScript: i.signatureScript || "",
      sequence: BigInt(i.sequence),
      sigOpCount: i.sigOpCount
    })),
    outputs: tx.outputs.map((o) => ({ amount: BigInt(o.value), scriptPublicKey: { version: o.spk.version, scriptPublicKey: bytesToHex2(o.spk.script) } })),
    lockTime: BigInt(tx.lockTime),
    subnetworkId: bytesToHex2(tx.subnetworkId)
  };
}
function kasStr(sompi) {
  const s = BigInt(sompi);
  const neg = s < 0n, a = neg ? -s : s;
  return `${neg ? "-" : ""}${a / SOMPI_PER_KAS}.${(a % SOMPI_PER_KAS).toString().padStart(8, "0")}`;
}
function kasToSompi(str) {
  const s = String(str).trim();
  if (!/^\d+(\.\d{1,8})?$/.test(s)) throw new Error(`bad KAS amount "${str}"`);
  const [w, f = ""] = s.split(".");
  return BigInt(w) * SOMPI_PER_KAS + BigInt((f + "00000000").slice(0, 8));
}

// core/contracts.js
var import_kaspa_ksm2 = __toESM(require_src(), 1);

// core/template.js
var HEX = /^[0-9a-f]*$/;
var INT_MIN = -(2n ** 63n) + 1n;
var INT_MAX = 2n ** 63n - 1n;
function clean2(h) {
  return String(h == null ? "" : h).trim().toLowerCase().replace(/^0x/, "");
}
function byteHex(n) {
  return (n < 16 ? "0" : "") + n.toString(16);
}
function scriptNumBytes(value) {
  let n = BigInt(value);
  if (n === 0n) return [];
  const neg = n < 0n;
  if (neg) n = -n;
  const out = [];
  while (n > 0n) {
    out.push(Number(n & 0xffn));
    n >>= 8n;
  }
  if (out[out.length - 1] & 128) out.push(neg ? 128 : 0);
  else if (neg) out[out.length - 1] |= 128;
  return out;
}
function pushBytes(bytes) {
  if (bytes.length > 75) throw new Error("push longer than 75 bytes is not used by these templates");
  return byteHex(bytes.length) + bytes.map(byteHex).join("");
}
function parseInt64(value, name) {
  const s = String(value == null ? "" : value).trim();
  if (!/^-?\d+$/.test(s)) throw new Error(`${name}: expected a whole number, got "${value}"`);
  const n = BigInt(s);
  if (n < INT_MIN || n > INT_MAX) throw new Error(`${name}: out of the 64-bit script range`);
  return n;
}
function pubkeyHex(value, name) {
  let h = clean2(value);
  if (/^(02|03)[0-9a-f]{64}$/.test(h)) h = h.slice(2);
  if (!/^[0-9a-f]{64}$/.test(h)) throw new Error(`${name}: expected a 32-byte x-only public key (64 hex)`);
  return h;
}
function encodeParam(type, value, name) {
  const label = name || type;
  if (type === "pubkey") return "20" + pubkeyHex(value, label);
  if (type === "byte[32]") {
    const h = clean2(value);
    if (!/^[0-9a-f]{64}$/.test(h)) throw new Error(`${label}: expected 32 bytes (64 hex)`);
    return "20" + h;
  }
  if (type === "int") {
    const n = parseInt64(value, label);
    if (n === 0n) return "00";
    if (n === -1n) return "4f";
    if (n >= 1n && n <= 16n) return byteHex(80 + Number(n));
    return pushBytes(scriptNumBytes(n));
  }
  throw new Error(`${label}: type "${type}" has no template encoding`);
}
function fill(template2, values) {
  if (!template2 || !Array.isArray(template2.segments) || !Array.isArray(template2.params)) throw new Error("not a template");
  const v = values || {};
  for (const k of Object.keys(v)) if (!template2.params.some((p) => p.name === k)) throw new Error(`${template2.id}: unknown parameter "${k}"`);
  const enc2 = {};
  for (const p of template2.params) {
    if (v[p.name] == null) throw new Error(`${template2.id}: missing value for "${p.name}"`);
    enc2[p.name] = encodeParam(p.type, v[p.name], p.name);
  }
  let out = "";
  for (const s of template2.segments) {
    if (s.hex != null) {
      if (!HEX.test(s.hex) || s.hex.length % 2) throw new Error(`${template2.id}: bad template segment`);
      out += s.hex;
    } else if (s.param) {
      if (!(s.param in enc2)) throw new Error(`${template2.id}: template slot "${s.param}" is not a parameter`);
      out += enc2[s.param];
    } else throw new Error(`${template2.id}: bad template segment`);
  }
  return out;
}

// core/templates.js
var templates_default = {
  "format": "kaspa-vault-templates/1",
  "compiler": {
    "name": "silverc",
    "commit": "3ed9733",
    "version": "0.1.0"
  },
  "note": "Generated by tools/build-templates.js from the .sil files beside this file. Do not edit by hand.",
  "contracts": {
    "airlock_v2": {
      "id": "airlock_v2",
      "file": "airlock_v2.sil",
      "contractName": "Airlock",
      "params": [
        {
          "name": "hot",
          "type": "pubkey"
        },
        {
          "name": "guardian",
          "type": "pubkey"
        },
        {
          "name": "rescue",
          "type": "pubkey"
        },
        {
          "name": "delay",
          "type": "int"
        }
      ],
      "segments": [
        {
          "hex": "76047269c9c9876375"
        },
        {
          "param": "delay"
        },
        {
          "hex": "7600050000000001a569b1b3519c69b4519c69b9be00c303000020"
        },
        {
          "param": "hot"
        },
        {
          "hex": "7e01ac7e876900c2780340420f94a269755167760466324211876375768201419d7576"
        },
        {
          "param": "guardian"
        },
        {
          "hex": "ac69b358a169b4519c69b9bf0000b3787853799458a1697652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b6800c303000020"
        },
        {
          "param": "rescue"
        },
        {
          "hex": "7e01ac7e876900c254790340420f94a26975757575757551676a6868"
        }
      ],
      "entries": [
        {
          "name": "release",
          "dispatchTag": "7269c9c9",
          "params": []
        },
        {
          "name": "rescue",
          "dispatchTag": "66324211",
          "params": [
            {
              "name": "guardianSig",
              "type": "sig"
            }
          ]
        }
      ],
      "sourceSha256": "800e22d731d25e42d1fc825bd9ba04baadd7ec4ccddcde62fcc315e451444ab5",
      "source": "// Compiled on silverc v1 (kaspanet/silverscript 3ed9733) and every path run on the Kaspa script engine, Oct 21, 2026 (tests/kasla_vault_tests.rs, 33 cases). Not yet spent on mainnet.\npragma silverscript ^0.1.0;\n\n// Airlock v2 (Kasla vault, part 2 of 2). Kaspero Labs.\n//\n// The waiting room between the Vault and Kasla checking. Coins arrive here only through\n// Vault.open. The alert window is the coin's age: nothing reaches checking until `delay` DAA\n// have passed. Before that, the only way out is the user's rescue wallet.\n//\n//   release()          NO signature, once the coin is `delay` DAA old. One input, one output:\n//                      everything to `hot` (the user's Kasla checking key), minus at most MAX_FEE.\n//                      Fixed destination, so Kasla's cron completes it without another approval.\n//   rescue(sig)        guardian, any time. Every input is this Airlock (up to MAX_INS coins),\n//                      exactly one output: everything to `rescue`, minus at most MAX_FEE.\n//                      The guardian can stop a withdrawal but can never receive a coin.\n//\n// hot      = Kasla hosted key (checking). Compromise of Kasla = compromise of this key.\n// guardian = the watcher's key, on a server that is not Kasla's. Safe to keep hot: it can only\n//            send to `rescue`.\n// rescue   = the user's throwaway wallet, connected once on the vault page. Receives only; it\n//            never signs anything. Any wallet works, including ones that cannot sign P2SH.\n// delay    = DAA blocks: 24h = 864,000; 48h = 1,728,000; 72h = 2,592,000.\n\ncontract Airlock(pubkey hot, pubkey guardian, pubkey rescue, int delay) {\n    int constant MAX_FEE = 1000000; // 0.01 KAS\n    int constant MAX_INS = 8;\n\n    entry release() {\n        require(this.ageDaa >= delay);\n        require(tx.inputs.length == 1);\n        require(tx.outputs.length == 1);\n        int current = tx.inputs[this.activeInputIndex].value;\n        require(tx.outputs[0].scriptPubKey == byte[](new ScriptPubKeyP2PK(hot)));\n        require(tx.outputs[0].value >= current - MAX_FEE);\n    }\n\n    entry rescue(sig guardianSig) {\n        require(checkSig(guardianSig, guardian));\n        require(tx.inputs.length <= MAX_INS);\n        require(tx.outputs.length == 1);\n        byte[] own = tx.inputs[this.activeInputIndex].scriptPubKey;\n        int total = 0;\n        for(i, 0, tx.inputs.length, MAX_INS) {\n            require(tx.inputs[i].scriptPubKey == own);\n            total = total + tx.inputs[i].value;\n        }\n        require(tx.outputs[0].scriptPubKey == byte[](new ScriptPubKeyP2PK(rescue)));\n        require(tx.outputs[0].value >= total - MAX_FEE);\n    }\n}\n",
      "compilerVersion": "0.1.0",
      "abiSchema": 1
    },
    "vault_v1": {
      "id": "vault_v1",
      "file": "vault_v1.sil",
      "contractName": "Vault",
      "params": [
        {
          "name": "hot",
          "type": "pubkey"
        },
        {
          "name": "guardian",
          "type": "pubkey"
        },
        {
          "name": "rescue",
          "type": "pubkey"
        },
        {
          "name": "airlockHash",
          "type": "byte[32]"
        }
      ],
      "segments": [
        {
          "hex": "76042426ad45876375768201419d7576"
        },
        {
          "param": "hot"
        },
        {
          "hex": "ac69b358a169b4519c69b9bf0000b3787853799458a1697652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b6800c3"
        },
        {
          "param": "airlockHash"
        },
        {
          "hex": "02000001aa7e01207e7c7e01877e876900c254790340420f94a269757575757575516776040d69ebd2876375768201419d7576"
        },
        {
          "param": "hot"
        },
        {
          "hex": "ac69b358a169b4519c69b9bf0000b3787853799458a1697652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b6800c35579876900c254790340420f94a269757575757575516776042e4f5118876375768201419d7576"
        },
        {
          "param": "guardian"
        },
        {
          "hex": "ac69b358a169b4519c69b9bf0000b3787853799458a1697652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b687652799f637676bf56798769547978be93557a75785193537a757b75727b6800c303000020"
        },
        {
          "param": "rescue"
        },
        {
          "hex": "7e01ac7e876900c254790340420f94a26975757575757551676a686868"
        }
      ],
      "entries": [
        {
          "name": "evacuate",
          "dispatchTag": "2e4f5118",
          "params": [
            {
              "name": "guardianSig",
              "type": "sig"
            }
          ]
        },
        {
          "name": "merge",
          "dispatchTag": "0d69ebd2",
          "params": [
            {
              "name": "hotSig",
              "type": "sig"
            }
          ]
        },
        {
          "name": "open",
          "dispatchTag": "2426ad45",
          "params": [
            {
              "name": "hotSig",
              "type": "sig"
            }
          ]
        }
      ],
      "sourceSha256": "ff2734f1e2687634ca80522345ff7df2f9a9b519ec987a217aaeecf3cb07776d",
      "source": "// Compiled on silverc v1 (kaspanet/silverscript 3ed9733) and every path run on the Kaspa script engine, Oct 21, 2026 (tests/kasla_vault_tests.rs, 33 cases). Not yet spent on mainnet.\npragma silverscript ^0.1.0;\n\n// Vault v1 (Kasla vault, part 1 of 2). Kaspero Labs.\n//\n// The savings coins. Kasla's own key can only push them into the Airlock, where they wait out\n// the alert window (24h). Nothing else leaves except toward the user's rescue wallet.\n//\n//   open(sig)       hot. Every input is this Vault (up to MAX_INS coins), exactly one output:\n//                   the Airlock, carrying the inputs' total minus at most MAX_FEE.\n//   merge(sig)      hot. Same shape, the one output is this Vault again (folds deposits).\n//   evacuate(sig)   guardian. Same shape, the one output is `rescue`. The \"not you?\" click:\n//                   the watcher empties the whole Vault into the throwaway wallet so an attacker\n//                   holding the hot key has nothing left to open. Delete this entry if you want\n//                   the watcher limited to coins already mid-withdrawal (see VAULT.md).\n//\n// airlockHash = blake2b-256 of the user's Airlock redeem script. Compile the Airlock FIRST,\n// then the Vault with its hash. The Airlock never refers back to the Vault, so there is no cycle.\n\ncontract Vault(pubkey hot, pubkey guardian, pubkey rescue, byte[32] airlockHash) {\n    int constant MAX_FEE = 1000000; // 0.01 KAS\n    int constant MAX_INS = 8;\n\n    entry open(sig hotSig) {\n        require(checkSig(hotSig, hot));\n        require(tx.inputs.length <= MAX_INS);\n        require(tx.outputs.length == 1);\n        byte[] own = tx.inputs[this.activeInputIndex].scriptPubKey;\n        int total = 0;\n        for(i, 0, tx.inputs.length, MAX_INS) {\n            require(tx.inputs[i].scriptPubKey == own);\n            total = total + tx.inputs[i].value;\n        }\n        require(tx.outputs[0].scriptPubKey == byte[](new ScriptPubKeyP2SH(airlockHash)));\n        require(tx.outputs[0].value >= total - MAX_FEE);\n    }\n\n    entry merge(sig hotSig) {\n        require(checkSig(hotSig, hot));\n        require(tx.inputs.length <= MAX_INS);\n        require(tx.outputs.length == 1);\n        byte[] own = tx.inputs[this.activeInputIndex].scriptPubKey;\n        int total = 0;\n        for(i, 0, tx.inputs.length, MAX_INS) {\n            require(tx.inputs[i].scriptPubKey == own);\n            total = total + tx.inputs[i].value;\n        }\n        require(tx.outputs[0].scriptPubKey == own);\n        require(tx.outputs[0].value >= total - MAX_FEE);\n    }\n\n    entry evacuate(sig guardianSig) {\n        require(checkSig(guardianSig, guardian));\n        require(tx.inputs.length <= MAX_INS);\n        require(tx.outputs.length == 1);\n        byte[] own = tx.inputs[this.activeInputIndex].scriptPubKey;\n        int total = 0;\n        for(i, 0, tx.inputs.length, MAX_INS) {\n            require(tx.inputs[i].scriptPubKey == own);\n            total = total + tx.inputs[i].value;\n        }\n        require(tx.outputs[0].scriptPubKey == byte[](new ScriptPubKeyP2PK(rescue)));\n        require(tx.outputs[0].value >= total - MAX_FEE);\n    }\n}\n",
      "compilerVersion": "0.1.0",
      "abiSchema": 1
    }
  }
};

// core/contracts.js
var NETWORKS = ["mainnet", "testnet-10", "testnet-11"];
var MIN_DELAY_DAA = 100n;
var MAX_DELAY_DAA = 30n * 864000n;
var TAGS = {
  airlock_v2: { release: "7269c9c9", rescue: "66324211" },
  vault_v1: { open: "2426ad45", merge: "0d69ebd2", evacuate: "2e4f5118" }
};
function template(id) {
  const t = templates_default.contracts[id];
  if (!t) throw new Error(`no template "${id}"`);
  return t;
}
function keyOf(value, what) {
  const s = String(value == null ? "" : value).trim().toLowerCase();
  const k = import_kaspa_ksm2.default.address.pubkeyFromInput(/^(02|03)[0-9a-f]{64}$/.test(s) ? s.slice(2) : s);
  if (!k) throw new Error(`${what}: not a Kaspa Schnorr public key or kaspa:q address`);
  return k;
}
function manifestFrom(t, network, values, extensions) {
  const script = fill(t, values);
  const compiler = { name: "silverc", version: t.compilerVersion || templates_default.compiler.version };
  if (t.abiSchema != null) compiler.abiSchema = t.abiSchema;
  compiler.commit = templates_default.compiler.commit;
  compiler.via = "kaspa-vault template";
  return import_kaspa_ksm2.default.create({
    network,
    script,
    name: t.contractName,
    entries: t.entries.map((e) => ({ name: e.name, dispatchTag: e.dispatchTag, params: e.params })),
    constructorArgs: t.params.map((p) => ({ name: p.name, type: p.type, value: String(values[p.name]) })),
    source: { text: t.source, contract: t.contractName },
    compiler,
    extensions
  });
}
function checkTags(id, m) {
  for (const [entry, tag] of Object.entries(TAGS[id])) {
    const e = m.entries.find((x) => x.name === entry);
    if (!e || !e.dispatch || e.dispatch.hex !== tag) throw new Error(`${id}: ${entry} tag is ${e && e.dispatch && e.dispatch.hex}, expected ${tag}`);
  }
}
function buildVault({ hot, guardian, rescue, delayDaa, network, extensions } = {}) {
  const net = network || "mainnet";
  if (!NETWORKS.includes(net)) throw new Error(`network must be one of ${NETWORKS.join(", ")}`);
  const h = keyOf(hot, "hot"), g = keyOf(guardian, "guardian"), r = keyOf(rescue, "rescue");
  if (h === g || h === r || g === r) throw new Error("hot, guardian and rescue must be three different keys");
  if (!/^\d+$/.test(String(delayDaa))) throw new Error("delayDaa must be a whole number of DAA");
  const delay = BigInt(String(delayDaa));
  if (delay < MIN_DELAY_DAA || delay > MAX_DELAY_DAA) throw new Error(`delayDaa must be between ${MIN_DELAY_DAA} and ${MAX_DELAY_DAA}`);
  const airlock = manifestFrom(template("airlock_v2"), net, { hot: h, guardian: g, rescue: r, delay: delay.toString() }, extensions);
  const vault = manifestFrom(template("vault_v1"), net, { hot: h, guardian: g, rescue: r, airlockHash: airlock.script.hash }, extensions);
  check({ airlock, vault, hot: h, guardian: g, rescue: r, delay });
  return { airlock, vault };
}
function check({ airlock, vault, hot, guardian, rescue, delay }) {
  for (const [id, m] of [["airlock_v2", airlock], ["vault_v1", vault]]) {
    const r = import_kaspa_ksm2.default.verify(JSON.stringify(m));
    if (!r.ok) throw new Error(`${id}: manifest does not verify: ${r.errors.join("; ")}`);
    checkTags(id, m);
    if (!/^kaspa(test)?:p/.test(m.address)) throw new Error(`${id}: address is not P2SH`);
  }
  const arg = (m, n) => {
    const a = (m.constructorArgs || []).find((x) => x.name === n);
    return a ? String(a.value).toLowerCase() : null;
  };
  if (arg(vault, "airlockHash") !== airlock.script.hash) throw new Error("the vault does not open into this airlock");
  for (const m of [airlock, vault]) {
    if (hot && arg(m, "hot") !== hot) throw new Error("hot key differs from the one asked for");
    if (guardian && arg(m, "guardian") !== guardian) throw new Error("guardian key differs from the one asked for");
    if (rescue && arg(m, "rescue") !== rescue) throw new Error("backup wallet differs from the one asked for");
  }
  if (arg(airlock, "hot") !== arg(vault, "hot") || arg(airlock, "guardian") !== arg(vault, "guardian") || arg(airlock, "rescue") !== arg(vault, "rescue")) {
    throw new Error("the two manifests name different keys");
  }
  const net = vault.network;
  const rescueAddr = import_kaspa_ksm2.default.p2pkAddress(net, arg(vault, "rescue")), hotAddr = import_kaspa_ksm2.default.p2pkAddress(net, arg(vault, "hot"));
  const pay = (m, e) => {
    const p = import_kaspa_ksm2.default.planSpend(m, e, {}).payTo;
    return p && p.address;
  };
  if (pay(vault, "evacuate") !== rescueAddr) throw new Error("vault.evacuate does not pay the backup wallet");
  if (pay(airlock, "rescue") !== rescueAddr) throw new Error("airlock.rescue does not pay the backup wallet");
  if (pay(airlock, "release") !== hotAddr) throw new Error("airlock.release does not pay the hot key");
  const csv = import_kaspa_ksm2.default.planSpend(airlock, "release", {}).sequence;
  if (delay != null && BigInt(csv) !== BigInt(delay)) throw new Error(`airlock delay is ${csv}, expected ${delay}`);
  if (arg(airlock, "delay") !== BigInt(csv).toString()) throw new Error("airlock delay argument and script disagree");
  return true;
}
function describe({ airlock, vault }) {
  const arg = (m, n) => {
    const a = (m.constructorArgs || []).find((x) => x.name === n);
    return a ? String(a.value).toLowerCase() : null;
  };
  const net = vault.network;
  return {
    network: net,
    vaultAddress: vault.address,
    airlockAddress: airlock.address,
    hotAddress: import_kaspa_ksm2.default.p2pkAddress(net, arg(vault, "hot")),
    rescueAddress: import_kaspa_ksm2.default.p2pkAddress(net, arg(vault, "rescue")),
    guardian: arg(vault, "guardian"),
    delayDaa: import_kaspa_ksm2.default.planSpend(airlock, "release", {}).sequence
  };
}

// core/card.js
var CARD_FORMAT = "kaspa-vault-card/1";
function makeCard({ vault, airlock, watcher }) {
  const info = describe({ vault, airlock });
  const arg = (n) => String(vault.constructorArgs.find((a) => a.name === n).value);
  return {
    format: CARD_FORMAT,
    network: info.network,
    keys: { hot: arg("hot"), guardian: arg("guardian"), rescue: arg("rescue") },
    delayDaa: String(info.delayDaa),
    addresses: { vault: info.vaultAddress, airlock: info.airlockAddress, hot: info.hotAddress, rescue: info.rescueAddress },
    watcher: watcher ? { url: String(watcher.url || ""), name: watcher.name ? String(watcher.name) : void 0 } : null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function openCard(card) {
  const c = typeof card === "string" ? JSON.parse(card) : card;
  if (!c || c.format !== CARD_FORMAT) throw new Error("not a vault card");
  const built = buildVault({ hot: c.keys.hot, guardian: c.keys.guardian, rescue: c.keys.rescue, delayDaa: c.delayDaa, network: c.network });
  const info = describe(built);
  if (c.addresses) {
    if (c.addresses.vault && c.addresses.vault !== info.vaultAddress) throw new Error("this card does not add up: its vault address is not what its keys produce");
    if (c.addresses.airlock && c.addresses.airlock !== info.airlockAddress) throw new Error("this card does not add up: its airlock address is not what its keys produce");
    if (c.addresses.rescue && c.addresses.rescue !== info.rescueAddress) throw new Error("this card does not add up: its backup wallet is not its rescue key");
  }
  return { ...built, info, watcher: c.watcher || null };
}
function manifestFiles({ vault, airlock }) {
  const short2 = (a) => a.split(":")[1].slice(0, 8);
  return [
    { name: `Vault-${short2(vault.address)}.ksm`, text: JSON.stringify(vault, null, 2) },
    { name: `Airlock-${short2(airlock.address)}.ksm`, text: JSON.stringify(airlock, null, 2) }
  ];
}
function registrationMessage({ guardian, vaultAddress, email, time }) {
  return [
    "kaspa-vault: watch this vault",
    `watcher: ${String(guardian).toLowerCase()}`,
    `vault: ${String(vaultAddress).toLowerCase()}`,
    `email: ${String(email).trim().toLowerCase()}`,
    `time: ${time}`
  ].join("\n");
}

// core/spend.js
var import_kaspa_ksm3 = __toESM(require_src(), 1);
var MAX_FEE = 1000000n;
var MAX_COVENANT_INPUTS = 8;
var SEQ_MARGIN_DAA = 20n;
var MIN_CHANGE = 50000000n;
var MAX_PAYMENT_INPUTS = 60;
function fail(code, message, extra) {
  const e = new Error(message);
  e.code = code;
  Object.assign(e, extra || {});
  return e;
}
var sum = (list) => list.reduce((a, c) => a + BigInt(c.amount), 0n);
var DUMMY_SIG = "00".repeat(65);
function entryOf(c) {
  return { amount: BigInt(c.amount), spk: c.spk, blockDaaScore: BigInt(c.blockDaaScore) };
}
function inputOf(c, sequence, sigOpCount, sigScript) {
  return { txid: c.txid, index: c.index, sequence, sigOpCount, signatureScript: sigScript };
}
function outputTo(address, value) {
  return { value, spk: scriptPublicKey(address) };
}
var WHERE = {
  open: "airlock",
  merge: "self",
  evacuate: "payTo",
  rescue: "payTo",
  release: "payTo"
};
function covenantSpend({ manifest, entry, coins, daa, feeRate, airlockAddress }) {
  if (!WHERE[entry]) throw fail("BAD_ENTRY", `unknown entry "${entry}"`);
  if (!Array.isArray(coins) || !coins.length) throw fail("NO_COINS", "nothing to spend");
  if (coins.length > MAX_COVENANT_INPUTS) throw fail("TOO_MANY", `at most ${MAX_COVENANT_INPUTS} coins per spend; split it`);
  if (entry === "release" && coins.length !== 1) throw fail("TOO_MANY", "release takes exactly one coin per transaction");
  const own = bytesToHex2(scriptPublicKey(manifest.address).script);
  for (const c of coins) {
    if (bytesToHex2(c.spk.script) !== own) throw fail("WRONG_COIN", `coin ${c.txid}:${c.index} is not at ${manifest.address}`);
  }
  const seen = /* @__PURE__ */ new Set();
  for (const c of coins) {
    const k = `${c.txid}:${c.index}`;
    if (seen.has(k)) throw fail("WRONG_COIN", `coin ${k} listed twice`);
    seen.add(k);
  }
  const plan = import_kaspa_ksm3.default.planSpend(manifest, entry, {
    chain: { daa: BigInt(daa), nowMs: Date.now() },
    utxos: coins.map((c) => ({ blockDaaScore: BigInt(c.blockDaaScore).toString() }))
  });
  if (!plan.ready) throw fail("NOT_READY", "not spendable yet: " + plan.blockers.join("; "), { plan });
  const sequence = BigInt(plan.sequence);
  if (sequence > 0n) {
    for (const c of coins) {
      if (BigInt(daa) < BigInt(c.blockDaaScore) + sequence + SEQ_MARGIN_DAA) throw fail("NOT_READY", "the waiting time has not fully passed yet", { plan });
    }
  }
  let destination;
  if (WHERE[entry] === "payTo") {
    if (!plan.payTo) throw fail("BAD_ENTRY", `${entry} has no fixed payee in this manifest`);
    destination = plan.payTo.address;
  } else if (WHERE[entry] === "self") {
    destination = manifest.address;
  } else {
    if (!airlockAddress) throw fail("BAD_ENTRY", "open needs the airlock address");
    if (plan.payTo) throw fail("BAD_ENTRY", "open was expected to pay a script hash");
    const arg = (manifest.constructorArgs || []).find((a) => a.name === "airlockHash");
    const decoded = scriptPublicKey(airlockAddress).script;
    if (!arg || decoded.length !== 35 || bytesToHex2(decoded.slice(2, 34)) !== String(arg.value).toLowerCase()) {
      throw fail("BAD_ENTRY", `${airlockAddress} is not this vault's airlock`);
    }
    destination = airlockAddress;
  }
  const sigOpCount = Math.max(1, plan.sigOpCount);
  const dummyScript = import_kaspa_ksm3.default.signatureScript(plan, Object.fromEntries(plan.signaturesNeeded.map((n) => [n, DUMMY_SIG])));
  const tx = newTx();
  tx.lockTime = BigInt(plan.lockTime);
  tx.inputs = coins.map((c) => inputOf(c, sequence, sigOpCount, dummyScript));
  const entries = coins.map(entryOf);
  const total = sum(coins);
  let fee = 0n;
  for (let pass = 0; pass < 3; pass++) {
    tx.outputs = [outputTo(destination, total - fee)];
    const next = feeFor(masses(tx, entries), feeRate);
    if (next === fee) break;
    fee = next;
  }
  tx.outputs = [outputTo(destination, total - fee)];
  if (fee > MAX_FEE) throw fail("TOO_HEAVY", `this spend needs a ${kasStr(fee)} KAS fee, the contract allows ${kasStr(MAX_FEE)}; use fewer coins`, { fee });
  if (total - fee <= 0n) throw fail("DUST", "the coins do not cover the fee");
  const m = masses(tx, entries);
  if (m.compute > MAX_SAFE_MASS || m.storage > MAX_SAFE_MASS) throw fail("TOO_HEAVY", "transaction too heavy");
  for (const i of tx.inputs) i.signatureScript = "";
  return { kind: "covenant", tx, entries, plan, fee, amountOut: total - fee, destination, entry, manifest };
}
function capacity({ manifest, entry, feeRate, airlockAddress }) {
  const spk = scriptPublicKey(manifest.address);
  let best = 0;
  for (let n = 1; n <= (entry === "release" ? 1 : MAX_COVENANT_INPUTS); n++) {
    const coins = Array.from({ length: n }, (_, i) => ({ txid: i.toString(16).padStart(64, "0"), index: 0, amount: 100000n * SOMPI_PER_KAS, blockDaaScore: 0n, spk }));
    try {
      covenantSpend({ manifest, entry, coins, daa: 10n ** 12n, feeRate, airlockAddress });
      best = n;
    } catch (e) {
      if (e.code === "TOO_HEAVY") break;
      throw e;
    }
  }
  return best;
}
function batches(coins, perSpend) {
  if (!(perSpend >= 1)) throw fail("TOO_HEAVY", "not even one coin fits inside MAX_FEE at this fee rate");
  const sorted = [...coins].sort((a, b) => BigInt(b.amount) > BigInt(a.amount) ? 1 : -1);
  const out = [];
  for (let i = 0; i < sorted.length; i += perSpend) out.push(sorted.slice(i, i + perSpend));
  return out;
}
function payment({ coins, from, to, amount, all, feeRate }) {
  const fromSpk = bytesToHex2(scriptPublicKey(from).script);
  const usable = coins.filter((c) => bytesToHex2(c.spk.script) === fromSpk && !c.isCoinbase);
  if (!usable.length) throw fail("NO_COINS", "the wallet is empty");
  const sorted = [...usable].sort((a, b) => BigInt(b.amount) > BigInt(a.amount) ? 1 : -1);
  const dummy = p2pkSignatureScript(DUMMY_SIG);
  const build = (picked, outputs) => {
    const tx = newTx();
    tx.inputs = picked.map((c) => inputOf(c, 0n, 1, dummy));
    tx.outputs = outputs;
    return { tx, entries: picked.map(entryOf) };
  };
  if (all) {
    const picked = sorted.slice(0, MAX_PAYMENT_INPUTS);
    const total = sum(picked);
    let fee = 0n;
    for (let pass = 0; pass < 3; pass++) {
      const { tx: tx2, entries: entries2 } = build(picked, [outputTo(to, total - fee)]);
      const next = feeFor(masses(tx2, entries2), feeRate);
      if (next === fee) break;
      fee = next;
    }
    if (total - fee <= 0n) throw fail("DUST", "the wallet does not cover the fee");
    const { tx, entries } = build(picked, [outputTo(to, total - fee)]);
    return finishPayment(tx, entries, fee, total - fee, to, sorted.length > picked.length);
  }
  const want = BigInt(amount);
  if (!(want > 0n)) throw fail("AMOUNT", "amount must be positive");
  for (let n = 1; n <= Math.min(sorted.length, MAX_PAYMENT_INPUTS); n++) {
    const picked = sorted.slice(0, n);
    const total = sum(picked);
    if (total <= want) continue;
    let fee = 0n, ok = false;
    for (let pass = 0; pass < 4; pass++) {
      const change2 = total - want - fee;
      if (change2 < MIN_CHANGE) break;
      const { tx, entries } = build(picked, [outputTo(to, want), outputTo(from, change2)]);
      const next = feeFor(masses(tx, entries), feeRate);
      if (next === fee) {
        ok = true;
        break;
      }
      fee = next;
    }
    const change = total - want - fee;
    if (ok && change >= MIN_CHANGE) {
      const { tx, entries } = build(picked, [outputTo(to, want), outputTo(from, change)]);
      return finishPayment(tx, entries, fee, want, to, false);
    }
  }
  const max = (() => {
    try {
      return payment({ coins, from, to, all: true, feeRate }).amountOut;
    } catch (e) {
      return 0n;
    }
  })();
  throw fail("AMOUNT", `that leaves less than ${kasStr(MIN_CHANGE)} KAS behind; send at most ${kasStr(max > MIN_CHANGE ? max - MIN_CHANGE : 0n)} KAS, or everything`, { max });
}
function finishPayment(tx, entries, fee, amountOut, to, partial) {
  const m = masses(tx, entries);
  if (m.compute > MAX_SAFE_MASS || m.storage > MAX_SAFE_MASS) throw fail("TOO_HEAVY", "too many small coins; consolidate first");
  for (const i of tx.inputs) i.signatureScript = "";
  return { kind: "payment", tx, entries, fee, amountOut, destination: to, partial };
}
function keySigner(privHex) {
  const pub = xOnlyPublicKey(privHex);
  return { publicKey: pub, sign: async (sighash) => schnorrSign(sighash, privHex) };
}
async function sign(built, signers) {
  const { tx, entries } = built;
  const out = { ...tx, inputs: tx.inputs.map((i) => ({ ...i })) };
  if (built.kind === "payment") {
    const s = signers && signers.sign ? signers : null;
    if (!s) throw fail("SIGNER", "a payment needs one signer");
    for (let i = 0; i < out.inputs.length; i++) {
      const h = signatureHash(out, entries, i);
      const sig = normSig(await s.sign(h, { inputIndex: i, kind: "payment" }));
      const pk = bytesToHex2(entries[i].spk.script.slice(1, 33));
      if (!schnorrVerify(sig, h, pk)) throw fail("SIGNER", `the signature for input ${i} does not match the coin's key`);
      out.inputs[i].signatureScript = p2pkSignatureScript(sig);
    }
  } else {
    const plan = built.plan;
    const named = {};
    for (const s of built.manifest.entries.find((e) => e.name === built.entry).signers || []) named[s.sig] = s.pubkey;
    for (let i = 0; i < out.inputs.length; i++) {
      const h = signatureHash(out, entries, i);
      const sigs = {};
      for (const name of plan.signaturesNeeded) {
        const s = signers && signers[name];
        if (!s) throw fail("SIGNER", `no signer for ${name}`);
        const sig = normSig(await s.sign(h, { inputIndex: i, kind: built.entry, param: name }));
        if (named[name] && !schnorrVerify(sig, h, named[name])) throw fail("SIGNER", `${name}: the signature does not match the key the contract names`);
        sigs[name] = sig;
      }
      out.inputs[i].signatureScript = import_kaspa_ksm3.default.signatureScript(plan, sigs);
    }
  }
  return { tx: out, entries, txid: transactionId(out), fee: built.fee, amountOut: built.amountOut, destination: built.destination };
}
function normSig(s) {
  const h = String(s && s.signature ? s.signature : s).toLowerCase().replace(/^0x/, "");
  if (/^41[0-9a-f]{130}$/.test(h)) return h.slice(2);
  if (/^[0-9a-f]{130}$/.test(h)) return h;
  if (/^[0-9a-f]{128}$/.test(h)) return h + "01";
  throw fail("SIGNER", "unexpected signature shape");
}

// core/vault.js
function fail2(code, message, extra) {
  const e = new Error(message);
  e.code = code;
  Object.assign(e, extra || {});
  return e;
}
var sum2 = (list) => list.reduce((a, c) => a + BigInt(c.amount), 0n);
var VaultClient = class {
  constructor({ vault, airlock }, { provider, feeRate } = {}) {
    if (!provider) throw new Error("a provider is required (core/provider.js restProvider, or your own)");
    check({ airlock, vault });
    this.manifests = { vault, airlock };
    this.info = describe({ vault, airlock });
    this.provider = provider;
    this.fixedFeeRate = feeRate != null ? BigInt(feeRate) : null;
  }
  async feeRate() {
    return this.fixedFeeRate != null ? this.fixedFeeRate : this.provider.feeRate();
  }
  /** Everything a page shows. Reads three addresses and the DAA score; changes nothing. */
  async snapshot() {
    const { vaultAddress, airlockAddress, hotAddress } = this.info;
    const [coins, daa] = await Promise.all([this.provider.coins([vaultAddress, airlockAddress, hotAddress]), this.provider.virtualDaa()]);
    const at = (a) => coins.filter((c) => c.address === a);
    const vaultCoins = at(vaultAddress), airlockCoins = at(airlockAddress), hotCoins = at(hotAddress);
    const delay = BigInt(this.info.delayDaa);
    const pending = airlockCoins.map((c) => {
      const releaseAtDaa = BigInt(c.blockDaaScore) + delay + SEQ_MARGIN_DAA;
      const left = releaseAtDaa > daa ? releaseAtDaa - daa : 0n;
      return { coin: c, amount: c.amount, releaseAtDaa, readyInDaa: left, ready: left === 0n, etaMs: Number(left) * 100 };
    }).sort((a, b) => a.releaseAtDaa < b.releaseAtDaa ? -1 : 1);
    return {
      daa,
      vaultCoins,
      airlockCoins,
      hotCoins,
      pending,
      balances: { vault: sum2(vaultCoins), pending: sum2(airlockCoins), hot: sum2(hotCoins), protected: sum2(vaultCoins) + sum2(airlockCoins) }
    };
  }
  /** How many coins one withdrawal transaction can carry right now. */
  async openCapacity() {
    return capacity({ manifest: this.manifests.vault, entry: "open", feeRate: await this.feeRate(), airlockAddress: this.info.airlockAddress });
  }
  async deposit({ signer, amount, all, hotCoins }) {
    const coins = hotCoins || await this.provider.coins([this.info.hotAddress]);
    const built = payment({ coins, from: this.info.hotAddress, to: this.info.vaultAddress, amount: amount != null ? BigInt(amount) : void 0, all, feeRate: await this.feeRate() });
    const signed = await sign(built, signer);
    const txid = await this.provider.submit(signed.tx, signed.entries);
    return { txid, amount: signed.amountOut, fee: signed.fee };
  }
  /**
   * Start a withdrawal. `coins`: vault coins to take out (default: all of them). Whole coins
   * move; whatever is taken out lands in the hot wallet after the delay, all of it.
   * Returns { started: [{ txid, amount, fee, coins }], failed: [{ coins, error, code }] }.
   */
  async withdraw({ signer, coins }) {
    const snap = coins ? null : await this.snapshot();
    const list = coins || snap.vaultCoins;
    if (!list.length) throw fail2("NO_COINS", "the vault is empty");
    const daa = snap ? snap.daa : await this.provider.virtualDaa();
    const feeRate = await this.feeRate();
    const cap = capacity({ manifest: this.manifests.vault, entry: "open", feeRate, airlockAddress: this.info.airlockAddress });
    const started = [], failed = [];
    for (const group of batches(list, cap)) {
      try {
        const built = covenantSpend({ manifest: this.manifests.vault, entry: "open", coins: group, daa, feeRate, airlockAddress: this.info.airlockAddress });
        const signed = await sign(built, { hotSig: signer });
        const txid = await this.provider.submit(signed.tx, signed.entries);
        started.push({ txid, amount: signed.amountOut, fee: signed.fee, coins: group });
      } catch (e) {
        failed.push({ coins: group, error: e.message, code: e.code });
      }
    }
    return { started, failed };
  }
  /** Pick vault coins covering `amount` (fewest coins, largest first). The rest stays in. */
  static pickCoins(vaultCoins, amount) {
    const want = BigInt(amount);
    const sorted = [...vaultCoins].sort((a, b) => BigInt(b.amount) > BigInt(a.amount) ? 1 : -1);
    const out = [];
    let got = 0n;
    for (const c of sorted) {
      if (got >= want) break;
      out.push(c);
      got += BigInt(c.amount);
    }
    if (got < want) throw fail2("AMOUNT", "the vault holds less than that");
    return out;
  }
  /** Release every airlock coin whose delay has passed. Needs no key: anyone may push it. */
  async release() {
    const snap = await this.snapshot();
    const feeRate = await this.feeRate();
    const done = [], waiting = [], failed = [];
    for (const p of snap.pending) {
      if (!p.ready) {
        waiting.push(p);
        continue;
      }
      try {
        const built = covenantSpend({ manifest: this.manifests.airlock, entry: "release", coins: [p.coin], daa: snap.daa, feeRate });
        const signed = await sign(built, {});
        done.push({ txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, coin: p.coin });
      } catch (e) {
        if (e.code === "SPENT") continue;
        failed.push({ coin: p.coin, error: e.message, code: e.code });
      }
    }
    return { released: done, waiting, failed };
  }
  async merge({ signer }) {
    const snap = await this.snapshot();
    if (snap.vaultCoins.length < 2) return { merged: [], failed: [] };
    const feeRate = await this.feeRate();
    const cap = capacity({ manifest: this.manifests.vault, entry: "merge", feeRate });
    const merged = [], failed = [];
    for (const group of batches(snap.vaultCoins, cap)) {
      if (group.length < 2) continue;
      try {
        const built = covenantSpend({ manifest: this.manifests.vault, entry: "merge", coins: group, daa: snap.daa, feeRate });
        const signed = await sign(built, { hotSig: signer });
        merged.push({ txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, coins: group });
      } catch (e) {
        failed.push({ coins: group, error: e.message, code: e.code });
      }
    }
    return { merged, failed };
  }
  async sendFromHot({ signer, to, amount, all }) {
    const coins = await this.provider.coins([this.info.hotAddress]);
    const built = payment({ coins, from: this.info.hotAddress, to, amount: amount != null ? BigInt(amount) : void 0, all, feeRate: await this.feeRate() });
    const signed = await sign(built, signer);
    return { txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, fee: signed.fee };
  }
  // ---- the guardian's paths (the watcher calls these; the contracts only let them pay the backup wallet) ----
  async rescue({ guardian }) {
    return this._guardian("rescue", this.manifests.airlock, "airlockCoins", guardian);
  }
  async evacuate({ guardian }) {
    return this._guardian("evacuate", this.manifests.vault, "vaultCoins", guardian);
  }
  /** Both, airlock first (money already on its way out is the urgent part). */
  async emergency({ guardian }) {
    const a = await this.rescue({ guardian });
    const b = await this.evacuate({ guardian });
    return { moved: [...a.moved, ...b.moved], failed: [...a.failed, ...b.failed] };
  }
  async _guardian(entry, manifest, which, guardian) {
    const snap = await this.snapshot();
    const coins = snap[which];
    const feeRate = await this.feeRate();
    const cap = capacity({ manifest, entry, feeRate });
    const moved = [], failed = [];
    for (const group of batches(coins, cap || 1)) {
      try {
        const built = covenantSpend({ manifest, entry, coins: group, daa: snap.daa, feeRate });
        if (built.destination !== this.info.rescueAddress) throw fail2("BAD_ENTRY", `${entry} would pay ${built.destination}, not the backup wallet`);
        const signed = await sign(built, { guardianSig: guardian });
        moved.push({ entry, txid: await this.provider.submit(signed.tx, signed.entries), amount: signed.amountOut, coins: group });
      } catch (e) {
        if (e.code === "SPENT") continue;
        failed.push({ entry, coins: group, error: e.message, code: e.code });
      }
    }
    return { moved, failed };
  }
};

// core/provider.js
var DEFAULT_URL = "https://api.kaspa.org";
var TIMEOUT_MS = 2e4;
function stringify(obj) {
  const marks = [];
  const s = JSON.stringify(obj, (k, v) => {
    if (typeof v === "bigint") {
      marks.push(v.toString());
      return `__BIG${marks.length - 1}__`;
    }
    return v;
  });
  return s.replace(/"__BIG(\d+)__"/g, (m, i) => marks[Number(i)]);
}
function classify(msg) {
  const m = String(msg || "");
  if (/sequence lock/i.test(m)) return "SEQUENCE_LOCK";
  if (/storage mass/i.test(m)) return "STORAGE_MASS";
  if (/already spent|missing outpoint|not found|orphan|double spend/i.test(m)) return "SPENT";
  if (/fee|insufficient/i.test(m)) return "FEE";
  return "REJECTED";
}
function restProvider({ url = DEFAULT_URL, fetch: f } = {}) {
  const base = String(url).replace(/\/+$/, "");
  const doFetch = f || globalThis.fetch;
  if (!doFetch) throw new Error("no fetch available; pass { fetch }");
  async function call(path, init) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    try {
      const r = await doFetch(base + path, { ...init || {}, signal: ctrl ? ctrl.signal : void 0 });
      const text = await r.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        data = null;
      }
      if (!r.ok) {
        const msg = data && (data.error || data.detail && JSON.stringify(data.detail)) || text.slice(0, 300) || `HTTP ${r.status}`;
        const e = new Error(`${path}: ${msg}`);
        e.status = r.status;
        e.code = classify(msg);
        throw e;
      }
      return data;
    } finally {
      if (t) clearTimeout(t);
    }
  }
  function coinOf(e) {
    const spkHex = String(e.utxoEntry && e.utxoEntry.scriptPublicKey && e.utxoEntry.scriptPublicKey.scriptPublicKey || "");
    const version = Number(e.utxoEntry && e.utxoEntry.scriptPublicKey && e.utxoEntry.scriptPublicKey.version || 0);
    return {
      address: String(e.address || "").toLowerCase(),
      txid: String(e.outpoint.transactionId).toLowerCase(),
      index: Number(e.outpoint.index),
      amount: BigInt(e.utxoEntry.amount),
      blockDaaScore: BigInt(e.utxoEntry.blockDaaScore),
      isCoinbase: !!e.utxoEntry.isCoinbase,
      spk: { version, script: hexToBytes2(spkHex) }
    };
  }
  return {
    name: `rest:${base}`,
    async coins(addresses) {
      const list = Array.isArray(addresses) ? addresses : [addresses];
      if (!list.length) return [];
      const data = await call("/addresses/utxos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresses: list }) });
      const coins = (Array.isArray(data) ? data : []).map(coinOf).filter((c) => /^[0-9a-f]{64}$/.test(c.txid));
      for (const c of coins) {
        const want = bytesToHex2(scriptPublicKey(c.address).script);
        if (bytesToHex2(c.spk.script) !== want) throw new Error(`provider returned a coin whose script does not match ${c.address}`);
      }
      return coins;
    },
    async virtualDaa() {
      const d = await call("/info/blockdag");
      return BigInt(d.virtualDaaScore);
    },
    async feeRate() {
      try {
        const d = await call("/info/fee-estimate");
        const r = BigInt(Math.ceil(Number(d && d.priorityBucket && d.priorityBucket.feerate) || 0));
        return r > MIN_RELAY_FEE_PER_GRAM ? r : MIN_RELAY_FEE_PER_GRAM;
      } catch (e) {
        return MIN_RELAY_FEE_PER_GRAM;
      }
    },
    async submit(tx) {
      const body = stringify({ transaction: toRestTransaction(tx), allowOrphan: false });
      const expected = transactionId(tx);
      try {
        const d = await call("/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body });
        if (d && d.error) {
          const e = new Error(d.error);
          e.code = classify(d.error);
          throw e;
        }
        const id = String(d && d.transactionId || expected).toLowerCase();
        if (id !== expected) throw new Error(`the node reports txid ${id}, this package computed ${expected}`);
        return id;
      } catch (e) {
        if (String(e.message).includes(expected) && /already in the mempool|already accepted/i.test(e.message)) return expected;
        throw e;
      }
    }
  };
}
function fallbackProvider(providers, { onSwitch } = {}) {
  const list = providers.filter(Boolean);
  if (!list.length) throw new Error("fallbackProvider: no providers");
  const unreachable = (e) => !e.code || e.code === "REJECTED" && /timed out|no answer|unreachable|connection|ECONN|ENOTFOUND|EAI_AGAIN|socket|fetch failed|HTTP 5\d\d|abort/i.test(e.message) || e.status >= 500;
  async function first(method, args) {
    let lastErr = null;
    for (let i = 0; i < list.length; i++) {
      try {
        const r = await list[i][method](...args);
        if (i > 0 && onSwitch) onSwitch(list[i].name, lastErr);
        return r;
      } catch (e) {
        lastErr = e;
        if (!unreachable(e)) throw e;
      }
    }
    throw lastErr;
  }
  return {
    name: list.map((p) => p.name).join(" > "),
    coins: (...a) => first("coins", a),
    virtualDaa: (...a) => first("virtualDaa", a),
    feeRate: (...a) => first("feeRate", a),
    submit: (...a) => first("submit", a)
  };
}

// core/provider-wrpc.js
var TIMEOUT_MS2 = 2e4;
function parseLossless(text) {
  return JSON.parse(String(text).replace(/([:\[,]\s*)(-?\d{16,})(?=\s*[,}\]])/g, '$1"$2"'));
}
function classify2(msg) {
  const m = String(msg || "");
  if (/sequence lock/i.test(m)) return "SEQUENCE_LOCK";
  if (/storage mass|WrongMass/i.test(m)) return "STORAGE_MASS";
  if (/already spent|missing outpoint|not found|orphan|double spend/i.test(m)) return "SPENT";
  if (/fee|insufficient/i.test(m)) return "FEE";
  return "REJECTED";
}
function wrpcJsonProvider({ url = "ws://127.0.0.1:18110", WebSocket: WS, timeoutMs = TIMEOUT_MS2 } = {}) {
  const Socket = WS || globalThis.WebSocket;
  if (!Socket) throw new Error("no WebSocket available; pass { WebSocket } (the ws package in Node 18)");
  let ws = null, opening = null, nextId = 1;
  const pending = /* @__PURE__ */ new Map();
  function connect() {
    if (ws && ws.readyState === 1) return Promise.resolve(ws);
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      const s = new Socket(url);
      const t = setTimeout(() => {
        try {
          s.close();
        } catch (e) {
        }
        reject(new Error(`${url}: connection timed out`));
      }, timeoutMs);
      const onMsg = (ev) => {
        let m;
        try {
          m = parseLossless(typeof ev === "string" ? ev : ev.data !== void 0 ? ev.data : ev);
        } catch (e) {
          return;
        }
        const p = pending.get(m.id);
        if (!p) return;
        pending.delete(m.id);
        clearTimeout(p.t);
        if (m.error) {
          const e = new Error(m.error.message || JSON.stringify(m.error));
          e.code = classify2(e.message);
          p.reject(e);
        } else p.resolve(m.params || {});
      };
      const onClose = () => {
        ws = null;
        for (const [id, p] of pending) {
          clearTimeout(p.t);
          p.reject(new Error(`${url}: connection closed`));
          pending.delete(id);
        }
      };
      if (typeof s.on === "function") {
        s.on("open", () => {
          clearTimeout(t);
          ws = s;
          opening = null;
          resolve(s);
        });
        s.on("message", (data) => onMsg(String(data)));
        s.on("close", onClose);
        s.on("error", (e) => {
          clearTimeout(t);
          opening = null;
          reject(new Error(`${url}: ${e.message}`));
        });
      } else {
        s.onopen = () => {
          clearTimeout(t);
          ws = s;
          opening = null;
          resolve(s);
        };
        s.onmessage = onMsg;
        s.onclose = onClose;
        s.onerror = () => {
          clearTimeout(t);
          opening = null;
          reject(new Error(`${url}: connection failed`));
        };
      }
    });
    return opening;
  }
  async function call(method, params) {
    const s = await connect();
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method}: no answer within ${timeoutMs / 1e3}s`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, t });
      s.send(stringify({ id, method, params: params || {} }));
    });
  }
  function spkFromJson(v) {
    const h = String(v || "").toLowerCase();
    return { version: parseInt(h.slice(0, 4) || "0", 16), script: hexToBytes2(h.slice(4)) };
  }
  return {
    name: `wrpc-json:${url}`,
    call,
    close() {
      if (ws) try {
        ws.close();
      } catch (e) {
      }
      ws = null;
    },
    async coins(addresses) {
      const list = Array.isArray(addresses) ? addresses : [addresses];
      if (!list.length) return [];
      const r = await call("getUtxosByAddresses", { addresses: list });
      const out = (r.entries || []).map((e) => ({
        address: String(e.address || "").toLowerCase(),
        txid: String(e.outpoint.transactionId).toLowerCase(),
        index: Number(e.outpoint.index),
        amount: BigInt(e.utxoEntry.amount),
        blockDaaScore: BigInt(e.utxoEntry.blockDaaScore),
        isCoinbase: !!e.utxoEntry.isCoinbase,
        spk: spkFromJson(e.utxoEntry.scriptPublicKey)
      }));
      for (const c of out) {
        if (bytesToHex2(c.spk.script) !== bytesToHex2(scriptPublicKey(c.address).script)) throw new Error(`node returned a coin whose script does not match ${c.address}`);
      }
      return out;
    },
    async virtualDaa() {
      return BigInt((await call("getBlockDagInfo", {})).virtualDaaScore);
    },
    async feeRate() {
      try {
        const r = await call("getFeeEstimate", {});
        const f = BigInt(Math.ceil(Number(r && r.estimate && r.estimate.priorityBucket && r.estimate.priorityBucket.feerate) || 0));
        return f > MIN_RELAY_FEE_PER_GRAM ? f : MIN_RELAY_FEE_PER_GRAM;
      } catch (e) {
        return MIN_RELAY_FEE_PER_GRAM;
      }
    },
    async submit(tx, entries) {
      if (!entries) throw new Error("submit over wRPC needs the spent coins (for the storage mass commitment)");
      const transaction = {
        version: tx.version,
        inputs: tx.inputs.map((i) => ({
          previousOutpoint: { transactionId: i.txid, index: i.index },
          signatureScript: i.signatureScript || "",
          sequence: BigInt(i.sequence),
          sigOpCount: i.sigOpCount,
          verboseData: null
        })),
        outputs: tx.outputs.map((o) => ({
          value: BigInt(o.value),
          scriptPublicKey: o.spk.version.toString(16).padStart(4, "0") + bytesToHex2(o.spk.script),
          verboseData: null,
          covenant: null
        })),
        lockTime: BigInt(tx.lockTime),
        subnetworkId: bytesToHex2(tx.subnetworkId),
        gas: BigInt(tx.gas),
        payload: bytesToHex2(tx.payload),
        storageMass: storageMass(tx, entries),
        verboseData: null
      };
      const expected = transactionId(tx);
      try {
        const r = await call("submitTransaction", { transaction, allowOrphan: false });
        const id = String(r.transactionId || expected).toLowerCase();
        if (id !== expected) throw new Error(`the node reports txid ${id}, this package computed ${expected}`);
        return id;
      } catch (e) {
        if (String(e.message).includes(expected) && /already in the mempool|already accepted/i.test(e.message)) return expected;
        throw e;
      }
    }
  };
}

// node_modules/@noble/hashes/pbkdf2.js
function pbkdf2Init(hash, _password, _salt, _opts) {
  ahash(hash);
  const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
  const { c, dkLen, asyncTick } = opts;
  anumber(c, "c");
  anumber(dkLen, "dkLen");
  anumber(asyncTick, "asyncTick");
  if (c < 1)
    throw new Error('"c" (iterations) must be >= 1');
  if (dkLen < 1)
    throw new Error('"dkLen" must be >= 1');
  if (dkLen > (2 ** 32 - 1) * hash.outputLen)
    throw new Error("derived key too long");
  const p = kdfInputToBytes(_password, "password");
  try {
    const s = kdfInputToBytes(_salt, "salt");
    try {
      const DK = new Uint8Array(dkLen);
      const { iHash, oHash, outputLen } = hmac.create(hash, p);
      const u = new Uint8Array(outputLen);
      const eng = pbkdf2Engine(iHash, oHash, s, u);
      return { c, dkLen, asyncTick, DK, outputLen, eng };
    } finally {
      if (typeof _salt === "string")
        clean(s);
    }
  } finally {
    if (typeof _password === "string")
      clean(p);
  }
}
function pbkdf2Engine(iHash, oHash, salt, u) {
  const counter = new Uint8Array(4);
  const view = createView(counter);
  const salted = iHash._cloneInto().update(salt);
  const work = oHash._cloneInto();
  const iClone = iHash._cloneInto;
  const oClone = oHash._cloneInto;
  return {
    u1: (ti, Ti) => {
      view.setInt32(0, ti, false);
      salted._cloneInto(work).update(counter).digestInto(u);
      oHash._cloneInto(work).update(u).digestInto(u);
      Ti.set(u.subarray(0, Ti.length));
    },
    // Whole `F` inner loop for the sync variant: one optimized function owns the hot loop.
    rounds: (c, Ti) => {
      for (let ui = 1; ui < c; ui++) {
        iClone.call(iHash, work).update(u).digestInto(u);
        oClone.call(oHash, work).update(u).digestInto(u);
        for (let i = 0; i < Ti.length; i++)
          Ti[i] ^= u[i];
      }
    },
    output: (DK) => {
      iHash.destroy();
      oHash.destroy();
      salted.destroy();
      work.destroy();
      clean(u);
      return DK;
    }
  };
}
function pbkdf2(hash, password, salt, opts) {
  const { c, dkLen, DK, outputLen, eng } = pbkdf2Init(hash, password, salt, opts);
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += outputLen) {
    const Ti = DK.subarray(pos, pos + outputLen);
    eng.u1(ti, Ti);
    eng.rounds(c, Ti);
  }
  return eng.output(DK);
}

// node_modules/@scure/bip39/index.js
var isJapanese = (wordlist2) => wordlist2[0] === "\u3042\u3044\u3053\u304F\u3057\u3093";
function isWellFormedUnicode(value) {
  for (let i = 0; i < value.length; i++) {
    const current = value.charCodeAt(i);
    if (current >= 55296 && current <= 56319) {
      if (i + 1 >= value.length)
        return false;
      const next = value.charCodeAt(++i);
      if (next < 56320 || next > 57343)
        return false;
    } else if (current >= 56320 && current <= 57343) {
      return false;
    }
  }
  return true;
}
function nfkd(str) {
  if (typeof str !== "string")
    throw new TypeError("invalid mnemonic type: " + typeof str);
  if (!isWellFormedUnicode(str))
    throw new TypeError("expected well-formed Unicode string");
  return str.normalize("NFKD");
}
function normalize(str) {
  const norm2 = nfkd(str);
  const words = norm2.split(" ");
  if (![12, 15, 18, 21, 24].includes(words.length))
    throw new Error("Invalid mnemonic");
  return { nfkd: norm2, words };
}
function aentropy(ent) {
  abytes(ent);
  if (![16, 20, 24, 28, 32].includes(ent.length))
    throw new RangeError("invalid entropy length");
}
function generateMnemonic(wordlist2, strength = 128) {
  anumber(strength);
  if (strength % 32 !== 0 || strength > 256)
    throw new RangeError("Invalid entropy");
  return entropyToMnemonic(randomBytes(strength / 8), wordlist2);
}
var calcChecksum = (entropy) => {
  const bitsLeft = 8 - entropy.length / 4;
  return sha256(entropy)[0] >> bitsLeft << bitsLeft;
};
function awordlist(wordlist2) {
  if (!Array.isArray(wordlist2) || wordlist2.length !== 2048 || typeof wordlist2[0] !== "string")
    throw new TypeError("Wordlist: expected array of 2048 strings");
  wordlist2.forEach((i) => {
    if (typeof i !== "string")
      throw new TypeError("wordlist: non-string element: " + i);
    if (!isWellFormedUnicode(i))
      throw new TypeError("wordlist: expected well-formed Unicode string");
  });
}
function encodeWords(entropy, wordlist2) {
  awordlist(wordlist2);
  const bytes = new Uint8Array(entropy.length + 1);
  bytes.set(entropy);
  bytes[entropy.length] = calcChecksum(entropy);
  const words = [];
  let carry = 0;
  let bits = 0;
  for (const byte of bytes) {
    carry = carry << 8 | byte;
    bits += 8;
    if (bits >= 11) {
      bits -= 11;
      words.push(wordlist2[carry >>> bits & 2047]);
      carry &= (1 << bits) - 1;
    }
  }
  return words;
}
function decodeWords(words, wordlist2) {
  awordlist(wordlist2);
  const entLen = words.length / 3 * 4;
  const bytes = new Uint8Array(entLen + 1);
  let carry = 0;
  let bits = 0;
  let pos = 0;
  for (const word of words) {
    const index = wordlist2.indexOf(word);
    if (index === -1)
      throw new Error("Unknown word: " + word);
    carry = carry << 11 | index;
    bits += 11;
    while (bits >= 8) {
      bits -= 8;
      bytes[pos++] = carry >>> bits & 255;
    }
    carry &= (1 << bits) - 1;
  }
  if (bits > 0)
    bytes[pos] = carry << 8 - bits;
  const entropy = bytes.subarray(0, entLen);
  if (bytes[entLen] !== calcChecksum(entropy))
    throw new Error("Invalid checksum");
  return Uint8Array.from(entropy);
}
function mnemonicToEntropy(mnemonic, wordlist2) {
  const { words } = normalize(mnemonic);
  const entropy = decodeWords(words, wordlist2);
  aentropy(entropy);
  return entropy;
}
function entropyToMnemonic(entropy, wordlist2) {
  aentropy(entropy);
  const words = encodeWords(entropy, wordlist2);
  return words.join(isJapanese(wordlist2) ? "\u3000" : " ");
}
function validateMnemonic(mnemonic, wordlist2) {
  try {
    mnemonicToEntropy(mnemonic, wordlist2);
  } catch (e) {
    return false;
  }
  return true;
}
var psalt = (passphrase) => {
  if (typeof passphrase !== "string")
    throw new TypeError("invalid passphrase type: " + typeof passphrase);
  return nfkd("mnemonic" + passphrase);
};
function mnemonicToSeedSync(mnemonic, passphrase = "") {
  return pbkdf2(sha512, normalize(mnemonic).nfkd, psalt(passphrase), {
    c: 2048,
    dkLen: 64
  });
}

// node_modules/@scure/bip39/wordlists/english.js
var wordlist = /* @__PURE__ */ Object.freeze(`abandon
ability
able
about
above
absent
absorb
abstract
absurd
abuse
access
accident
account
accuse
achieve
acid
acoustic
acquire
across
act
action
actor
actress
actual
adapt
add
addict
address
adjust
admit
adult
advance
advice
aerobic
affair
afford
afraid
again
age
agent
agree
ahead
aim
air
airport
aisle
alarm
album
alcohol
alert
alien
all
alley
allow
almost
alone
alpha
already
also
alter
always
amateur
amazing
among
amount
amused
analyst
anchor
ancient
anger
angle
angry
animal
ankle
announce
annual
another
answer
antenna
antique
anxiety
any
apart
apology
appear
apple
approve
april
arch
arctic
area
arena
argue
arm
armed
armor
army
around
arrange
arrest
arrive
arrow
art
artefact
artist
artwork
ask
aspect
assault
asset
assist
assume
asthma
athlete
atom
attack
attend
attitude
attract
auction
audit
august
aunt
author
auto
autumn
average
avocado
avoid
awake
aware
away
awesome
awful
awkward
axis
baby
bachelor
bacon
badge
bag
balance
balcony
ball
bamboo
banana
banner
bar
barely
bargain
barrel
base
basic
basket
battle
beach
bean
beauty
because
become
beef
before
begin
behave
behind
believe
below
belt
bench
benefit
best
betray
better
between
beyond
bicycle
bid
bike
bind
biology
bird
birth
bitter
black
blade
blame
blanket
blast
bleak
bless
blind
blood
blossom
blouse
blue
blur
blush
board
boat
body
boil
bomb
bone
bonus
book
boost
border
boring
borrow
boss
bottom
bounce
box
boy
bracket
brain
brand
brass
brave
bread
breeze
brick
bridge
brief
bright
bring
brisk
broccoli
broken
bronze
broom
brother
brown
brush
bubble
buddy
budget
buffalo
build
bulb
bulk
bullet
bundle
bunker
burden
burger
burst
bus
business
busy
butter
buyer
buzz
cabbage
cabin
cable
cactus
cage
cake
call
calm
camera
camp
can
canal
cancel
candy
cannon
canoe
canvas
canyon
capable
capital
captain
car
carbon
card
cargo
carpet
carry
cart
case
cash
casino
castle
casual
cat
catalog
catch
category
cattle
caught
cause
caution
cave
ceiling
celery
cement
census
century
cereal
certain
chair
chalk
champion
change
chaos
chapter
charge
chase
chat
cheap
check
cheese
chef
cherry
chest
chicken
chief
child
chimney
choice
choose
chronic
chuckle
chunk
churn
cigar
cinnamon
circle
citizen
city
civil
claim
clap
clarify
claw
clay
clean
clerk
clever
click
client
cliff
climb
clinic
clip
clock
clog
close
cloth
cloud
clown
club
clump
cluster
clutch
coach
coast
coconut
code
coffee
coil
coin
collect
color
column
combine
come
comfort
comic
common
company
concert
conduct
confirm
congress
connect
consider
control
convince
cook
cool
copper
copy
coral
core
corn
correct
cost
cotton
couch
country
couple
course
cousin
cover
coyote
crack
cradle
craft
cram
crane
crash
crater
crawl
crazy
cream
credit
creek
crew
cricket
crime
crisp
critic
crop
cross
crouch
crowd
crucial
cruel
cruise
crumble
crunch
crush
cry
crystal
cube
culture
cup
cupboard
curious
current
curtain
curve
cushion
custom
cute
cycle
dad
damage
damp
dance
danger
daring
dash
daughter
dawn
day
deal
debate
debris
decade
december
decide
decline
decorate
decrease
deer
defense
define
defy
degree
delay
deliver
demand
demise
denial
dentist
deny
depart
depend
deposit
depth
deputy
derive
describe
desert
design
desk
despair
destroy
detail
detect
develop
device
devote
diagram
dial
diamond
diary
dice
diesel
diet
differ
digital
dignity
dilemma
dinner
dinosaur
direct
dirt
disagree
discover
disease
dish
dismiss
disorder
display
distance
divert
divide
divorce
dizzy
doctor
document
dog
doll
dolphin
domain
donate
donkey
donor
door
dose
double
dove
draft
dragon
drama
drastic
draw
dream
dress
drift
drill
drink
drip
drive
drop
drum
dry
duck
dumb
dune
during
dust
dutch
duty
dwarf
dynamic
eager
eagle
early
earn
earth
easily
east
easy
echo
ecology
economy
edge
edit
educate
effort
egg
eight
either
elbow
elder
electric
elegant
element
elephant
elevator
elite
else
embark
embody
embrace
emerge
emotion
employ
empower
empty
enable
enact
end
endless
endorse
enemy
energy
enforce
engage
engine
enhance
enjoy
enlist
enough
enrich
enroll
ensure
enter
entire
entry
envelope
episode
equal
equip
era
erase
erode
erosion
error
erupt
escape
essay
essence
estate
eternal
ethics
evidence
evil
evoke
evolve
exact
example
excess
exchange
excite
exclude
excuse
execute
exercise
exhaust
exhibit
exile
exist
exit
exotic
expand
expect
expire
explain
expose
express
extend
extra
eye
eyebrow
fabric
face
faculty
fade
faint
faith
fall
false
fame
family
famous
fan
fancy
fantasy
farm
fashion
fat
fatal
father
fatigue
fault
favorite
feature
february
federal
fee
feed
feel
female
fence
festival
fetch
fever
few
fiber
fiction
field
figure
file
film
filter
final
find
fine
finger
finish
fire
firm
first
fiscal
fish
fit
fitness
fix
flag
flame
flash
flat
flavor
flee
flight
flip
float
flock
floor
flower
fluid
flush
fly
foam
focus
fog
foil
fold
follow
food
foot
force
forest
forget
fork
fortune
forum
forward
fossil
foster
found
fox
fragile
frame
frequent
fresh
friend
fringe
frog
front
frost
frown
frozen
fruit
fuel
fun
funny
furnace
fury
future
gadget
gain
galaxy
gallery
game
gap
garage
garbage
garden
garlic
garment
gas
gasp
gate
gather
gauge
gaze
general
genius
genre
gentle
genuine
gesture
ghost
giant
gift
giggle
ginger
giraffe
girl
give
glad
glance
glare
glass
glide
glimpse
globe
gloom
glory
glove
glow
glue
goat
goddess
gold
good
goose
gorilla
gospel
gossip
govern
gown
grab
grace
grain
grant
grape
grass
gravity
great
green
grid
grief
grit
grocery
group
grow
grunt
guard
guess
guide
guilt
guitar
gun
gym
habit
hair
half
hammer
hamster
hand
happy
harbor
hard
harsh
harvest
hat
have
hawk
hazard
head
health
heart
heavy
hedgehog
height
hello
helmet
help
hen
hero
hidden
high
hill
hint
hip
hire
history
hobby
hockey
hold
hole
holiday
hollow
home
honey
hood
hope
horn
horror
horse
hospital
host
hotel
hour
hover
hub
huge
human
humble
humor
hundred
hungry
hunt
hurdle
hurry
hurt
husband
hybrid
ice
icon
idea
identify
idle
ignore
ill
illegal
illness
image
imitate
immense
immune
impact
impose
improve
impulse
inch
include
income
increase
index
indicate
indoor
industry
infant
inflict
inform
inhale
inherit
initial
inject
injury
inmate
inner
innocent
input
inquiry
insane
insect
inside
inspire
install
intact
interest
into
invest
invite
involve
iron
island
isolate
issue
item
ivory
jacket
jaguar
jar
jazz
jealous
jeans
jelly
jewel
job
join
joke
journey
joy
judge
juice
jump
jungle
junior
junk
just
kangaroo
keen
keep
ketchup
key
kick
kid
kidney
kind
kingdom
kiss
kit
kitchen
kite
kitten
kiwi
knee
knife
knock
know
lab
label
labor
ladder
lady
lake
lamp
language
laptop
large
later
latin
laugh
laundry
lava
law
lawn
lawsuit
layer
lazy
leader
leaf
learn
leave
lecture
left
leg
legal
legend
leisure
lemon
lend
length
lens
leopard
lesson
letter
level
liar
liberty
library
license
life
lift
light
like
limb
limit
link
lion
liquid
list
little
live
lizard
load
loan
lobster
local
lock
logic
lonely
long
loop
lottery
loud
lounge
love
loyal
lucky
luggage
lumber
lunar
lunch
luxury
lyrics
machine
mad
magic
magnet
maid
mail
main
major
make
mammal
man
manage
mandate
mango
mansion
manual
maple
marble
march
margin
marine
market
marriage
mask
mass
master
match
material
math
matrix
matter
maximum
maze
meadow
mean
measure
meat
mechanic
medal
media
melody
melt
member
memory
mention
menu
mercy
merge
merit
merry
mesh
message
metal
method
middle
midnight
milk
million
mimic
mind
minimum
minor
minute
miracle
mirror
misery
miss
mistake
mix
mixed
mixture
mobile
model
modify
mom
moment
monitor
monkey
monster
month
moon
moral
more
morning
mosquito
mother
motion
motor
mountain
mouse
move
movie
much
muffin
mule
multiply
muscle
museum
mushroom
music
must
mutual
myself
mystery
myth
naive
name
napkin
narrow
nasty
nation
nature
near
neck
need
negative
neglect
neither
nephew
nerve
nest
net
network
neutral
never
news
next
nice
night
noble
noise
nominee
noodle
normal
north
nose
notable
note
nothing
notice
novel
now
nuclear
number
nurse
nut
oak
obey
object
oblige
obscure
observe
obtain
obvious
occur
ocean
october
odor
off
offer
office
often
oil
okay
old
olive
olympic
omit
once
one
onion
online
only
open
opera
opinion
oppose
option
orange
orbit
orchard
order
ordinary
organ
orient
original
orphan
ostrich
other
outdoor
outer
output
outside
oval
oven
over
own
owner
oxygen
oyster
ozone
pact
paddle
page
pair
palace
palm
panda
panel
panic
panther
paper
parade
parent
park
parrot
party
pass
patch
path
patient
patrol
pattern
pause
pave
payment
peace
peanut
pear
peasant
pelican
pen
penalty
pencil
people
pepper
perfect
permit
person
pet
phone
photo
phrase
physical
piano
picnic
picture
piece
pig
pigeon
pill
pilot
pink
pioneer
pipe
pistol
pitch
pizza
place
planet
plastic
plate
play
please
pledge
pluck
plug
plunge
poem
poet
point
polar
pole
police
pond
pony
pool
popular
portion
position
possible
post
potato
pottery
poverty
powder
power
practice
praise
predict
prefer
prepare
present
pretty
prevent
price
pride
primary
print
priority
prison
private
prize
problem
process
produce
profit
program
project
promote
proof
property
prosper
protect
proud
provide
public
pudding
pull
pulp
pulse
pumpkin
punch
pupil
puppy
purchase
purity
purpose
purse
push
put
puzzle
pyramid
quality
quantum
quarter
question
quick
quit
quiz
quote
rabbit
raccoon
race
rack
radar
radio
rail
rain
raise
rally
ramp
ranch
random
range
rapid
rare
rate
rather
raven
raw
razor
ready
real
reason
rebel
rebuild
recall
receive
recipe
record
recycle
reduce
reflect
reform
refuse
region
regret
regular
reject
relax
release
relief
rely
remain
remember
remind
remove
render
renew
rent
reopen
repair
repeat
replace
report
require
rescue
resemble
resist
resource
response
result
retire
retreat
return
reunion
reveal
review
reward
rhythm
rib
ribbon
rice
rich
ride
ridge
rifle
right
rigid
ring
riot
ripple
risk
ritual
rival
river
road
roast
robot
robust
rocket
romance
roof
rookie
room
rose
rotate
rough
round
route
royal
rubber
rude
rug
rule
run
runway
rural
sad
saddle
sadness
safe
sail
salad
salmon
salon
salt
salute
same
sample
sand
satisfy
satoshi
sauce
sausage
save
say
scale
scan
scare
scatter
scene
scheme
school
science
scissors
scorpion
scout
scrap
screen
script
scrub
sea
search
season
seat
second
secret
section
security
seed
seek
segment
select
sell
seminar
senior
sense
sentence
series
service
session
settle
setup
seven
shadow
shaft
shallow
share
shed
shell
sheriff
shield
shift
shine
ship
shiver
shock
shoe
shoot
shop
short
shoulder
shove
shrimp
shrug
shuffle
shy
sibling
sick
side
siege
sight
sign
silent
silk
silly
silver
similar
simple
since
sing
siren
sister
situate
six
size
skate
sketch
ski
skill
skin
skirt
skull
slab
slam
sleep
slender
slice
slide
slight
slim
slogan
slot
slow
slush
small
smart
smile
smoke
smooth
snack
snake
snap
sniff
snow
soap
soccer
social
sock
soda
soft
solar
soldier
solid
solution
solve
someone
song
soon
sorry
sort
soul
sound
soup
source
south
space
spare
spatial
spawn
speak
special
speed
spell
spend
sphere
spice
spider
spike
spin
spirit
split
spoil
sponsor
spoon
sport
spot
spray
spread
spring
spy
square
squeeze
squirrel
stable
stadium
staff
stage
stairs
stamp
stand
start
state
stay
steak
steel
stem
step
stereo
stick
still
sting
stock
stomach
stone
stool
story
stove
strategy
street
strike
strong
struggle
student
stuff
stumble
style
subject
submit
subway
success
such
sudden
suffer
sugar
suggest
suit
summer
sun
sunny
sunset
super
supply
supreme
sure
surface
surge
surprise
surround
survey
suspect
sustain
swallow
swamp
swap
swarm
swear
sweet
swift
swim
swing
switch
sword
symbol
symptom
syrup
system
table
tackle
tag
tail
talent
talk
tank
tape
target
task
taste
tattoo
taxi
teach
team
tell
ten
tenant
tennis
tent
term
test
text
thank
that
theme
then
theory
there
they
thing
this
thought
three
thrive
throw
thumb
thunder
ticket
tide
tiger
tilt
timber
time
tiny
tip
tired
tissue
title
toast
tobacco
today
toddler
toe
together
toilet
token
tomato
tomorrow
tone
tongue
tonight
tool
tooth
top
topic
topple
torch
tornado
tortoise
toss
total
tourist
toward
tower
town
toy
track
trade
traffic
tragic
train
transfer
trap
trash
travel
tray
treat
tree
trend
trial
tribe
trick
trigger
trim
trip
trophy
trouble
truck
true
truly
trumpet
trust
truth
try
tube
tuition
tumble
tuna
tunnel
turkey
turn
turtle
twelve
twenty
twice
twin
twist
two
type
typical
ugly
umbrella
unable
unaware
uncle
uncover
under
undo
unfair
unfold
unhappy
uniform
unique
unit
universe
unknown
unlock
until
unusual
unveil
update
upgrade
uphold
upon
upper
upset
urban
urge
usage
use
used
useful
useless
usual
utility
vacant
vacuum
vague
valid
valley
valve
van
vanish
vapor
various
vast
vault
vehicle
velvet
vendor
venture
venue
verb
verify
version
very
vessel
veteran
viable
vibrant
vicious
victory
video
view
village
vintage
violin
virtual
virus
visa
visit
visual
vital
vivid
vocal
voice
void
volcano
volume
vote
voyage
wage
wagon
wait
walk
wall
walnut
want
warfare
warm
warrior
wash
wasp
waste
water
wave
way
wealth
weapon
wear
weasel
weather
web
wedding
weekend
weird
welcome
west
wet
whale
what
wheat
wheel
when
where
whip
whisper
wide
width
wife
wild
will
win
window
wine
wing
wink
winner
winter
wire
wisdom
wise
wish
witness
wolf
woman
wonder
wood
wool
word
work
world
worry
worth
wrap
wreck
wrestle
wrist
write
wrong
yard
year
yellow
you
young
youth
zebra
zero
zone
zoo`.split("\n"));

// node_modules/@noble/hashes/legacy.js
var Rho160 = /* @__PURE__ */ Uint8Array.from([
  7,
  4,
  13,
  1,
  10,
  6,
  15,
  3,
  12,
  0,
  9,
  5,
  2,
  14,
  11,
  8
]);
var Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
var Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
var idxLR = /* @__PURE__ */ (() => {
  const L2 = [Id160];
  const R = [Pi160];
  const res = [L2, R];
  for (let i = 0; i < 4; i++)
    for (let j of res)
      j.push(j[i].map((k) => Rho160[k]));
  return res;
})();
var idxL = /* @__PURE__ */ (() => idxLR[0])();
var idxR = /* @__PURE__ */ (() => idxLR[1])();
var shifts160 = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((i) => Uint8Array.from(i));
var shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
var shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
var Kl160 = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]);
var Kr160 = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function ripemd_f(group, x, y, z) {
  if (group === 0)
    return x ^ y ^ z;
  if (group === 1)
    return x & y | ~x & z;
  if (group === 2)
    return (x | ~y) ^ z;
  if (group === 3)
    return x & z | y & ~z;
  return x ^ (y | ~z);
}
var BUF_160 = /* @__PURE__ */ new Uint32Array(16);
var _RIPEMD160 = class extends HashMD {
  h0 = 1732584193 | 0;
  h1 = 4023233417 | 0;
  h2 = 2562383102 | 0;
  h3 = 271733878 | 0;
  h4 = 3285377520 | 0;
  constructor() {
    super(64, 20, 8, true);
  }
  get() {
    const { h0, h1, h2, h3, h4 } = this;
    return [h0, h1, h2, h3, h4];
  }
  set(h0, h1, h2, h3, h4) {
    this.h0 = h0 | 0;
    this.h1 = h1 | 0;
    this.h2 = h2 | 0;
    this.h3 = h3 | 0;
    this.h4 = h4 | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      BUF_160[i] = view.getUint32(offset, true);
    let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
    for (let group = 0; group < 5; group++) {
      const rGroup = 4 - group;
      const hbl = Kl160[group], hbr = Kr160[group];
      const rl = idxL[group], rr = idxR[group];
      const sl = shiftsL160[group], sr = shiftsR160[group];
      for (let i = 0; i < 16; i++) {
        const tl = rotl(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el | 0;
        al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl;
      }
      for (let i = 0; i < 16; i++) {
        const tr = rotl(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er | 0;
        ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr;
      }
    }
    this.set(this.h1 + cl + dr | 0, this.h2 + dl + er | 0, this.h3 + el + ar | 0, this.h4 + al + br | 0, this.h0 + bl + cr | 0);
  }
  roundClean() {
    clean(BUF_160);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0);
  }
};
var ripemd160 = /* @__PURE__ */ createHasher(() => new _RIPEMD160());

// core/wallet.js
var N2 = Point.CURVE().n;
var HARD = 2147483648;
var KASPA_PATH = "m/44'/111111'/0'/0/0";
function fail3(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}
var u323 = (n) => new Uint8Array([n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]);
var cat = (...a) => {
  const out = new Uint8Array(a.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of a) {
    out.set(x, o);
    o += x.length;
  }
  return out;
};
var big2 = (b) => BigInt("0x" + (bytesToHex2(b) || "0"));
var b32 = (n) => hexToBytes2(n.toString(16).padStart(64, "0"));
var norm = (words) => String(words || "").trim().toLowerCase().split(/\s+/).join(" ");
function newWords() {
  return generateMnemonic(wordlist, 128);
}
function wordsOk(words) {
  return validateMnemonic(norm(words), wordlist);
}
function masterKey(seed) {
  const I2 = hmac(sha512, new TextEncoder().encode("Bitcoin seed"), seed);
  const key = I2.slice(0, 32), chain = I2.slice(32);
  const k = big2(key);
  if (k === 0n || k >= N2) throw fail3("BAD_SEED", "unusable seed");
  return { key, chain, depth: 0, parentFp: new Uint8Array(4), index: 0 };
}
function fingerprint(key) {
  return ripemd160(sha256(getPublicKey(key, true))).slice(0, 4);
}
function childKey(parent, index) {
  const hardened = index >= HARD;
  const data = hardened ? cat(new Uint8Array([0]), parent.key, u323(index)) : cat(getPublicKey(parent.key, true), u323(index));
  const I2 = hmac(sha512, parent.chain, data);
  const il = big2(I2.slice(0, 32));
  if (il >= N2) throw fail3("BAD_CHILD", "invalid child, use the next index");
  const k = (il + big2(parent.key)) % N2;
  if (k === 0n) throw fail3("BAD_CHILD", "invalid child, use the next index");
  return { key: b32(k), chain: I2.slice(32), depth: parent.depth + 1, parentFp: fingerprint(parent.key), index };
}
function derive(root, path) {
  const parts = String(path).split("/");
  if (parts.shift() !== "m") throw fail3("BAD_PATH", "a path starts with m");
  return parts.reduce((k, p) => {
    const h = p.endsWith("'");
    const n = Number(h ? p.slice(0, -1) : p);
    if (!Number.isInteger(n) || n < 0 || n >= HARD) throw fail3("BAD_PATH", `bad path step ${p}`);
    return childKey(k, h ? n + HARD : n);
  }, root);
}
function walletFromRoot(root, { network = "mainnet", path = KASPA_PATH } = {}) {
  const k = derive(root, path);
  const privateKey = bytesToHex2(k.key);
  return { privateKey, publicKey: xOnlyPublicKey(privateKey), address: addressOfKey(network, privateKey), path };
}
function walletFromWords(words, opts = {}) {
  if (!wordsOk(words)) throw fail3("BAD_WORDS", "these recovery words are not valid");
  return walletFromRoot(masterKey(mnemonicToSeedSync(norm(words), opts.passphrase || "")), opts);
}
var KDF_ITERATIONS = 6e5;
var subtle2 = () => {
  const s = globalThis.crypto && globalThis.crypto.subtle;
  if (!s) throw fail3("NO_CRYPTO", "this browser has no WebCrypto (open the page over https)");
  return s;
};
var b64 = (b) => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};
var unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function boxKey(password, salt, iterations) {
  const base = await subtle2().importKey("raw", new TextEncoder().encode(String(password)), "PBKDF2", false, ["deriveKey"]);
  return subtle2().deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function lock(secret, password, { iterations = KDF_ITERATIONS } = {}) {
  if (!password || String(password).length < 8) throw fail3("WEAK_PASSWORD", "use at least 8 characters");
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await boxKey(password, salt, iterations);
  const ct = new Uint8Array(await subtle2().encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(secret))));
  return { format: "kaspa-vault-box/1", kdf: "PBKDF2-SHA256", iterations, salt: b64(salt), iv: b64(iv), data: b64(ct) };
}
async function unlock(box, password) {
  if (!box || box.format !== "kaspa-vault-box/1") throw fail3("BAD_BOX", "not a kaspa-vault box");
  const key = await boxKey(password, unb64(box.salt), box.iterations);
  try {
    const pt = await subtle2().decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.data));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) {
    throw fail3("BAD_PASSWORD", "wrong password");
  }
}
var BECH = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function pubkeyFromAddress(addr) {
  const s = String(addr || "").trim().toLowerCase();
  const i = s.indexOf(":");
  if (i < 0) return null;
  const body = s.slice(i + 1);
  if (body.length <= 8) return null;
  let bits = "";
  for (const ch of body.slice(0, -8)) {
    const v = BECH.indexOf(ch);
    if (v < 0) return null;
    bits += v.toString(2).padStart(5, "0");
  }
  if (parseInt(bits.slice(0, 8), 2) !== 0) return null;
  const payload = bits.slice(8, 8 + 256);
  if (payload.length < 256) return null;
  let hex = "";
  for (let j = 0; j < 256; j += 8) hex += parseInt(payload.slice(j, j + 8), 2).toString(16).padStart(2, "0");
  return hex;
}
function signatureHex(sig) {
  const s = String(sig && typeof sig === "object" ? sig.signature || sig.sig || "" : sig || "").trim();
  if (/^[0-9a-f]{128}$/i.test(s)) return s.toLowerCase();
  if (/^[0-9a-f]{130}$/i.test(s)) return s.slice(0, 128).toLowerCase();
  try {
    const b = unb64(s);
    if (b.length === 64 || b.length === 65) return bytesToHex2(b.slice(0, 64));
  } catch (e) {
  }
  return null;
}
function proveAddress({ address, publicKey, message, signature, network = "mainnet" }) {
  let x = String(publicKey || "").trim().toLowerCase().replace(/^0x/, "");
  if (/^(02|03)[0-9a-f]{64}$/.test(x)) x = x.slice(2);
  if (!/^[0-9a-f]{64}$/.test(x)) x = pubkeyFromAddress(address);
  if (!x) throw fail3("PROOF", "pick a standard kaspa:q address in the wallet and try again");
  const own = p2pkAddress(network, x);
  if (address && String(address).trim().toLowerCase() !== own) throw fail3("PROOF", "the wallet address does not belong to the key it signed with");
  const sig = signatureHex(signature);
  if (!sig) throw fail3("PROOF", "the wallet returned a signature of an unexpected shape");
  if (!verifyMessage(message, sig, x)) throw fail3("PROOF", "the signature does not check out");
  return own;
}

// widget/src/wallets.js
var WALLETS = [
  { id: "kasware", name: "Kasware", color: "#1fb8a0", present: () => !!(globalThis.kasware && typeof globalThis.kasware.signMessage === "function") },
  { id: "kastle", name: "Kastle", color: "#0ea5e9", present: () => !!(globalThis.kastle && typeof globalThis.kastle.signMessage === "function") },
  { id: "kaspire", name: "Kaspire", color: "#111827", present: () => !!(globalThis.kaspire && globalThis.kaspire.isKaspire === true && typeof globalThis.kaspire.request === "function") }
];
var withPrefix = (a) => typeof a === "string" && a && !a.includes(":") ? "kaspa:" + a : a;
var sigOf = (r) => r && typeof r === "object" ? r.signature || r.sig || null : r;
var kaspire = (method, params) => globalThis.kaspire.request(params === void 0 ? { method } : { method, params });
async function signWith(id, message, network) {
  if (id === "kasware") {
    const w = globalThis.kasware;
    const accounts = await w.requestAccounts();
    const address = withPrefix(Array.isArray(accounts) ? accounts[0] : null);
    let publicKey = null;
    try {
      publicKey = await w.getPublicKey();
    } catch (e) {
      publicKey = null;
    }
    const signature = sigOf(await w.signMessage(message));
    return { address, publicKey: publicKey || pubkeyFromAddress(address), signature };
  }
  if (id === "kastle") {
    const w = globalThis.kastle;
    await w.connect(network === "mainnet" ? "mainnet" : network);
    const acc = await w.getAccount();
    const address = withPrefix(acc && (typeof acc === "string" ? acc : acc.address));
    const signature = sigOf(await w.signMessage(message));
    return { address, publicKey: acc && typeof acc === "object" && (acc.publicKey || acc.pubkey) || pubkeyFromAddress(address), signature };
  }
  if (id === "kaspire") {
    let accounts = null;
    try {
      accounts = await kaspire("getAccounts");
    } catch (e) {
      accounts = null;
    }
    if (!accounts || !accounts.length) accounts = await kaspire("requestAccounts");
    const address = accounts && accounts[0];
    if (typeof address !== "string" || !address.includes(":")) throw new Error("Switch Kaspire to the right network and try again");
    const signature = sigOf(await kaspire("signMessage", { address, message }));
    return { address, publicKey: pubkeyFromAddress(address), signature };
  }
  throw new Error("Unknown wallet");
}
async function proveWith(id, message, network = "mainnet") {
  const w = WALLETS.find((x) => x.id === id);
  if (!w || !w.present()) throw new Error(`${w ? w.name : "That wallet"} is not installed in this browser`);
  let got;
  try {
    got = await signWith(id, message, network);
  } catch (e) {
    const m = String(e && e.message || e || "");
    throw new Error(/reject|denied|cancel|user/i.test(m) ? `You closed the ${w.name} window before signing. Try again when you are ready.` : m || `${w.name} did not answer`);
  }
  if (!got.signature) throw new Error(`${w.name} did not return a signature`);
  try {
    return proveAddress({ ...got, message, network });
  } catch (e) {
    throw new Error(`${w.name}: ${e.message}`);
  }
}
function canSendFrom() {
  return WALLETS.filter((w) => w.id === "kasware" && w.present());
}
async function sendFrom(id, to, sompi) {
  if (id !== "kasware" || !globalThis.kasware || typeof globalThis.kasware.sendKaspa !== "function") throw new Error("Kasware is not installed in this browser");
  if (BigInt(sompi) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("That amount is too large to send from Kasware in one go");
  return globalThis.kasware.sendKaspa(to, Number(sompi));
}

// widget/src/index.js
var VERSION = "0.1.0";
var RECORD = "kaspa-vault-widget/1";
var REFRESH_MS = 15e3;
var KEY_TTL_MS = 5 * 60 * 1e3;
var DAA_PER_DAY = 864e3;
var NODES = { mainnet: "https://api.kaspa.org", "testnet-10": "https://api-tn10.kaspa.org" };
var EXPLORER = { mainnet: "https://explorer.kaspa.org/txs/", "testnet-10": "https://explorer-tn10.kaspa.org/txs/" };
var esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var short = (a) => {
  const s = String(a || "");
  const i = s.indexOf(":");
  const b = s.slice(i + 1);
  return b.length <= 14 ? s : `${s.slice(0, i + 1)}${b.slice(0, 5)}\u2026${b.slice(-6)}`;
};
function kas(sompi, unit = true) {
  const s = kasStr(BigInt(sompi || 0n));
  const [w, f = ""] = s.split(".");
  const frac = f.replace(/0+$/, "");
  const shown = frac.length < 2 ? (frac + "00").slice(0, 2) : frac;
  return `${Number(w).toLocaleString("en-US")}.${shown}${unit ? " KAS" : ""}`;
}
function parseKas(str) {
  const s = String(str || "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,8})?$/.test(s)) return null;
  const v = kasToSompi(s);
  return v > 0n ? v : null;
}
function dayWord(daa) {
  const d = Number(daa) / DAA_PER_DAY;
  if (d >= 1 && Number.isInteger(d)) return d === 1 ? "one day" : `${d} days`;
  const min = Math.round(Number(daa) / 600);
  return min < 120 ? `${min} minutes` : `${Math.round(min / 60)} hours`;
}
function when(ms) {
  if (ms <= 0) return "any moment now";
  if (ms < 36e5) return `in ${Math.max(1, Math.ceil(ms / 6e4))} min`;
  const dt = new Date(Date.now() + ms), now = /* @__PURE__ */ new Date();
  const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (dt.toDateString() === now.toDateString()) return `today at ${time}`;
  if (new Date(now.getTime() + 864e5).toDateString() === dt.toDateString()) return `tomorrow at ${time}`;
  return `${dt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${time}`;
}
function friendly(e) {
  const m = String(e && e.message || e || "Something went wrong");
  const c = e && e.code;
  if (c === "BAD_PASSWORD") return "That password does not open this vault.";
  if (c === "NO_COINS") return "There is nothing there to move yet.";
  if (c === "SPENT") return "The network already moved these coins. Refreshing.";
  if (c === "SEQUENCE_LOCK") return "The waiting time is not over yet.";
  if (c === "AMOUNT" && e.max != null) return `That would leave less than 0.5 KAS behind, which the network does not keep. Press "All of it" to move everything, or move at most ${kas(e.max > 50000000n ? e.max - 50000000n : 0n)}.`;
  if (c === "FEE" || /insufficient|not enough|fee/i.test(m)) return `Not enough for this and the network fee. (${m})`;
  if (/Failed to fetch|NetworkError|timed out|ECONNREFUSED|connection/i.test(m)) return "The Kaspa network could not be reached. Check your connection and try again.";
  return m.charAt(0).toUpperCase() + m.slice(1);
}
var icon = {
  vault: '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true"><rect x="6" y="9" width="44" height="38" rx="7" fill="var(--kv-accent-soft)" stroke="var(--kv-accent)" stroke-width="2.4"/><circle cx="28" cy="28" r="9" stroke="var(--kv-accent)" stroke-width="2.4"/><path d="M28 19v3M28 34v3M19 28h3M34 28h3" stroke="var(--kv-accent)" stroke-width="2.4" stroke-linecap="round"/><path d="M14 47v3M42 47v3" stroke="var(--kv-accent)" stroke-width="2.4" stroke-linecap="round"/></svg>',
  clock: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="#1d4ed8" stroke-width="1.8"/><path d="M10 6v4l3 2" stroke="#1d4ed8" stroke-width="1.8" stroke-linecap="round"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="3" y="7" width="12" height="9" rx="2" stroke="#334155" stroke-width="1.6"/><path d="M6 7V5a3 3 0 016 0v2" stroke="#334155" stroke-width="1.6"/></svg>',
  ok: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#16a34a"/><path d="M6 10.5l2.5 2.5L14 7.5" stroke="#fff" stroke-width="2" fill="none"/></svg>',
  bell: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3a5 5 0 00-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 00-5-5zM8 16a2 2 0 004 0" stroke="#b45309" stroke-width="1.7" stroke-linejoin="round"/></svg>'
};
function qrSvg(text) {
  const q = qrcode_default(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3e3);
}
function randomHex(n) {
  return bytesToHex2(globalThis.crypto.getRandomValues(new Uint8Array(n)));
}
var KaspaVault = class extends HTMLElement {
  #root;
  #secret = { words: null, priv: null, until: 0 };
  #draft = null;
  #shown = null;
  #timer = null;
  #wtimer = null;
  #refreshing = null;
  #releasing = false;
  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.s = { phase: "loading", guardian: null, rec: null, opened: null, snap: null, watched: null, watcherDown: false, nodeDown: false, setup: null, sheet: null, error: null };
    this.#root.addEventListener("click", (e) => this.#onClick(e));
    this.#root.addEventListener("input", (e) => this.#onInput(e));
    this.#root.addEventListener("submit", (e) => e.preventDefault());
    this.#root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.s.sheet && !this.s.busy) {
        this.#closeSheet();
      }
      if (e.key === "Enter" && e.target.matches("input:not([type=checkbox])")) {
        const go = e.target.closest(".kv-sheet, .kv-step-body, .kv-card")?.querySelector("[data-enter]");
        if (go && !go.disabled) {
          e.preventDefault();
          go.click();
        }
      }
    });
  }
  connectedCallback() {
    this.#paint();
    this.#start();
    this._vis = () => {
      if (document.visibilityState === "visible") this.refresh();
    };
    document.addEventListener("visibilitychange", this._vis);
  }
  disconnectedCallback() {
    clearInterval(this.#timer);
    clearInterval(this.#wtimer);
    document.removeEventListener("visibilitychange", this._vis);
    this.#forget();
  }
  // ---------- config ----------
  // always the page's own watcher: a card never redirects this page to another server
  get watcherUrl() {
    return String(this.getAttribute("watcher") || "").replace(/\/+$/, "");
  }
  get storageKey() {
    return this.getAttribute("storage-key") || "kaspa-vault";
  }
  get network() {
    return this.s.rec && this.s.rec.card.network || this.s.guardian && this.s.guardian.network || "mainnet";
  }
  #delays() {
    const min = this.s.guardian ? Number(this.s.guardian.minDelayDaa) : DAA_PER_DAY;
    const days = String(this.getAttribute("delays") || "1,3,7").split(",").map(Number).filter((d) => d > 0 && d <= 30);
    const out = days.map((d) => d * DAA_PER_DAY).filter((d) => d >= min);
    if (min < DAA_PER_DAY) out.unshift(min);
    return out;
  }
  #provider() {
    if (this._provider) return this._provider;
    const given = this.getAttribute("node") || NODES[this.network];
    if (!given) throw new Error(`No Kaspa node is set for ${this.network}; add the node attribute.`);
    const list = String(given).split(",").map((s) => s.trim()).filter(Boolean);
    const ps = list.map((u) => /^wss?:/i.test(u) ? wrpcJsonProvider({ url: u }) : restProvider({ url: u }));
    this._provider = ps.length === 1 ? ps[0] : fallbackProvider(ps);
    return this._provider;
  }
  #explorer(txid) {
    const b = EXPLORER[this.network];
    return b ? `${b}${txid}` : null;
  }
  // ---------- storage ----------
  #load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const rec = raw ? JSON.parse(raw) : null;
      return rec && rec.format === RECORD ? rec : null;
    } catch (e) {
      return null;
    }
  }
  #save(rec) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(rec));
    } catch (e) {
      this.#toast("This browser would not save the vault. Download the vault card and keep your recovery words.", true);
    }
  }
  // ---------- the key: unlocked with the password, kept for a few minutes ----------
  #locked() {
    return !(this.#secret.priv && Date.now() < this.#secret.until);
  }
  #forget() {
    this.#secret = { words: null, priv: null, until: 0 };
  }
  // force: ask for the password even inside the 5 minutes (recovery words, Send). Never extended by use.
  async #unlock(password, { force = false } = {}) {
    if (!force && !this.#locked()) return this.#secret;
    if (!password) throw Object.assign(new Error("Enter your password."), { code: "NEED_PW" });
    const { words } = await unlock(this.s.rec.box, password);
    const w = walletFromWords(words, { network: this.network });
    if (w.publicKey !== this.s.rec.card.keys.hot) throw Object.assign(new Error("These words do not belong to this vault"), { code: "MISMATCH" });
    this.#secret = { words, priv: w.privateKey, until: Date.now() + KEY_TTL_MS };
    return this.#secret;
  }
  async #signer(form, opts) {
    const pw = form && form.querySelector("[name=password]");
    const sec = await this.#unlock(pw ? pw.value : "", opts);
    return keySigner(sec.priv);
  }
  // ---------- start ----------
  async #start() {
    const rec = this.#load();
    if (rec) {
      try {
        const opened = openCard(rec.card);
        this.s = { ...this.s, rec, opened, phase: "account" };
        this.client = new VaultClient({ vault: opened.vault, airlock: opened.airlock }, { provider: this.#provider() });
      } catch (e) {
        this.s = { ...this.s, phase: "error", error: "The vault saved in this browser does not add up: " + e.message };
        return this.#paint();
      }
      this.#paint();
      this.#checkWatcher().then(() => this.#paint());
      this.#watchWatcher();
      await this.refresh();
      this.#timer = setInterval(() => {
        if (document.visibilityState === "visible") this.refresh();
      }, REFRESH_MS);
      return;
    }
    try {
      await this.#loadGuardian();
      this.s.phase = "welcome";
    } catch (e) {
      if (e.code === "WATCHER_DOWN") this.s.phase = "welcome";
      else {
        this.s.phase = "error";
        this.s.error = e.message;
      }
    }
    this.#paint();
    this.#watchWatcher();
  }
  #watchWatcher() {
    clearInterval(this.#wtimer);
    this.#wtimer = setInterval(() => {
      if (document.visibilityState === "visible") this.#checkWatcher();
    }, 15e3);
  }
  async #loadGuardian() {
    const url = this.watcherUrl;
    if (!url) throw new Error("This page has no watcher set (the watcher attribute).");
    let g;
    try {
      g = await (await fetch(`${url}/v1/guardian`, { cache: "no-store" })).json();
    } catch (e) {
      this.s.ws = { state: "offline", at: Date.now() };
      throw Object.assign(new Error(`The watcher at ${url} cannot be reached right now. Nothing was created; try again later.`), { code: "WATCHER_DOWN" });
    }
    if (!/^[0-9a-f]{64}$/.test(String(g.pubkey))) throw new Error("The watcher did not name its key.");
    const pinned = (this.getAttribute("guardian") || "").trim().toLowerCase();
    if (pinned && pinned !== g.pubkey) throw new Error(`The watcher answered with key ${g.pubkey.slice(0, 12)}\u2026, but this page expects ${pinned.slice(0, 12)}\u2026. Nothing was created. If you run this page, check the guardian attribute.`);
    this.s.guardian = g;
    this.s.ws = { state: g.healthy === false ? "stale" : "online", lastPoll: g.lastPoll || null, at: Date.now() };
    return g;
  }
  /** The watcher's status light, re-checked every 15 seconds on every screen. */
  async #checkWatcher() {
    const before = JSON.stringify(this.s.ws || {});
    try {
      await this.#loadGuardian();
      this.s.guardianProblem = null;
    } catch (e) {
      if (e.code !== "WATCHER_DOWN") this.s.guardianProblem = e.message;
    }
    if (JSON.stringify(this.s.ws || {}) !== before && !this.s.sheet && !this.#typing()) this.#paint();
  }
  #watcherPill() {
    const st = this.s.ws && this.s.ws.state || "checking";
    const label = { checking: "Checking the watcher\u2026", online: "Watcher online", stale: "Watcher is behind", offline: "Watcher offline" }[st];
    return `<button class="kv-ws kv-ws-${st}" data-act="sheet" data-sheet="watcher" title="What does this mean?"><span class="kv-ws-dot"></span>${label}</button>`;
  }
  /** Re-read balances and the watcher. Safe to call any time. */
  async refresh() {
    if (this.s.phase !== "account" || !this.client) return;
    if (this.#refreshing) return this.#refreshing;
    this.#refreshing = (async () => {
      try {
        this.s.snap = await this.client.snapshot();
        this.s.nodeDown = false;
      } catch (e) {
        this.s.nodeDown = true;
      }
      try {
        const r = await fetch(`${this.watcherUrl}/v1/status/${this.s.opened.info.vaultAddress}`, { cache: "no-store" });
        const d = await r.json();
        this.s.watched = !!d.watched;
        this.s.watcherDown = false;
        this.s.lastPoll = d.lastPoll;
      } catch (e) {
        this.s.watcherDown = true;
      }
      if (this.s.snap && this.s.snap.pending.some((p) => p.ready) && !this.#releasing) {
        this.#releasing = true;
        this.client.release().then((r) => {
          if (r.released.length) setTimeout(() => this.refresh(), 2e3);
        }).catch(() => {
        }).finally(() => {
          this.#releasing = false;
        });
      }
      this.#emit();
      if (!this.s.sheet && !this.#typing()) this.#paint();
    })().finally(() => {
      this.#refreshing = null;
    });
    return this.#refreshing;
  }
  #typing() {
    const a = this.#root.activeElement;
    return !!(a && a.matches("input, textarea"));
  }
  #emit() {
    const b = this.s.snap && this.s.snap.balances;
    if (!b) return;
    this.dispatchEvent(new CustomEvent("kaspa-vault-change", { bubbles: true, composed: true, detail: { vaultAddress: this.s.opened.info.vaultAddress, vault: String(b.vault), pending: String(b.pending), spending: String(b.hot) } }));
  }
  // ---------- painting ----------
  #paint() {
    const s = this.s;
    let body = "";
    if (s.phase === "loading") body = `<div class="kv-card kv-center kv-muted">Loading\u2026</div>`;
    else if (s.phase === "error") body = `<div class="kv-card"><h2>The vault can't start</h2><p>${esc(s.error)}</p></div>`;
    else if (s.phase === "welcome") body = this.#welcomeHtml();
    else if (s.phase === "setup") body = this.#setupHtml();
    else if (s.phase === "restore") body = this.#restoreHtml();
    else if (s.phase === "account") body = this.#accountHtml();
    const net = this.network !== "mainnet" ? `<span class="kv-net">${esc(this.network)}</span>` : "";
    const keep = this.#keepInputs();
    this.#root.innerHTML = `<style>${style_default}</style><div class="kv">
            <div class="kv-head"><div><h1 class="kv-title">Vault</h1><p class="kv-sub">Money you don't want to spend by accident.</p></div><div class="kv-head-r">${net}${s.phase === "error" ? "" : this.#watcherPill()}</div></div>
            ${body}
            <p class="kv-small-print">kaspa-vault ${VERSION} \xB7 open source \xB7 your keys stay in this browser</p>
        </div>${s.sheet ? this.#sheetHtml() : ""}${s.toast ? `<div class="kv-toast ${s.toast.bad ? "kv-toast-bad" : ""}" role="status">${esc(s.toast.text)}</div>` : ""}`;
    this.#restoreInputs(keep);
  }
  // keep what the user typed across a repaint (by name)
  #keepInputs() {
    const out = {};
    this.#root.querySelectorAll("input[name], textarea[name]").forEach((el) => {
      if (el.type !== "file") out[el.name] = el.type === "checkbox" ? el.checked : el.value;
    });
    const a = this.#root.activeElement;
    out.__focus = a && a.name ? a.name : null;
    return out;
  }
  #restoreInputs(keep) {
    this.#root.querySelectorAll("input[name], textarea[name]").forEach((el) => {
      if (!(el.name in keep) || el.dataset.fresh !== void 0) return;
      if (el.type === "checkbox") el.checked = keep[el.name];
      else if (el.type !== "file") el.value = keep[el.name];
    });
    if (keep.__focus) {
      const f = this.#root.querySelector(`[name="${keep.__focus}"]`);
      if (f) f.focus();
    }
    const auto = this.#root.querySelector("[autofocus]");
    if (auto && !keep.__focus) auto.focus();
    this.#syncButtons();
  }
  #toast(text, bad) {
    this.s.toast = { text, bad: !!bad };
    this.#paint();
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => {
      this.s.toast = null;
      if (!this.#typing()) this.#paint();
      else this.#root.querySelector(".kv-toast")?.remove();
    }, bad ? 6e3 : 3500);
  }
  // ---------- welcome ----------
  #welcomeHtml() {
    const g = this.s.guardian;
    return `
        <div class="kv-card">
            <div class="kv-hero">${icon.vault}
                <div><h2>A vault works like a safe deposit box</h2>
                <p>Putting money in is instant. Taking it out takes a waiting time you choose, and you get an email the moment it starts. If it wasn't you, one button sends everything to your backup wallet instead. Nobody else can move it anywhere, including this website.</p></div>
            </div>
            <div class="kv-hints">
                <div><b>1. Your vault's wallet</b>Made in this browser. You write down 12 words.</div>
                <div><b>2. A backup wallet</b>Kasware, Kastle or Kaspire. Emergencies go there, nowhere else.</div>
                <div><b>3. A waiting time</b>The time you have to say "this wasn't me".</div>
            </div>
            ${this.s.ws && this.s.ws.state !== "online" ? `<div class="kv-warn">${this.s.ws.state === "offline" ? "The watcher can't be reached right now." : "The watcher is not reading the network right now."} A new vault needs it to send your alerts, so opening one waits until it is back. Vaults that already exist are safe meanwhile.</div>` : ""}
            <div class="kv-gap"><button class="kv-btn" data-act="setup-start" ${this.s.ws && this.s.ws.state === "online" ? "" : "disabled"}>Open a vault</button></div>
            <p class="kv-center kv-gap"><button class="kv-link" data-act="restore-start">I already have a vault (recovery words and vault card)</button></p>
        </div>
        <p class="kv-center kv-muted">Watcher: ${esc(g ? g.name : this.watcherUrl)}</p>`;
  }
  // ---------- setup ----------
  #setupHtml() {
    const st = this.s.setup;
    const step = (n, title, sum3, open, inner) => `
            <div class="kv-card"><div class="kv-step">
                <div class="kv-num ${st.step > n ? "kv-num-done" : st.step < n ? "kv-num-todo" : ""}">${st.step > n ? "\u2713" : n}</div>
                <div class="kv-step-body"><h2>${title}</h2>${st.step > n && sum3 ? `<div class="kv-step-sum">${sum3}</div>` : ""}${open ? inner : ""}</div>
            </div></div>`;
    const s1 = st.sub === "password" ? `
                <p class="kv-muted">This password opens your vault in this browser. It is never sent anywhere.</p>
                <label class="kv-label">Password</label><input class="kv-input" type="password" name="pw1" autocomplete="new-password" autofocus>
                <label class="kv-label">Same password again</label><input class="kv-input" type="password" name="pw2" autocomplete="new-password">
                <div class="kv-err" data-err>${esc(st.err || "")}</div>
                <button class="kv-btn" data-act="setup-password" data-enter data-need="pw1,pw2">Make my vault's wallet</button>` : st.sub === "words" ? `
                <p>These 12 words are your vault's wallet. Write them down or save them somewhere private, in this order. With them, any Kaspa wallet app (Kasware, Kastle, Kaspium) opens it, even if this website is gone.</p>
                <div class="kv-words">${this.#draft.words.split(" ").map((w) => `<span>${esc(w)}</span>`).join("")}</div>
                <p class="kv-center"><button class="kv-link" data-act="copy-draft-words">Copy the words</button></p>
                <label class="kv-check"><input type="checkbox" name="wrote"><span>I saved the 12 words somewhere only I can reach. Anyone who has them can start a withdrawal.</span></label>
                <button class="kv-btn" data-act="setup-words" data-need="wrote">Next</button>` : `
                <p>Just to be sure they are written correctly:</p>
                <div class="kv-quiz">
                    <div><label class="kv-label">Word ${st.quiz[0] + 1}</label><input class="kv-input" name="q1" autocomplete="off" autocapitalize="off" spellcheck="false" autofocus></div>
                    <div><label class="kv-label">Word ${st.quiz[1] + 1}</label><input class="kv-input" name="q2" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
                </div>
                <div class="kv-err" data-err>${esc(st.err || "")}</div>
                <button class="kv-btn" data-act="setup-quiz" data-enter data-need="q1,q2">Check</button>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-show-words">Show the words again</button></p>`;
    const s2 = st.backup ? `
                <div class="kv-ok">${icon.ok}<div>Backup wallet ${st.backup.how === "typed" ? "(typed in)" : `confirmed by ${esc(st.backup.how)}`}<br><span class="kv-mono">${esc(st.backup.address)}</span></div></div>
                <button class="kv-btn" data-act="setup-backup-ok">Use this wallet</button>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-backup-change">Pick another</button></p>` : st.typing ? `
                <p class="kv-muted">Paste your backup wallet's address. It must be a standard kaspa:q address.</p>
                <input class="kv-input kv-mono" name="backupAddr" placeholder="kaspa:q\u2026" autocomplete="off" spellcheck="false" autofocus>
                <div class="kv-warn">Nobody can check a typed address is yours. If one character is wrong, an emergency would send your money to a stranger. Connecting the wallet is safer.</div>
                <label class="kv-check"><input type="checkbox" name="typedOk"><span>I checked every character. This wallet is mine and I have its recovery words.</span></label>
                <div class="kv-err" data-err>${esc(st.err || "")}</div>
                <button class="kv-btn" data-act="setup-backup-typed" data-need="backupAddr,typedOk">Use this address</button>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-backup-change">Connect a wallet instead</button></p>` : `
                <p class="kv-muted">If a withdrawal ever starts that you didn't start, your money goes here and nowhere else. Use a wallet you already have, with its recovery words written down.</p>
                <div class="kv-wallets">${WALLETS.map((w) => {
      const on = w.present();
      return `
                    <button class="kv-wallet" data-act="setup-backup-ext" data-wallet="${w.id}" ${on ? "" : "disabled"}>
                        <span class="kv-wallet-ic" style="background:${w.color}">${w.name[0]}</span>
                        <span class="kv-wallet-t"><b>${w.name}</b><span>${on ? "Signs a short note. Free, moves nothing." : "Not installed in this browser"}</span></span>\u203A</button>`;
    }).join("")}</div>
                <div class="kv-err" data-err>${esc(st.err || "")}</div>
                <p class="kv-center kv-gap"><button class="kv-link" data-act="setup-backup-type">My wallet is on my phone: type its address</button></p>`;
    const s3 = `
                <p class="kv-muted">Taking money out of the vault always takes this long. It is your time to notice and press "this wasn't me". It can't be changed later.</p>
                <div class="kv-tiles">${this.#delays().map((d) => `
                    <button class="kv-tile ${String(st.delayDaa) === String(d) ? "kv-tile-sel" : ""}" data-act="setup-delay" data-daa="${d}">
                        <b>${d < DAA_PER_DAY ? `Test: ${dayWord(d)}` : dayWord(d).replace(/^one/, "1")}</b><span>${d < DAA_PER_DAY ? "For trying it out with small amounts" : d === DAA_PER_DAY ? "Most people pick this" : d <= 3 * DAA_PER_DAY ? "Time to notice on a busy week" : "Long-term savings"}</span></button>`).join("")}</div>
                <button class="kv-btn" data-act="setup-delay-ok" ${st.delayDaa ? "" : "disabled"}>Next</button>`;
    const s4 = `
                <p class="kv-muted">The watcher, ${esc(this.s.guardian.name)}, emails this address the moment a withdrawal starts. You confirm it once by a link.</p>
                <input class="kv-input" type="email" name="email" placeholder="you@example.com" autocomplete="email" autofocus>
                <label class="kv-check"><input type="checkbox" name="final"><span>I understand: taking money out takes ${esc(dayWord(st.delayDaa))}, emergencies go to <span class="kv-mono">${esc(short(st.backup && st.backup.address))}</span>, and my 12 words plus the vault card are how I get back in.</span></label>
                <div class="kv-err" data-err>${esc(st.err || "")}</div>
                <button class="kv-btn" data-act="setup-create" data-enter data-need="email,final" ${st.busy ? "disabled" : ""}>${st.busy ? esc(st.busy) : "Open my vault"}</button>`;
    return step(1, "Your vault's wallet", "Made in this browser, 12 words written down", st.step === 1, s1) + step(2, "Your backup wallet", st.backup ? `<span class="kv-mono">${esc(short(st.backup.address))}</span>` : "", st.step === 2, s2) + step(3, "Waiting time", st.delayDaa ? esc(dayWord(st.delayDaa)) : "", st.step === 3, s3) + step(4, "Email for alerts", "", st.step === 4, s4) + `<p class="kv-center"><button class="kv-link" data-act="setup-cancel">Cancel</button></p>`;
  }
  // ---------- restore ----------
  #restoreHtml() {
    const r = this.s.restore || {};
    const info = r.info;
    return `
        <div class="kv-card">
            <h2>Open your vault in this browser</h2>
            <p class="kv-muted">Choose your backup file (kaspa-vault-backup-\u2026.json), or your vault card and then type your 12 recovery words.</p>
            <label class="kv-label">Backup file or vault card</label>
            <input class="kv-input" type="file" name="cardFile" accept=".json,application/json" data-act-change="restore-file">
            ${info ? `<dl class="kv-kv">
                <dt>Vault</dt><dd>${esc(info.vaultAddress)}</dd>
                <dt>Backup wallet</dt><dd>${esc(info.rescueAddress)}</dd>
                <dt>Waiting time</dt><dd>${esc(dayWord(info.delayDaa))}</dd>
            </dl>
            <label class="kv-check"><input type="checkbox" name="backupMine"><span>The backup wallet above is mine. (If it isn't, this card is not yours: stop here.)</span></label>` : ""}
            <label class="kv-label">Recovery words</label>
            <textarea class="kv-input" name="words" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="word1 word2 \u2026"></textarea>
            <label class="kv-label">New password for this browser</label><input class="kv-input" type="password" name="pw1" autocomplete="new-password">
            <label class="kv-label">Same password again</label><input class="kv-input" type="password" name="pw2" autocomplete="new-password">
            <div class="kv-err" data-err>${esc(r.err || "")}</div>
            <button class="kv-btn" data-act="restore-go" data-enter data-need="backupMine,words,pw1,pw2" ${r.busy || !info ? "disabled" : ""}>${r.busy ? "Opening\u2026" : "Open my vault"}</button>
            <p class="kv-center kv-gap"><button class="kv-link" data-act="restore-cancel">Cancel</button></p>
        </div>`;
  }
  // ---------- account ----------
  #accountHtml() {
    const { snap, opened, rec } = this.s;
    const info = opened.info;
    const day = dayWord(info.delayDaa);
    let banners = "";
    const ws = this.s.ws && this.s.ws.state;
    if (this.s.watcherDown || ws === "offline" || ws === "stale") banners += `<div class="kv-banner">${icon.bell}<div><b>${ws === "stale" ? "The watcher is not reading the network right now" : "The watcher can't be reached right now"}</b>Your money is safe: it can still only go to your spending wallet after the waiting time, or to your backup wallet. Until the watcher is back, nobody emails you when a withdrawal starts.</div></div>`;
    else if (this.s.watched === false && !rec.email) banners += `<div class="kv-banner">${icon.bell}<div><b>Alerts are off</b>Nobody will email you when a withdrawal starts. Turn alerts on before you put money in.<br><button class="kv-btn kv-btn-small" data-act="sheet" data-sheet="alerts">Turn on alerts</button></div></div>`;
    else if (this.s.watched === false) banners += `<div class="kv-banner">${icon.bell}<div><b>Confirm your email to turn on alerts</b>We sent a link to ${esc(rec.email)}. Alerts start when you press it. Nothing there? Check spam, or <button class="kv-link" data-act="sheet" data-sheet="alerts">send it again</button>.</div></div>`;
    const g = this.s.guardian;
    if (this.s.guardianProblem) banners += `<div class="kv-banner">${icon.bell}<div><b>This page's watcher can't be confirmed</b>${esc(this.s.guardianProblem)}</div></div>`;
    else if (g && g.pubkey !== rec.card.keys.guardian) banners += `<div class="kv-banner">${icon.bell}<div><b>This page's watcher does not guard your vault</b>Your vault names key ${esc(rec.card.keys.guardian.slice(0, 12))}\u2026; the watcher here answers with ${esc(g.pubkey.slice(0, 12))}\u2026. Alerts and rescues come only from your vault's own watcher.</div></div>`;
    const mustSave = rec.cardSaved === false;
    if (mustSave) banners += `<div class="kv-banner">${icon.bell}<div><b>Save your backup before you put money in</b>The words open the wallet; the vault card tells any Kaspa tool where your vault is and who guards it. Words alone can't find the vault if this browser forgets it. The backup file holds both; keep it private.<br><button class="kv-btn kv-btn-small" data-act="backup">Download backup file</button> <button class="kv-link" data-act="card">or the vault card only</button></div></div>`;
    if (this.s.nodeDown) banners += `<div class="kv-banner">${icon.bell}<div><b>The Kaspa network can't be reached</b>Balances may be out of date. Retrying.</div></div>`;
    if (!snap) return banners + `<div class="kv-card kv-center kv-muted">Reading your vault\u2026</div>`;
    const b = snap.balances;
    const strips = snap.pending.map((p) => `
            <div class="kv-strip"><div class="kv-strip-ic">${icon.clock}</div><div>
                <b>${esc(kas(p.amount))} is on its way to your spending wallet</b>
                <p>Arrives ${esc(when(p.etaMs))}.${this.s.watched ? " The watcher has emailed you." : ""}</p>
                <button class="kv-link" data-act="sheet" data-sheet="notme">Didn't start this?</button>
            </div></div>`).join("");
    const coins = [...snap.vaultCoins].sort((x, y) => BigInt(y.blockDaaScore) > BigInt(x.blockDaaScore) ? 1 : -1);
    const rows = coins.map((c) => `
            <div class="kv-row"><div class="kv-row-ic">${icon.lock}</div>
                <div class="kv-row-t"><b>Deposit</b><span>takes ${esc(day)} to take out</span></div>
                <div class="kv-row-amt">${esc(kas(c.amount))}</div></div>`).join("");
    const protectedPill = this.s.watched ? `<div class="kv-pill" title="${esc(info.rescueAddress)}"><span class="kv-dot"></span>Protected \xB7 backup ${esc(short(info.rescueAddress))}</div>` : `<div class="kv-pill kv-pill-off"><span class="kv-dot"></span>Alerts not on yet</div>`;
    return `${banners}${strips}
        <div class="kv-card kv-balance">
            <div class="kv-lbl">In your vault</div>
            <div class="kv-amt">${esc(kas(b.vault, false))}<small>KAS</small></div>
            ${b.pending > 0n ? `<div class="kv-muted">+ ${esc(kas(b.pending))} on its way out</div>` : ""}
            ${protectedPill}
            <div class="kv-row2">
                <button class="kv-btn" data-act="sheet" data-sheet="add" ${mustSave ? 'disabled title="Save your vault card first"' : ""}>Add money</button>
                <button class="kv-btn kv-btn-line" data-act="sheet" data-sheet="out" ${snap.vaultCoins.length ? "" : "disabled"}>Take money out</button>
            </div>
        </div>
        <div class="kv-card">
            <div class="kv-spend"><div class="kv-spend-t"><b>Spending wallet</b><span class="kv-muted">Withdrawals from the vault land here, ready to spend.</span></div>
                <div class="kv-spend-amt">${esc(kas(b.hot))}</div></div>
            <div class="kv-spend-btns">
                <button class="kv-btn kv-btn-line kv-btn-small" data-act="sheet" data-sheet="receive">Receive</button>
                <button class="kv-btn kv-btn-line kv-btn-small" data-act="sheet" data-sheet="send" ${snap.hotCoins.length ? "" : "disabled"}>Send</button>
            </div>
        </div>
        <div class="kv-card">
            <h2>What's inside</h2>
            <p class="kv-muted" style="margin-bottom:6px">Taking money out always takes ${esc(day)}. Each deposit comes out whole.</p>
            ${rows || (snap.pending.length ? `<div class="kv-empty">The vault is empty right now. What is on its way out is shown at the top.</div>` : `<div class="kv-empty">Nothing in the vault yet. Press "Add money": straight from Kasware, or from any wallet or exchange to your vault address.</div>`)}
        </div>
        <div class="kv-foot">
            <button class="kv-link" data-act="sheet" data-sheet="how">How it's protected</button>
            <button class="kv-link" data-act="sheet" data-sheet="check">Check my vault</button>
            <button class="kv-link" data-act="card">Download vault card</button>
            <button class="kv-link" data-act="sheet" data-sheet="words">Recovery words</button>
            ${this.#locked() ? "" : '<button class="kv-link" data-act="lock">Lock</button>'}
            <button class="kv-link" data-act="sheet" data-sheet="remove">Remove from this browser</button>
        </div>`;
  }
  // ---------- sheets ----------
  #pw(force) {
    return force || this.#locked() ? `<label class="kv-label">Your password</label><input class="kv-input" type="password" name="password" autocomplete="current-password">` : "";
  }
  #sheetHtml() {
    const sh = this.s.sheet, info = this.s.opened && this.s.opened.info, snap = this.s.snap;
    const close = (label = "Cancel") => `<button class="kv-btn kv-btn-quiet" data-act="close">${label}</button>`;
    const err = `<div class="kv-err" data-err>${esc(sh.err || "")}</div>`;
    const busyLabel = (label) => sh.busy ? esc(sh.busy) : label;
    let h = "";
    if (sh.kind === "add") {
      const spend = snap ? snap.balances.hot : 0n;
      const ks = canSendFrom().length > 0;
      const way = sh.way || (ks ? "kasware" : spend > 0n ? "spending" : "address");
      const tabs = [ks && ["kasware", "From Kasware"], ["address", "Any wallet or exchange"], spend > 0n && ["spending", "From spending wallet"]].filter(Boolean);
      const alertNote = this.s.watched ? "" : `<div class="kv-warn">Alerts are not on yet. Confirm the email from the watcher first, or nobody will tell you when a withdrawal starts.</div>`;
      const note = `<div class="kv-note">Taking it out again takes <b>${esc(dayWord(info.delayDaa))}</b>, and you get an email when it starts.</div>`;
      let body = "";
      if (way === "kasware") body = `
                <p class="kv-muted">Kasware sends it straight into your vault. It asks you to approve.</p>
                <div class="kv-amt-in"><input name="ksAmount" inputmode="decimal" placeholder="0" autocomplete="off" autofocus><span>KAS</span></div>
                ${note}${err}
                <button class="kv-btn" data-act="do-kasware" data-enter data-need="ksAmount" ${sh.busy ? "disabled" : ""}>${busyLabel("Send from Kasware")}</button>`;
      else if (way === "address") body = `
                <p class="kv-muted">Send KAS to your vault's own address, from any Kaspa wallet or exchange. It shows up here once the network confirms it.</p>
                <div class="kv-qr"><div class="kv-qr-box">${qrSvg(info.vaultAddress)}</div><div class="kv-mono">${esc(info.vaultAddress)}</div></div>
                <button class="kv-btn kv-btn-line" data-act="copy" data-text="${esc(info.vaultAddress)}">Copy vault address</button>
                ${note}`;
      else body = `
                <p class="kv-muted">${esc(kas(spend))} in your spending wallet</p>
                <div class="kv-amt-in"><input name="amount" inputmode="decimal" placeholder="0" autocomplete="off" autofocus><span>KAS</span></div>
                <div class="kv-amt-row"><span class="kv-muted" data-hint></span><button class="kv-btn kv-btn-line kv-btn-small" data-act="amount-all">All of it</button></div>
                ${note}${this.#pw()}${err}
                <button class="kv-btn" data-act="do-add" data-enter data-need="amount${this.#locked() ? ",password" : ""}" ${sh.busy ? "disabled" : ""}>${busyLabel("Add to vault")}</button>`;
      h = `<h3>Add money to your vault</h3>
                ${tabs.length > 1 ? `<div class="kv-tabs">${tabs.map(([k, l]) => `<button class="kv-tab ${k === way ? "kv-tab-on" : ""}" data-act="add-way" data-way="${k}">${l}</button>`).join("")}</div>` : ""}
                ${alertNote}${body}${close(way === "address" ? "Close" : "Cancel")}`;
    } else if (sh.kind === "out") {
      const coins = sh.coins || [];
      h = `<h3>Take money out</h3><p class="kv-muted">It lands in your spending wallet after ${esc(dayWord(info.delayDaa))}.</p>
                <div class="kv-pick">${coins.map((c, i) => `<label><input type="checkbox" name="coin${i}" data-coin="${esc(c.txid)}:${c.index}" checked><span><b>${esc(kas(c.amount))}</b><span>deposit</span></span></label>`).join("")}</div>
                <div class="kv-note">You'll get an email now. If it wasn't you, that email has a button that sends everything to your backup wallet instead.</div>
                ${this.#pw()}${err}
                <button class="kv-btn" data-act="do-out" data-enter ${this.#locked() ? 'data-need="password"' : ""} ${sh.busy ? "disabled" : ""}>${busyLabel("Start taking out")}</button>${close()}`;
    } else if (sh.kind === "receive") {
      const addr = info.hotAddress;
      const ks = canSendFrom();
      h = `<h3>Your spending wallet</h3><p class="kv-muted">Withdrawals from the vault land here, ready to spend. You can also send KAS here from any wallet or exchange.</p>
                <div class="kv-qr"><div class="kv-qr-box">${qrSvg(addr)}</div><div class="kv-mono">${esc(addr)}</div></div>
                <button class="kv-btn kv-btn-line" data-act="copy" data-text="${esc(addr)}">Copy address</button>
                ${ks.length ? `<div class="kv-note"><b>From Kasware on this browser:</b>
                    <div class="kv-amt-in" style="margin-bottom:0"><input name="ksAmount" inputmode="decimal" placeholder="0" autocomplete="off"><span>KAS</span></div></div>
                    ${err}<button class="kv-btn" data-act="do-kasware" data-need="ksAmount" ${sh.busy ? "disabled" : ""}>${busyLabel("Send from Kasware")}</button>` : ""}
                ${close("Close")}`;
    } else if (sh.kind === "send") {
      h = `<h3>Send from your spending wallet</h3><p class="kv-muted">${esc(kas(snap ? snap.balances.hot : 0n))} there</p>
                <label class="kv-label">To</label><input class="kv-input kv-mono" name="to" placeholder="kaspa:\u2026" autocomplete="off" spellcheck="false" autofocus>
                <div class="kv-amt-in"><input name="amount" inputmode="decimal" placeholder="0" autocomplete="off"><span>KAS</span></div>
                <div class="kv-amt-row"><span class="kv-muted" data-hint></span><button class="kv-btn kv-btn-line kv-btn-small" data-act="amount-all">All of it</button></div>
                ${this.#pw(true)}${err}
                <button class="kv-btn" data-act="do-send" data-enter data-need="to,amount,password" ${sh.busy ? "disabled" : ""}>${busyLabel("Send")}</button>${close()}`;
    } else if (sh.kind === "notme") {
      h = `<h3>Didn't start this withdrawal?</h3>
                <p>Then someone has your vault's wallet. The watcher can move everything in the vault, and everything on its way out, to your backup wallet <span class="kv-mono">${esc(short(info.rescueAddress))}</span>. Only there.</p>
                <div class="kv-note">Use the button in the alert email. Can't find it? We'll email a new one to ${esc(this.s.rec.email || "your confirmed address")}. Then don't put money back into this vault: open a new one with new words.</div>
                ${err}${sh.done ? `<div class="kv-ok">${icon.ok}<div>Sent. Check ${esc(this.s.rec.email || "your email")} and press the button in it.</div></div>${close("Close")}` : `<button class="kv-btn" data-act="do-lost" ${sh.busy ? "disabled" : ""}>${busyLabel("Email me the rescue button")}</button>${close()}`}`;
    } else if (sh.kind === "alerts") {
      h = `<h3>Turn on alerts</h3><p class="kv-muted">The watcher, ${esc(this.s.guardian ? this.s.guardian.name : this.watcherUrl)}, emails you the moment a withdrawal starts.</p>
                <label class="kv-label">Email</label><input class="kv-input" type="email" name="email" value="${esc(this.s.rec.email || "")}" data-fresh autocomplete="email" autofocus>
                ${this.#pw()}${err}
                <button class="kv-btn" data-act="do-alerts" data-enter data-need="email${this.#locked() ? ",password" : ""}" ${sh.busy ? "disabled" : ""}>${busyLabel("Send the confirmation link")}</button>${close()}`;
    } else if (sh.kind === "words") {
      h = sh.showing && this.#shown ? `<h3>Your recovery words</h3><p class="kv-muted">They open your vault's wallet in any Kaspa wallet app. Never type them into a website you don't trust.</p>
                <div class="kv-words">${this.#shown.split(" ").map((w) => `<span>${esc(w)}</span>`).join("")}</div>
                <div class="kv-row2"><button class="kv-btn kv-btn-line" data-act="copy-words">Copy words</button><button class="kv-btn kv-btn-line" data-act="backup">Download backup file</button></div>
                <p class="kv-muted kv-gap">The backup file holds the words and the vault card together: everything needed to open this vault anywhere. Keep it as private as the words.</p>${close("Hide")}` : `<h3>Show recovery words</h3><p class="kv-muted">Make sure nobody can see your screen.</p>
                ${this.#pw(true)}${err}<button class="kv-btn" data-act="do-words" data-enter data-need="password">Show</button>${close()}`;
    } else if (sh.kind === "check") {
      h = this.#checkHtml() + close("Close");
    } else if (sh.kind === "how") {
      const day = dayWord(info.delayDaa);
      h = `<h3>How your vault is protected</h3>
                <div class="kv-note"><b>Money in the vault can only go two places:</b> your spending wallet, after ${esc(day)}; or your backup wallet, at any time. That is written into the vault itself, on the Kaspa network. No website, no watcher, nobody can change it.</div>
                <div class="kv-note"><b>The watcher</b> (${esc(this.s.guardian ? this.s.guardian.name : this.watcherUrl)}) emails you the moment a withdrawal starts. If it wasn't you, its button moves everything to your backup wallet. Its key can't send money anywhere else.</div>
                <div class="kv-note"><b>If someone steals your vault's wallet,</b> all they can do is start the ${esc(day)} clock. You get the email and press the button.</div>
                <div class="kv-note"><b>If this website disappears,</b> your 12 words and the vault card work the vault from any Kaspa tool. The watcher still finishes withdrawals and sends alerts.</div>
                ${close("Close")}`;
    } else if (sh.kind === "watcher") {
      const ws = this.s.ws || {}, g = this.s.guardian;
      const ago = ws.lastPoll ? Math.max(0, Math.round((Date.now() - Date.parse(ws.lastPoll)) / 1e3)) : null;
      h = `<h3>${{ online: "The watcher is online", stale: "The watcher is behind", offline: "The watcher is offline" }[ws.state] || "Checking the watcher"}</h3>
                <p class="kv-muted">${esc(g ? g.name : this.watcherUrl)}${ago != null ? ` \xB7 last read the network ${ago < 90 ? `${ago} seconds` : `${Math.round(ago / 60)} minutes`} ago` : ""}</p>
                <div class="kv-note"><b>What the watcher does:</b> it emails you the moment a withdrawal starts, gives you the button that sends everything to your backup wallet, and finishes withdrawals after the waiting time.</div>
                <div class="kv-note"><b>What it can't do:</b> move money anywhere except your own backup wallet. If it is offline, vaults stay locked exactly as before; you only miss the email until it is back. This page also finishes your withdrawals by itself when it is open.</div>
                ${close("Close")}`;
    } else if (sh.kind === "remove") {
      h = `<h3>Remove the vault from this browser?</h3>
                <p>The money stays in the vault. To open it again here or anywhere else you need the <b>vault card</b> and your <b>12 recovery words</b>.</p>
                <button class="kv-btn kv-btn-line" data-act="card">Download the vault card first</button>
                <label class="kv-label">Type REMOVE to confirm</label><input class="kv-input" name="confirm" autocomplete="off">
                ${err}<button class="kv-btn" data-act="do-remove" data-need="confirm">Remove from this browser</button>${close()}`;
    } else if (sh.kind === "done") {
      h = `<h3>${esc(sh.title)}</h3><p class="kv-muted">${esc(sh.text)}</p>
                <div class="kv-progress">${sh.steps.map((t, i) => `<div class="kv-pstep ${i < sh.at ? "kv-pstep-done" : i === sh.at ? "kv-pstep-now" : ""}"><span class="kv-pdot">${i < sh.at ? "\u2713" : i + 1}</span>${esc(t)}</div>`).join("")}</div>
                <p class="kv-muted">${sh.txids.map((t) => {
        const u = this.#explorer(t);
        return u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t.slice(0, 12))}\u2026</a>` : `<span class="kv-mono">${esc(t.slice(0, 16))}\u2026</span>`;
      }).join(" \xB7 ")}</p>
                ${sh.failed ? `<div class="kv-err">${esc(sh.failed)}</div>` : ""}
                <button class="kv-btn" data-act="close">Done</button>`;
    }
    return `<div class="kv-overlay" data-act="overlay"><div class="kv-sheet" role="dialog" aria-modal="true">${h}</div></div>`;
  }
  #checkHtml() {
    const { opened, rec } = this.s;
    const info = opened.info, c = rec.card;
    const g = this.s.guardian;
    const live = g ? g.pubkey === c.keys.guardian ? `${icon.ok}<div>The watcher answers with this key right now.</div>` : null : null;
    return `<h3>Check my vault</h3>
            <div class="kv-ok">${icon.ok}<div>Rebuilt in this browser from the keys on your vault card: the addresses below are exactly what those keys and the published vault contracts produce.</div></div>
            ${live ? `<div class="kv-ok">${live}</div>` : g ? `<div class="kv-warn">The watcher now answers with a different key (${esc(g.pubkey.slice(0, 16))}\u2026). Your vault still names ${esc(c.keys.guardian.slice(0, 16))}\u2026, so only that key can rescue it. Contact the watcher's operator.</div>` : ""}
            <dl class="kv-kv">
                <dt>Vault</dt><dd>${esc(info.vaultAddress)}</dd>
                <dt>On its way out</dt><dd>${esc(info.airlockAddress)}</dd>
                <dt>Spending wallet</dt><dd>${esc(info.hotAddress)}</dd>
                <dt>Backup wallet</dt><dd>${esc(info.rescueAddress)}</dd>
                <dt>Watcher key</dt><dd>${esc(c.keys.guardian)}</dd>
                <dt>Waiting time</dt><dd>${esc(dayWord(info.delayDaa))} (${esc(info.delayDaa)} DAA)</dd>
            </dl>
            <p class="kv-muted">Check them yourself with the open-source tools: the two contract files below work with <span class="kv-mono">npx kaspa-ksm@1.0.2 verify</span>, and any Kaspa explorer shows what each address holds.</p>
            <button class="kv-btn kv-btn-line" data-act="ksm">Download the two contract files (.ksm)</button>`;
  }
  // ---------- events ----------
  #onInput(e) {
    const t = e.target;
    if (t.name === "amount" || t.name === "ksAmount") {
      const v = t.value.replace(/[^0-9.]/g, "");
      const i = v.indexOf(".");
      const clean3 = i < 0 ? v : v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 8);
      if (clean3 !== t.value) t.value = clean3;
      if (this.s.sheet) {
        this.s.sheet.all = false;
        if (this.s.sheet.err) this.#setErr("");
      }
      this.#hint();
    }
    if (t.type === "file" && t.dataset.actChange === "restore-file") this.#restoreFile(t);
    this.#syncButtons();
  }
  #hint() {
    const el = this.#root.querySelector("[data-hint]"), a = this.#root.querySelector("[name=amount]");
    if (!el || !a) return;
    const v = parseKas(a.value), have = this.s.snap ? this.s.snap.balances.hot : 0n;
    el.textContent = this.s.sheet && this.s.sheet.all ? "Everything there, minus the network fee" : v && v > have ? "More than your spending wallet holds" : "";
  }
  #syncButtons() {
    this.#root.querySelectorAll("[data-need]").forEach((b) => {
      if (b.dataset.busy) return;
      const need = b.dataset.need.split(",").filter(Boolean);
      const ok = need.every((n) => {
        const el = this.#root.querySelector(`[name="${n}"]`);
        return !el || (el.type === "checkbox" ? el.checked : el.value.trim() !== "");
      });
      const busy = this.s.sheet && this.s.sheet.busy || this.s.setup && this.s.setup.busy;
      b.disabled = !ok || !!busy;
    });
  }
  #val(n) {
    const el = this.#root.querySelector(`[name="${n}"]`);
    return el ? el.type === "checkbox" ? el.checked : el.value : "";
  }
  #setErr(msg) {
    if (this.s.sheet) this.s.sheet.err = msg;
    else if (this.s.setup) this.s.setup.err = msg;
    else if (this.s.restore) this.s.restore.err = msg;
    const el = this.#root.querySelector("[data-err]");
    if (el) el.textContent = msg || "";
    else if (msg) this.#toast(msg, true);
  }
  async #onClick(e) {
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    if (act === "overlay") {
      if (e.target === el && !(this.s.sheet && this.s.sheet.busy)) this.#closeSheet();
      return;
    }
    e.preventDefault();
    try {
      await this.#act(act, el);
    } catch (err) {
      this.#setErr(friendly(err));
    }
  }
  #openSheet(kind, extra = {}) {
    const coins = kind === "out" && this.s.snap ? [...this.s.snap.vaultCoins] : null;
    this.s.sheet = { kind, coins, ...extra };
    this.#paint();
  }
  #closeSheet() {
    this.s.sheet = null;
    this.#shown = null;
    this.#paint();
    this.refresh();
  }
  #sheetBusy(label) {
    this.s.sheet.busy = label;
    this.s.sheet.err = "";
    this.#paint();
  }
  async #act(act, el) {
    const s = this.s;
    switch (act) {
      // ---- setup ----
      case "setup-start":
        s.setup = { step: 1, sub: "password" };
        s.phase = "setup";
        return this.#paint();
      case "setup-cancel":
        s.setup = null;
        this.#draft = null;
        s.phase = "welcome";
        return this.#paint();
      case "setup-password": {
        const a = this.#val("pw1"), b = this.#val("pw2");
        if (a.length < 8) return this.#setErr("Use at least 8 characters.");
        if (a !== b) return this.#setErr("The two passwords are not the same.");
        const words = newWords();
        const w = walletFromWords(words, { network: s.guardian.network });
        const pick = () => Math.floor(Math.random() * 12);
        let q1 = pick(), q2 = pick();
        while (q2 === q1) q2 = pick();
        this.#draft = { password: a, words, wallet: w };
        Object.assign(s.setup, { sub: "words", hotAddress: w.address, quiz: [Math.min(q1, q2), Math.max(q1, q2)], err: "" });
        return this.#paint();
      }
      case "setup-words":
        s.setup.sub = "quiz";
        s.setup.err = "";
        return this.#paint();
      case "setup-show-words":
        s.setup.sub = "words";
        return this.#paint();
      case "setup-quiz": {
        const ws = this.#draft.words.split(" ");
        const ok = this.#val("q1").trim().toLowerCase() === ws[s.setup.quiz[0]] && this.#val("q2").trim().toLowerCase() === ws[s.setup.quiz[1]];
        if (!ok) return this.#setErr("Those are not the right words. Check what you wrote, or show the words again.");
        Object.assign(s.setup, { step: 2, err: "", proof: `kaspa-vault: this is my backup wallet
vault wallet: ${s.setup.hotAddress}
code: ${randomHex(8)}` });
        return this.#paint();
      }
      case "setup-backup-ext": {
        s.setup.err = "";
        const btn = el;
        btn.disabled = true;
        const address = await proveWith(el.dataset.wallet, s.setup.proof, s.guardian.network).finally(() => {
          btn.disabled = false;
        });
        if (address === s.setup.hotAddress) return this.#setErr("That is the vault's own wallet. Pick another wallet as the backup.");
        s.setup.backup = { address, how: WALLETS.find((w) => w.id === el.dataset.wallet).name };
        return this.#paint();
      }
      case "setup-backup-type":
        s.setup.typing = true;
        s.setup.err = "";
        return this.#paint();
      case "setup-backup-typed": {
        const a = this.#val("backupAddr").trim().toLowerCase();
        const pub = pubkeyFromAddress(a);
        if (!pub || p2pkAddress(s.guardian.network, pub) !== a) return this.#setErr(`That is not a standard ${s.guardian.network === "mainnet" ? "kaspa:q" : "kaspatest:q"} address.`);
        if (a === s.setup.hotAddress) return this.#setErr("That is the vault's own wallet. Use another wallet as the backup.");
        s.setup.backup = { address: a, how: "typed" };
        s.setup.typing = false;
        return this.#paint();
      }
      case "setup-backup-change":
        s.setup.backup = null;
        s.setup.typing = false;
        s.setup.err = "";
        return this.#paint();
      case "setup-backup-ok":
        s.setup.step = 3;
        return this.#paint();
      case "setup-delay":
        s.setup.delayDaa = el.dataset.daa;
        return this.#paint();
      case "setup-delay-ok":
        s.setup.step = 4;
        return this.#paint();
      case "setup-create":
        return this.#create();
      // ---- restore ----
      case "restore-start":
        s.restore = {};
        s.phase = "restore";
        return this.#paint();
      case "restore-cancel":
        s.restore = null;
        s.phase = "welcome";
        return this.#paint();
      case "restore-go":
        return this.#restoreGo();
      // ---- account ----
      case "sheet":
        return this.#openSheet(el.dataset.sheet);
      case "close":
        return this.#closeSheet();
      case "lock":
        this.#forget();
        this.#toast("Locked. Your password is needed for the next action.");
        return;
      case "copy": {
        try {
          await navigator.clipboard.writeText(el.dataset.text);
          this.#toast("Copied");
        } catch (e) {
          this.#toast("Copy did not work; select the address instead", true);
        }
        return;
      }
      case "copy-draft-words":
      case "copy-words": {
        const w = act === "copy-draft-words" ? this.#draft && this.#draft.words : this.#shown;
        try {
          await navigator.clipboard.writeText(w);
          this.#toast("Words copied. Paste them somewhere private.");
        } catch (e) {
          this.#toast("Copy did not work; write them down instead", true);
        }
        return;
      }
      case "backup": {
        const words = this.#shown || !this.#locked() && this.#secret.words;
        if (!words) return this.#openSheet("words");
        const c = s.rec.card;
        download(`kaspa-vault-backup-${s.opened.info.vaultAddress.split(":")[1].slice(0, 8)}.json`, JSON.stringify({
          format: "kaspa-vault-backup/1",
          warning: "PRIVATE. Anyone with these words can start withdrawals from this vault (the waiting time and the watcher still protect it). Keep this file as safe as the words.",
          words,
          card: c,
          howToOpen: 'kaspavault.com -> "I already have a vault" -> choose this file. Or import the words in Kasware/Kastle/Kaspium and use the card with any Kaspa tool.'
        }, null, 2));
        if (s.rec.cardSaved === false) {
          s.rec.cardSaved = true;
          this.#save(s.rec);
        }
        return this.#toast("Backup file saved. Keep it private.");
      }
      case "card": {
        const c = s.rec.card;
        download(`kaspa-vault-card-${s.opened.info.vaultAddress.split(":")[1].slice(0, 8)}.json`, JSON.stringify(c, null, 2));
        if (s.rec.cardSaved === false) {
          s.rec.cardSaved = true;
          this.#save(s.rec);
        }
        return this.#toast("Vault card saved. Keep it with your recovery words.");
      }
      case "ksm": {
        const files = manifestFiles({ vault: s.opened.vault, airlock: s.opened.airlock });
        files.forEach((f, i) => setTimeout(() => download(f.name, f.text), i * 400));
        return;
      }
      case "amount-all": {
        s.sheet.all = true;
        this.#setErr("");
        const a = this.#root.querySelector("[name=amount]");
        if (a) {
          a.value = kas(s.snap.balances.hot, false).replace(/,/g, "");
        }
        this.#hint();
        this.#syncButtons();
        return;
      }
      case "do-add":
        return this.#doAdd();
      case "add-way":
        s.sheet.way = el.dataset.way;
        s.sheet.err = "";
        s.sheet.all = false;
        return this.#paint();
      case "do-out":
        return this.#doOut();
      case "do-send":
        return this.#doSend();
      case "do-kasware":
        return this.#doKasware();
      case "do-lost":
        return this.#doLost();
      case "do-alerts":
        return this.#doAlerts();
      case "do-words": {
        s.sheet.busy = "Checking\u2026";
        this.#paint();
        try {
          const sec = await this.#unlock(this.#val("password"), { force: true });
          this.#shown = sec.words;
          s.sheet.showing = true;
        } finally {
          s.sheet.busy = null;
        }
        return this.#paint();
      }
      case "do-remove": {
        if (this.#val("confirm").trim() !== "REMOVE") return this.#setErr("Type REMOVE in capital letters.");
        try {
          localStorage.removeItem(this.storageKey);
        } catch (e) {
        }
        this.#forget();
        clearInterval(this.#timer);
        this.s = { phase: "loading", guardian: null, rec: null, opened: null, snap: null, watched: null, setup: null, sheet: null };
        this.client = null;
        this._provider = null;
        return this.#start();
      }
    }
  }
  // ---------- the actions ----------
  async #create() {
    const st = this.s.setup;
    const email = String(this.#val("email")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.#setErr("That email address does not look right.");
    st.busy = "Opening your vault\u2026";
    st.err = "";
    this.#paint();
    try {
      const g = await this.#loadGuardian();
      const d = this.#draft;
      const built = buildVault({ hot: d.wallet.publicKey, guardian: g.pubkey, rescue: pubkeyFromAddress(st.backup.address), delayDaa: String(st.delayDaa), network: g.network });
      const card = makeCard({ ...built, watcher: { url: this.watcherUrl, name: g.name } });
      const opened = openCard(card);
      if (opened.info.rescueAddress !== st.backup.address || opened.info.hotAddress !== d.wallet.address) throw new Error("The vault did not come out as expected; nothing was saved.");
      const box = await lock({ words: d.words }, d.password);
      const rec = { format: RECORD, box, card, email: null, registeredAt: null, cardSaved: false, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      this.#save(rec);
      this.#secret = { words: d.words, priv: d.wallet.privateKey, until: Date.now() + KEY_TTL_MS };
      this.#draft = null;
      this.s = { ...this.s, rec, opened, phase: "account", setup: null, watched: false };
      this.client = new VaultClient({ vault: opened.vault, airlock: opened.airlock }, { provider: this.#provider() });
      this.#paint();
      try {
        await this.#register(email);
        this.#toast("Your vault is open. Check your email to turn on alerts.");
      } catch (e) {
        this.#toast("Your vault is open, but the alert sign-up failed: " + friendly(e), true);
      }
      await this.refresh();
      clearInterval(this.#timer);
      this.#timer = setInterval(() => {
        if (document.visibilityState === "visible") this.refresh();
      }, REFRESH_MS);
    } catch (e) {
      st.busy = null;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  async #register(email) {
    const { rec, opened } = this.s;
    const time = (/* @__PURE__ */ new Date()).toISOString();
    const message = registrationMessage({ guardian: rec.card.keys.guardian, vaultAddress: opened.info.vaultAddress, email, time });
    const signature = signMessage(message, this.#secret.priv);
    const r = await fetch(`${this.watcherUrl}/v1/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card: rec.card, email, time, signature }) });
    let d = {};
    try {
      d = await r.json();
    } catch (e) {
      d = {};
    }
    if (!r.ok) throw new Error(d.error || `The watcher answered ${r.status}`);
    rec.email = email;
    rec.registeredAt = time;
    this.#save(rec);
    return d;
  }
  async #restoreFile(input) {
    const r = this.s.restore;
    r.err = "";
    r.card = null;
    r.info = null;
    try {
      const file = JSON.parse(await input.files[0].text());
      const card = file && file.format === "kaspa-vault-backup/1" ? file.card : file;
      r.info = openCard(card).info;
      r.card = card;
      r.words = file && file.format === "kaspa-vault-backup/1" && typeof file.words === "string" ? file.words : null;
    } catch (e) {
      r.err = "That file is not a vault card or backup file: " + e.message;
    }
    this.#paint();
    const t = this.#root.querySelector("[name=words]");
    if (t && r.words) {
      t.value = r.words;
      this.#syncButtons();
    }
  }
  async #restoreGo() {
    const r = this.s.restore;
    if (!r.card) return this.#setErr("Choose your vault card file first.");
    if (!this.#val("backupMine")) return this.#setErr("Confirm the backup wallet is yours.");
    const words = String(this.#val("words")).trim().toLowerCase().split(/\s+/).join(" ");
    const a = this.#val("pw1"), b = this.#val("pw2");
    if (!wordsOk(words)) return this.#setErr("Those recovery words are not valid. Check the spelling and the order.");
    if (a.length < 8) return this.#setErr("Use at least 8 characters for the password.");
    if (a !== b) return this.#setErr("The two passwords are not the same.");
    const w = walletFromWords(words, { network: r.card.network });
    if (w.publicKey !== r.card.keys.hot) return this.#setErr("These words don't open this vault. They belong to another wallet.");
    r.busy = true;
    this.#paint();
    try {
      const g = await this.#loadGuardian();
      if (r.card.network !== g.network) throw new Error(`This vault is on ${r.card.network}; this page works with ${g.network}.`);
      if (String(r.card.keys.guardian).toLowerCase() !== g.pubkey) throw new Error(`This vault is guarded by another watcher (key ${String(r.card.keys.guardian).slice(0, 12)}\u2026), not ${g.name}. Open it on the site that made it, or with any Kaspa tool from the vault card.`);
      const box = await lock({ words }, a);
      const rec = { format: RECORD, box, card: r.card, email: null, registeredAt: null, cardSaved: true, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      const opened = openCard(r.card);
      this.#save(rec);
      this.#secret = { words, priv: w.privateKey, until: Date.now() + KEY_TTL_MS };
      this.s = { ...this.s, rec, opened, phase: "account", restore: null };
      this._provider = null;
      this.client = new VaultClient({ vault: opened.vault, airlock: opened.airlock }, { provider: this.#provider() });
      this.#paint();
      await this.refresh();
      clearInterval(this.#timer);
      this.#timer = setInterval(() => {
        if (document.visibilityState === "visible") this.refresh();
      }, REFRESH_MS);
    } catch (e) {
      r.busy = false;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  #form() {
    return this.#root.querySelector(".kv-sheet");
  }
  async #doAdd() {
    const sh = this.s.sheet;
    const amount = sh.all ? null : parseKas(this.#val("amount"));
    if (!sh.all && !amount) return this.#setErr("Enter the amount as a plain number, like 25 or 2.5");
    const form = this.#form();
    this.#sheetBusy("Checking\u2026");
    try {
      const signer = await this.#signer(form);
      this.#sheetBusy("Moving\u2026");
      const r = await this.client.deposit({ signer, ...sh.all ? { all: true } : { amount } });
      this.#done({ title: `${kas(r.amount)} into your vault`, text: `Network fee ${kas(r.fee)}.`, steps: ["Sent from your spending wallet", "Confirming on the network", "In your vault"], at: 1, txids: [r.txid], watch: "deposit" });
    } catch (e) {
      sh.busy = null;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  async #doOut() {
    const sh = this.s.sheet;
    const ticked = new Set([...this.#root.querySelectorAll("[data-coin]")].filter((b) => b.checked).map((b) => b.dataset.coin));
    const picked = (sh.coins || []).filter((c) => ticked.has(`${c.txid}:${c.index}`));
    if (!picked.length) return this.#setErr("Pick at least one deposit.");
    const form = this.#form();
    this.#sheetBusy("Checking\u2026");
    try {
      const signer = await this.#signer(form);
      this.#sheetBusy("Starting\u2026");
      const r = await this.client.withdraw({ signer, coins: picked });
      if (!r.started.length) throw new Error(r.failed[0] ? r.failed[0].error : "nothing could be started");
      const total = r.started.reduce((a, x) => a + x.amount, 0n);
      this.#done({
        title: `${kas(total)} on its way out`,
        text: `It lands in your spending wallet after ${dayWord(this.s.opened.info.delayDaa)}.`,
        steps: ["Withdrawal started", "The watcher emails you", `Lands after ${dayWord(this.s.opened.info.delayDaa)}`],
        at: 1,
        txids: r.started.map((x) => x.txid),
        failed: r.failed.length ? `${r.failed.length} part(s) could not start: ${r.failed[0].error}` : "",
        watch: "withdraw"
      });
    } catch (e) {
      sh.busy = null;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  async #doSend() {
    const sh = this.s.sheet;
    const to = String(this.#val("to")).trim().toLowerCase();
    try {
      scriptPublicKey(to);
    } catch (e) {
      return this.#setErr("That is not a Kaspa address.");
    }
    if (networkOf(to) !== this.network) return this.#setErr(`That address is not on ${this.network}.`);
    const amount = sh.all ? null : parseKas(this.#val("amount"));
    if (!sh.all && !amount) return this.#setErr("Enter the amount as a plain number.");
    const form = this.#form();
    this.#sheetBusy("Checking\u2026");
    try {
      const signer = await this.#signer(form, { force: true });
      this.#sheetBusy("Sending\u2026");
      const r = await this.client.sendFromHot({ signer, to, ...sh.all ? { all: true } : { amount } });
      this.#done({ title: `${kas(r.amount)} sent`, text: `To ${short(to)}. Network fee ${kas(r.fee)}.`, steps: ["Sent", "Confirmed"], at: 1, txids: [r.txid], watch: "send" });
    } catch (e) {
      sh.busy = null;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  async #doKasware() {
    const amount = parseKas(this.#val("ksAmount"));
    if (!amount) return this.#setErr("Enter the amount as a plain number.");
    this.#sheetBusy("Waiting for Kasware\u2026");
    try {
      const toVault = this.s.sheet.kind === "add";
      await sendFrom("kasware", toVault ? this.s.opened.info.vaultAddress : this.s.opened.info.hotAddress, amount);
      this.s.sheet = null;
      this.#toast(`${kas(amount)} sent from Kasware ${toVault ? "into your vault" : "to your spending wallet"}. It shows up here within a few seconds.`);
      setTimeout(() => this.refresh(), 3e3);
    } catch (e) {
      this.s.sheet.busy = null;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  async #doLost() {
    const { rec, opened } = this.s;
    if (!rec.email) return this.#setErr("No email is registered for this vault in this browser. Use the button in the alert email.");
    this.#sheetBusy("Asking the watcher\u2026");
    try {
      const r = await fetch(`${this.watcherUrl}/v1/lost`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vaultAddress: opened.info.vaultAddress, email: rec.email }) });
      if (!r.ok) {
        let d = {};
        try {
          d = await r.json();
        } catch (e) {
          d = {};
        }
        throw new Error(d.error || `The watcher answered ${r.status}`);
      }
      this.s.sheet.busy = null;
      this.s.sheet.done = true;
      this.#paint();
    } catch (e) {
      this.s.sheet.busy = null;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  async #doAlerts() {
    const email = String(this.#val("email")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.#setErr("That email address does not look right.");
    await this.#unlock(this.#val("password"));
    this.#sheetBusy("Sending\u2026");
    try {
      await this.#register(email);
      this.s.sheet = null;
      this.#toast(`Confirmation link sent to ${email}.`);
      this.refresh();
    } catch (e) {
      this.s.sheet.busy = null;
      this.#paint();
      this.#setErr(friendly(e));
    }
  }
  // a progress sheet that follows the network until its last step is reached
  #done(d) {
    const target = { deposit: 3, withdraw: 2, send: 2 }[d.watch];
    this.s.sheet = { kind: "done", ...d };
    this.#paint();
    let n = 0;
    const tick = async () => {
      const sh = this.s.sheet;
      if (!sh || sh.kind !== "done" || n++ > 40) return;
      try {
        const snap = await this.client.snapshot();
        this.s.snap = snap;
        const ids = new Set([...snap.vaultCoins, ...snap.airlockCoins, ...snap.hotCoins].map((c) => c.txid));
        if (sh.txids.some((t) => ids.has(t))) sh.at = target;
      } catch (e) {
      }
      if (this.s.sheet !== sh) return;
      this.#paint();
      if (sh.at < target) setTimeout(tick, 3e3);
    };
    setTimeout(tick, 2500);
  }
};
if (!customElements.get("kaspa-vault")) customElements.define("kaspa-vault", KaspaVault);
export {
  KaspaVault,
  VERSION
};
