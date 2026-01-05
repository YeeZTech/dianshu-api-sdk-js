const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export function utf8ToBytes(str) {
  return textEncoder.encode(String(str));
}

export function bytesToUtf8(bytes) {
  return textDecoder.decode(bytes);
}

export function bytesToHex(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let hex = '';
  for (let i = 0; i < u8.length; i++) {
    hex += u8[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToBytes(hex) {
  const h = String(hex).trim().replace(/^0x/i, '').toLowerCase();
  if (h.length % 2 !== 0) throw new Error('invalid hex string length');
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}


