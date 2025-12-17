const credentialAdapter = require('./generated/credentialAdapter');

// resolve fetch similar to apiClient
let fetchImpl = null;
try { if (typeof fetch === 'function') fetchImpl = fetch; } catch (e) {}
if (!fetchImpl) {
  try { const nf = require('node-fetch'); fetchImpl = nf && (nf.default || nf); } catch (e) { fetchImpl = null; }
}

class DSAPIClient {
  constructor(apiId, dsapiContext) {
    if (!apiId) throw new Error('apiId required');
    if (!dsapiContext) throw new Error('dsapiContext required');
    this.apiId = apiId;
    this.ctx = dsapiContext;
    this.fideliusConfig = null; // lazy load
  }

  async ensureFideliusConfig() {
    if (this.fideliusConfig) return this.fideliusConfig;
    const url = `${this.ctx.getBaseUrl()}/api/privateKey`;
    const body = { appCode: this.ctx.getAppCode(), apiId: this.apiId };
    const res = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { throw new Error('invalid fidelius config response: ' + text); }
    const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
    if (!ok) throw new Error('fidelius config error: ' + text);
    this.fideliusConfig = parsed.data;
    return this.fideliusConfig;
  }

  // explicit initialization: pre-fetch fidelius config
  async init() {
    return this.ensureFideliusConfig();
  }

  async doPost(dto) {
    // dto: { bodyParams: [ { paramName, paramValue } ], requestHeaders }
    try {
      const fid = await this.ensureFideliusConfig();
      // build paramDto similar to Java
      const bodyMap = {};
      if (dto.bodyParams && Array.isArray(dto.bodyParams)) {
        dto.bodyParams.forEach(p => { bodyMap[p.paramName] = p.paramValue; });
      }
      const paramDto = { api_hash: fid.apiHash, api_method: 'POST', api_body: bodyMap };
      const jsonBody = JSON.stringify(paramDto);
      // encrypt with public key
      const encryptedParamHex = await this.ctx.getAlgorithm().encryptMessage(this.ctx.getPublicKey(), jsonBody);
      const base64Map = { encrypted_param: encryptedParamHex, shu_pkey: this.ctx.getPublicKey() };
      const paramsHex = Buffer.from(JSON.stringify(base64Map), 'utf8').toString('hex');

      const dataHash = fid.dianPkey + fid.enclaveHash;
      const shuInfo = this.ctx.getAlgorithm().auditParam(this.ctx.getPrivateKey(), this.ctx.getPublicKey(), fid.dianPkey, fid.enclaveHash, dataHash);

      const url = `${this.ctx.getBaseUrl()}/api/post/${this.apiId}`;
      const headers = {
        'Content-Type': 'application/json',
        appCode: this.ctx.getAppCode(),
        credential: this.ctx.getPublicKey(),
        shuInfo: typeof shuInfo === 'string' ? shuInfo : JSON.stringify(shuInfo)
      };

      if (!fetchImpl) {
        // return constructed request when fetch not available
        return { url, method: 'POST', headers, body: { params: paramsHex } };
      }

      const resp = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify({ params: paramsHex }) });
      const text = await resp.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
      const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
      if (ok && parsed.data && parsed.data.encrypted_result) {
        const plain = await this.ctx.getAlgorithm().decryptMessage(this.ctx.getPrivateKey(), parsed.data.encrypted_result);
        return plain;
      }
      // return raw response text
      return text;
    } catch (e) {
      throw e;
    }
  }

  async doGet(dto) {
    // dto: { queryParams: [ { paramName, paramValue } ], requestHeaders }
    try {
      const fid = await this.ensureFideliusConfig();
      // build paramDto similar to Java GET
      const paramMap = {};
      if (dto.queryParams && Array.isArray(dto.queryParams)) {
        dto.queryParams.forEach(p => { paramMap[p.paramName] = p.paramValue; });
      }
      const paramDto = { api_hash: fid.apiHash, api_method: 'GET', api_param: paramMap };
      const jsonBody = JSON.stringify(paramDto);
      // encrypt with public key
      const encryptedParamHex = await this.ctx.getAlgorithm().encryptMessage(this.ctx.getPublicKey(), jsonBody);
      const base64Map = { encrypted_param: encryptedParamHex, shu_pkey: this.ctx.getPublicKey() };
      const paramsHex = Buffer.from(JSON.stringify(base64Map), 'utf8').toString('hex');

      const dataHash = fid.dianPkey + fid.enclaveHash;
      const shuInfo = this.ctx.getAlgorithm().auditParam(this.ctx.getPrivateKey(), this.ctx.getPublicKey(), fid.dianPkey, fid.enclaveHash, dataHash);

      const url = `${this.ctx.getBaseUrl()}/api/get/${this.apiId}`;
      const headers = {
        'Content-Type': 'application/json',
        appCode: this.ctx.getAppCode(),
        credential: this.ctx.getPublicKey(),
        shuInfo: typeof shuInfo === 'string' ? shuInfo : JSON.stringify(shuInfo)
      };

      if (!fetchImpl) {
        // return constructed request when fetch not available
        return { url, method: 'GET', headers, params: { params: paramsHex } };
      }

      // append params as query param 'params'
      const reqUrl = `${url}?params=${encodeURIComponent(paramsHex)}`;
      const resp = await fetchImpl(reqUrl, { method: 'GET', headers });
      const text = await resp.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
      const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
      if (ok && parsed.data && parsed.data.encrypted_result) {
        const plain = await this.ctx.getAlgorithm().decryptMessage(this.ctx.getPrivateKey(), parsed.data.encrypted_result);
        return plain;
      }
      return text;
    } catch (e) {
      throw e;
    }
  }
}

module.exports = DSAPIClient;
