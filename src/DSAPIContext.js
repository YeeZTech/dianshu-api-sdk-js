import { YPCCrypto } from '@yeez-tech/meta-encryptor';
import * as credentialAdapter from './generated/CredentialAdapter.js';
import * as audit from './generated/AuditParam.js';
import { bytesToHex } from './utils/bytes.js';
import { dsLog, dsDebugSecretsEnabled, dsMask } from './debug.js';

class DSAPIContext {
  constructor(appCode, baseUrl) {
    if (!appCode) throw new Error('appCode 不能为空');
    this.appCode = appCode;
    this.baseUrl = baseUrl || 'https://data-api.dianshudata.com';
    // generate keypair using meta-encryptor
    const ypc = YPCCrypto;
    const sk = ypc.generatePrivateKey();
    const pub = ypc.generatePublicKeyFromPrivateKey(sk);
    this.publicKey = bytesToHex(pub).padStart(128, '0');
    this.privateKey = bytesToHex(sk).padStart(64, '0');

    dsLog('DSAPIContext init', {
      appCode: this.appCode,
      baseUrl: this.baseUrl,
      publicKey: dsDebugSecretsEnabled() ? this.publicKey : dsMask(this.publicKey),
      privateKey: dsDebugSecretsEnabled() ? this.privateKey : dsMask(this.privateKey),
    });

    this.algorithm = {
      encryptMessage: async (pubKey, content) => credentialAdapter.encryptMessage(pubKey, content),
      decryptMessage: async (privKey, secretHex) => credentialAdapter.decryptMessage(privKey, secretHex),
      auditParam: async (privateKey, publicKey, dianPublicKey, enclaveHashStr, dataHash) => {
        return audit.buildAuditParam(privateKey, publicKey, dianPublicKey, enclaveHashStr, dataHash);
      },
    };
  }

  getAppCode() { return this.appCode; }
  getBaseUrl() { return this.baseUrl; }
  getPublicKey() { return this.publicKey; }
  getPrivateKey() { return this.privateKey; }
  getAlgorithm() { return this.algorithm; }
}

export default DSAPIContext;
