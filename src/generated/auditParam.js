import { YPCCrypto } from "@yeez-tech/meta-encryptor";
import { bytesToHex, hexToBytes } from "../utils/bytes.js";
import { dsLog, dsDebugSecretsEnabled, dsMask } from "../debug.js";

export async function buildAuditParam(userPrivateKeyHex, userPublicKeyHex, dianPublicKeyHex, enclaveHashStr, dataHash) {
  const skey = hexToBytes(userPrivateKeyHex);
  const dataPkey = hexToBytes(dianPublicKeyHex);
  const enclave_hash = hexToBytes(enclaveHashStr);
  const sig = await Promise.resolve(YPCCrypto.generateSignature(skey, dataPkey, enclave_hash));
  const secret = await Promise.resolve(YPCCrypto.generateForwardSecretKey(dataPkey, skey));
  const secretLen = secret && (secret.length ?? secret.byteLength ?? 0);
  dsLog('YPCCrypto.generateForwardSecretKey (auditParam)', {
    dataPkeyLen: dataPkey.length,
    skeyLen: skey.length,
    outType: secret && secret.constructor ? secret.constructor.name : typeof secret,
    outLen: secretLen,
  });
  if (!secret || secretLen === 0) {
    throw new Error(`YPCCrypto.generateForwardSecretKey returned empty (outType=${secret && secret.constructor ? secret.constructor.name : typeof secret}, outLen=${secretLen})`);
  }

  const reqData = {
    dataHash: dataHash,
    dataShuPublicKey: userPublicKeyHex,
    encryptedShuPrivateKey: bytesToHex(secret),
    shuKeyForwardSignature: bytesToHex(sig),
    allowedEnclaveHash: enclaveHashStr
  };
  dsLog('buildAuditParam result', {
    encryptedShuPrivateKey: dsDebugSecretsEnabled() ? reqData.encryptedShuPrivateKey : dsMask(reqData.encryptedShuPrivateKey),
    shuKeyForwardSignature: dsDebugSecretsEnabled() ? reqData.shuKeyForwardSignature : dsMask(reqData.shuKeyForwardSignature),
  });
  return reqData;
}
