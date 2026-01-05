import { YPCCrypto } from "@yeez-tech/meta-encryptor";
import { bytesToHex, bytesToUtf8, hexToBytes } from "../utils/Bytes.js";

export async function decryptTaskResult(privateKeyHex, taskResultHex, encoding = 'utf-8') {
  const res = await Promise.resolve(YPCCrypto.decryptMessage(
    hexToBytes(privateKeyHex),
    hexToBytes(taskResultHex)
  ));
  if (encoding === "hex") {
    return bytesToHex(res);
  } else if (encoding === "utf-8" || encoding === "utf8") {
    return bytesToUtf8(res);
  }
  return bytesToUtf8(res);
}
