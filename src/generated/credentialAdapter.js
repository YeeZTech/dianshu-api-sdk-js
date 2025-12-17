const YPCUtils = require("@yeez-tech/meta-encryptor/build/commonjs/utils.cjs");
const YPCCrypto = YPCUtils.YPCCrypto;

function encryptMessage(publicKeyHex, content) {
  // Use generated ots (one-time secret) similar to node scripts
  const pkey = Buffer.from(publicKeyHex, 'hex');
  const ots = YPCCrypto.generatePrivateKey();
  const secretBuf = YPCCrypto._encryptMessage(pkey, ots, Buffer.from(String(content)), 0x2);
  return secretBuf.toString('hex');
}

function decryptMessage(privateKeyHex, secretHex, encoding = 'utf-8') {
  const skey = Buffer.from(privateKeyHex, 'hex');
  const msgBuf = Buffer.from(secretHex, 'hex');
  const res = YPCCrypto.decryptMessage(skey, msgBuf);
  if (encoding === 'hex') return res.toString('hex');
  return res.toString('utf-8');
}

module.exports = { encryptMessage, decryptMessage };
