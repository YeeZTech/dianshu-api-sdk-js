const YPCUtils = require('@yeez-tech/meta-encryptor/build/commonjs/utils.cjs');
const YPCCrypto = YPCUtils.YPCCrypto;
const credentialAdapter = require('./generated/credentialAdapter');
const audit = require('./generated/auditParam');

class DSAPIContext {
  constructor(appCode, baseUrl) {
    if (!appCode) throw new Error('appCode 不能为空');
    this.appCode = appCode;
    this.baseUrl = baseUrl || 'https://data-api.dianshudata.com';
    // generate keypair using meta-encryptor
    const ypc = YPCCrypto;
    const sk = ypc.generatePrivateKey();
    const pub = ypc.generatePublicKeyFromPrivateKey(sk);
    this.publicKey = pub.toString('hex').padStart(128, '0');
    this.privateKey = sk.toString('hex').padStart(64, '0');
    this.algorithm = {
      encryptMessage: (pubKey, content) => credentialAdapter.encryptMessage(pubKey, content),
      decryptMessage: (privKey, secretHex) => credentialAdapter.decryptMessage(privKey, secretHex),
      auditParam: (privateKey, publicKey, dianPublicKey, enclaveHashStr, dataHash) => {
        return audit.buildAuditParam(privateKey, publicKey, dianPublicKey, enclaveHashStr, dataHash);
      }
    };
  }

  getAppCode() { return this.appCode; }
  getBaseUrl() { return this.baseUrl; }
  getPublicKey() { return this.publicKey; }
  getPrivateKey() { return this.privateKey; }
  getAlgorithm() { return this.algorithm; }
}

module.exports = DSAPIContext;
