import { YPCCrypto } from "@yeez-tech/meta-encryptor";

export function buildAuditParam(userPrivateKeyHex, userPublicKeyHex, dianPublicKeyHex, enclaveHashStr, dataHash) {
  const skey = Buffer.from(userPrivateKeyHex, "hex");
  const dataPkey = Buffer.from(dianPublicKeyHex, "hex");
  const enclave_hash = Buffer.from(enclaveHashStr, "hex");
  const sig = YPCCrypto.generateSignature(skey, dataPkey, enclave_hash);
  const secret = YPCCrypto.generateForwardSecretKey(dataPkey, skey);

  const reqData = {
    dataHash: dataHash,
    dataShuPublicKey: userPublicKeyHex,
    encryptedShuPrivateKey: secret.toString("hex"),
    shuKeyForwardSignature: sig.toString("hex"),
    allowedEnclaveHash: enclaveHashStr
  };
  return reqData;
}
