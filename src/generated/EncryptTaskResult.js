import { YPCCrypto } from "@yeez-tech/meta-encryptor";
import { bytesToHex, hexToBytes, utf8ToBytes } from "../utils/Bytes.js";

export async function encryptTaskResult(publicKeyHex, pkgBytes) {
  // publicKeyHex: hex string
  // pkgBytes: string or Buffer
  const ots = YPCCrypto.generatePrivateKey();
  const bytes = typeof pkgBytes === 'string'
    ? utf8ToBytes(pkgBytes)
    : (pkgBytes instanceof Uint8Array ? pkgBytes : new Uint8Array(pkgBytes));
  const secret = await Promise.resolve(YPCCrypto._encryptMessage(
    hexToBytes(publicKeyHex),
    ots,
    bytes,
    0x2
  ));
  return bytesToHex(secret);
}
