const YPCUtils = require("@yeez-tech/meta-encryptor/build/commonjs/utils.cjs");
const YPCCrypto = YPCUtils.YPCCrypto;

async function encryptTaskResult(publicKeyHex, pkgBytes) {
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

module.exports = {
  encryptTaskResult
};
