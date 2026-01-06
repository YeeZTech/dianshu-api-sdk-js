import { YPCCrypto } from "@yeez-tech/meta-encryptor";
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from "../utils/Bytes.js";
import log from 'loglevel';

export async function encryptMessage(publicKeyHex, content) {
  // Use generated ots (one-time secret) similar to node scripts
  const pkey = hexToBytes(publicKeyHex);
  const ots = YPCCrypto.generatePrivateKey();
  const msgBytes = utf8ToBytes(content);
  const secretBuf = await Promise.resolve(YPCCrypto._encryptMessage(pkey, ots, msgBytes, 0x2));
  const outLen = secretBuf && (secretBuf.length ?? secretBuf.byteLength ?? 0);
  log.debug('YPCCrypto._encryptMessage (credentialAdapter)', {
    pkeyLen: pkey.length,
    otsLen: ots && (ots.length ?? ots.byteLength ?? 0),
    msgLen: msgBytes.length,
    outType: secretBuf && secretBuf.constructor ? secretBuf.constructor.name : typeof secretBuf,
    outLen,
  });
  if (!secretBuf || outLen === 0) {
    throw new Error(`YPCCrypto._encryptMessage returned empty (outType=${secretBuf && secretBuf.constructor ? secretBuf.constructor.name : typeof secretBuf}, outLen=${outLen})`);
  }
  const hex = bytesToHex(secretBuf);
  log.debug('encryptMessage result', '[masked]');
  return hex;
}

export async function decryptMessage(privateKeyHex, secretHex, encoding = 'utf-8') {
  const skey = hexToBytes(privateKeyHex);
  const msgBuf = hexToBytes(secretHex);
  const res = await Promise.resolve(YPCCrypto.decryptMessage(skey, msgBuf));
  const outLen = res && (res.length ?? res.byteLength ?? 0);
  log.debug('YPCCrypto.decryptMessage (credentialAdapter)', {
    skeyLen: skey.length,
    msgLen: msgBuf.length,
    outType: res && res.constructor ? res.constructor.name : typeof res,
    outLen,
  });
  if (!res || outLen === 0) {
    throw new Error(`YPCCrypto.decryptMessage returned empty (outType=${res && res.constructor ? res.constructor.name : typeof res}, outLen=${outLen})`);
  }
  if (encoding === 'hex') return bytesToHex(res);
  return bytesToUtf8(res);
}
