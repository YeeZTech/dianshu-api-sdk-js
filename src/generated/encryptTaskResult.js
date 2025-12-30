import { YPCCrypto } from "@yeez-tech/meta-encryptor";

export async function encryptTaskResult(publicKeyHex, pkgBytes) {
  // publicKeyHex: hex string
  // pkgBytes: string or Buffer
  const ots = YPCCrypto.generatePrivateKey();
  const secret = YPCCrypto._encryptMessage(
    Buffer.from(publicKeyHex, "hex"),
    ots,
    pkgBytes,
    0x2
  );
  return secret.toString("hex");
}
