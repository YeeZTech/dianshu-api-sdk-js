// 简单对称加解密封装（AES-256-GCM），供 test/run.js 自测使用
// 统一使用 WebCrypto（浏览器/Node18+ 都支持），避免依赖 Node 内置 crypto / Buffer
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from './utils/bytes.js';

const ALG = 'aes-256-gcm';

async function getWebCrypto() {
  if (globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto;
  throw new Error('WebCrypto is not available in this runtime');
}

async function deriveKey(secret) {
  const wc = await getWebCrypto();
  const digest = await wc.subtle.digest('SHA-256', utf8ToBytes(secret));
  return wc.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encrypt(plainText, secret) {
  const wc = await getWebCrypto();
  const key = await deriveKey(secret);
  const iv = new Uint8Array(12);
  wc.getRandomValues(iv);
  const data = utf8ToBytes(plainText);
  const cipherBuf = await wc.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const cipher = new Uint8Array(cipherBuf);
  const tagLen = 16;
  const enc = cipher.slice(0, cipher.length - tagLen);
  const tag = cipher.slice(cipher.length - tagLen);
  return {
    alg: ALG,
    iv: bytesToHex(iv),
    tag: bytesToHex(tag),
    data: bytesToHex(enc),
  };
}

async function decrypt(payload, secret) {
  const wc = await getWebCrypto();
  const key = await deriveKey(secret);
  const iv = hexToBytes(payload.iv);
  const tag = hexToBytes(payload.tag);
  const enc = hexToBytes(payload.data);
  const combined = new Uint8Array(enc.length + tag.length);
  combined.set(enc, 0);
  combined.set(tag, enc.length);
  const plainBuf = await wc.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  return bytesToUtf8(new Uint8Array(plainBuf));
}

const _impl = 'webcrypto-aes-256-gcm';

export {
  _impl,
  encrypt,
  decrypt,
};

