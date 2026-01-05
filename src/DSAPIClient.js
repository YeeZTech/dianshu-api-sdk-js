import * as credentialAdapter from './generated/CredentialAdapter.js';
import { bytesToHex, utf8ToBytes } from './utils/bytes.js';
import log from 'loglevel';

// resolve fetch similar to apiClient
let fetchImpl = null;
let fetchImplPromise = null;

async function getFetchImpl() {
  if (fetchImpl) return fetchImpl;
  if (fetchImplPromise) return fetchImplPromise;
  
  fetchImplPromise = (async () => {
    try {
      if (typeof fetch === 'function') {
        fetchImpl = fetch;
        return fetchImpl;
      }
    } catch (e) {}
    
    try {
      const nf = await import('node-fetch');
      fetchImpl = nf.default || nf;
      return fetchImpl;
    } catch (e) {
      return null;
    }
  })();
  
  return fetchImplPromise;
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
    const fetch = await getFetchImpl();
    if (!fetch) throw new Error('fetch implementation not available');
    const url = `${this.ctx.getBaseUrl()}/api/privateKey`;
    const body = { appCode: this.ctx.getAppCode(), apiId: this.apiId };

    log.debug('ensureFideliusConfig request', { url, body });

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text();
    log.debug('ensureFideliusConfig response', { status: res.status, text });
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { throw new Error('invalid fidelius config response: ' + text); }
    const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
    if (!ok) throw new Error('fidelius config error: ' + text);
    this.fideliusConfig = parsed.data;

    log.debug('ensureFideliusConfig ok', {
      apiHash: this.fideliusConfig && this.fideliusConfig.apiHash,
      dianPkey: this.fideliusConfig && (this.fideliusConfig.dianPkey),
      enclaveHash: this.fideliusConfig && (this.fideliusConfig.enclaveHash),
    });

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

      log.debug('doPost ctx', {
        apiId: this.apiId,
        appCode: this.ctx.getAppCode(),
        baseUrl: this.ctx.getBaseUrl(),
        publicKey: this.ctx.getPublicKey()),
      });
      log.debug('doPost paramDto', paramDto);

      // encrypt with public key
      const encryptedParamHex = await this.ctx.getAlgorithm().encryptMessage(this.ctx.getPublicKey(), jsonBody);
      if (!encryptedParamHex) {
        throw new Error('encryptMessage returned empty encryptedParamHex');
      }
      const base64Map = { encrypted_param: encryptedParamHex, shu_pkey: this.ctx.getPublicKey() };
      const paramsHex = bytesToHex(utf8ToBytes(JSON.stringify(base64Map)));

      const dataHash = fid.dianPkey + fid.enclaveHash;
      const shuInfo = await this.ctx.getAlgorithm().auditParam(this.ctx.getPrivateKey(), this.ctx.getPublicKey(), fid.dianPkey, fid.enclaveHash, dataHash);
      if (!shuInfo || (typeof shuInfo === 'object' && !shuInfo.encryptedShuPrivateKey)) {
        log.debug('doPost shuInfo empty/invalid', shuInfo);
        throw new Error('auditParam returned empty/invalid shuInfo (encryptedShuPrivateKey missing)');
      }

      const url = `${this.ctx.getBaseUrl()}/api/post/${this.apiId}`;
      const headers = {
        'Content-Type': 'application/json',
        appCode: this.ctx.getAppCode(),
        credential: this.ctx.getPublicKey(),
        shuInfo: typeof shuInfo === 'string' ? shuInfo : JSON.stringify(shuInfo)
      };

      log.debug('doPost encrypted', {
        encryptedParamHex: encryptedParamHex,
        paramsHex: paramsHex,
        shuInfo: headers.shuInfo,
      });
      log.debug('doPost request', {
        url,
        headers: { ...headers, credential: '[masked]', shuInfo: '[masked]' },
        body: { params: paramsHex },
      });

      const fetch = await getFetchImpl();
      if (!fetch) {
        // return constructed request when fetch not available
        return { url, method: 'POST', headers, body: { params: paramsHex } };
      }

      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ params: paramsHex }) });
      const text = await resp.text();
      log.debug('doPost response', { status: resp.status, text });
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
      const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
      if (ok && parsed.data && parsed.data.encrypted_result) {
        log.debug('doPost encrypted_result', parsed.data.encrypted_result);
        const plain = await this.ctx.getAlgorithm().decryptMessage(this.ctx.getPrivateKey(), parsed.data.encrypted_result);
        log.debug('doPost decrypted', typeof plain === 'string' ? plain.slice(0, 200) : plain);
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

      log.debug('doGet ctx', {
        apiId: this.apiId,
        appCode: this.ctx.getAppCode(),
        baseUrl: this.ctx.getBaseUrl(),
        publicKey: this.ctx.getPublicKey()),
      });
      log.debug('doGet paramDto', paramDto);
      // encrypt with public key
      const encryptedParamHex = await this.ctx.getAlgorithm().encryptMessage(this.ctx.getPublicKey(), jsonBody);
      if (!encryptedParamHex) {
        throw new Error('encryptMessage returned empty encryptedParamHex');
      }
      const base64Map = { encrypted_param: encryptedParamHex, shu_pkey: this.ctx.getPublicKey() };
      const paramsHex = bytesToHex(utf8ToBytes(JSON.stringify(base64Map)));

      const dataHash = fid.dianPkey + fid.enclaveHash;
      const shuInfo = await this.ctx.getAlgorithm().auditParam(this.ctx.getPrivateKey(), this.ctx.getPublicKey(), fid.dianPkey, fid.enclaveHash, dataHash);
      if (!shuInfo || (typeof shuInfo === 'object' && !shuInfo.encryptedShuPrivateKey)) {
        log.debug('doGet shuInfo empty/invalid', shuInfo);
        throw new Error('auditParam returned empty/invalid shuInfo (encryptedShuPrivateKey missing)');
      }

      const url = `${this.ctx.getBaseUrl()}/api/get/${this.apiId}`;
      const headers = {
        'Content-Type': 'application/json',
        appCode: this.ctx.getAppCode(),
        credential: this.ctx.getPublicKey(),
        shuInfo: typeof shuInfo === 'string' ? shuInfo : JSON.stringify(shuInfo)
      };

      log.debug('doGet encrypted', {
        encryptedParamHex: encryptedParamHex,
        paramsHex: paramsHex,
        shuInfo: headers.shuInfo,
      });
      log.debug('doGet request', {
        url,
        headers: { ...headers, credential: '[masked]', shuInfo: '[masked]' },
        query: { params: paramsHex },
      });

      const fetch = await getFetchImpl();
      if (!fetch) {
        // return constructed request when fetch not available
        return { url, method: 'GET', headers, params: { params: paramsHex } };
      }

      // append params as query param 'params'
      const reqUrl = `${url}?params=${encodeURIComponent(paramsHex)}`;
      const resp = await fetch(reqUrl, { method: 'GET', headers });
      const text = await resp.text();
      log.debug('doGet response', { status: resp.status, text });
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
      const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
      if (ok && parsed.data && parsed.data.encrypted_result) {
        log.debug('doGet encrypted_result', parsed.data.encrypted_result);
        const plain = await this.ctx.getAlgorithm().decryptMessage(this.ctx.getPrivateKey(), parsed.data.encrypted_result);
        log.debug('doGet decrypted', typeof plain === 'string' ? plain.slice(0, 200) : plain);
        return plain;
      }
      return text;
    } catch (e) {
      throw e;
    }
  }

  // -------------------------
  // Async API (two-step)
  // 1) /async/api/post|get/{apiId}  -> returns plaintext DSSeqNO
  // 2) /async/result/post/{apiId}  -> returns encrypted_result (needs decrypt)
  // -------------------------

  async doAsyncRequestPost(dto) {
    const fid = await this.ensureFideliusConfig();
    const bodyMap = {};
    if (dto && dto.bodyParams && Array.isArray(dto.bodyParams)) {
      dto.bodyParams.forEach(p => { bodyMap[p.paramName] = p.paramValue; });
    }
    const paramDto = { api_hash: fid.apiHash, api_method: 'POST', api_body: bodyMap };
    const jsonBody = JSON.stringify(paramDto);

    log.debug('doAsyncRequestPost paramDto', paramDto);

    const encryptedParamHex = await this.ctx.getAlgorithm().encryptMessage(this.ctx.getPublicKey(), jsonBody);
    if (!encryptedParamHex) throw new Error('encryptMessage returned empty encryptedParamHex');
    const base64Map = { encrypted_param: encryptedParamHex, shu_pkey: this.ctx.getPublicKey() };
    const paramsHex = bytesToHex(utf8ToBytes(JSON.stringify(base64Map)));

    const dataHash = fid.dianPkey + fid.enclaveHash;
    const shuInfo = await this.ctx.getAlgorithm().auditParam(this.ctx.getPrivateKey(), this.ctx.getPublicKey(), fid.dianPkey, fid.enclaveHash, dataHash);
    if (!shuInfo || (typeof shuInfo === 'object' && !shuInfo.encryptedShuPrivateKey)) {
      throw new Error('auditParam returned empty/invalid shuInfo (encryptedShuPrivateKey missing)');
    }

    const url = `${this.ctx.getBaseUrl()}/async/api/post/${this.apiId}`;
    const headers = {
      'Content-Type': 'application/json',
      appCode: this.ctx.getAppCode(),
      credential: this.ctx.getPublicKey(),
      shuInfo: typeof shuInfo === 'string' ? shuInfo : JSON.stringify(shuInfo)
    };

    log.debug('doAsyncRequestPost request', {
      url,
      headers: { ...headers, credential: '[masked]', shuInfo: '[masked]' },
      body: { params: paramsHex },
    });

    const fetch = await getFetchImpl();
    if (!fetch) return { url, method: 'POST', headers, body: { params: paramsHex } };
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ params: paramsHex }) });
    const text = await resp.text();
    log.debug('doAsyncRequestPost response', { status: resp.status, text });
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
    const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
    if (!ok) throw new Error('doAsyncRequestPost error: ' + text);
    const dsSeqNo = parsed && parsed.data && parsed.data.DSSeqNO;
    if (!dsSeqNo) throw new Error('doAsyncRequestPost missing DSSeqNO: ' + text);
    return dsSeqNo;
  }

  async doAsyncRequestGet(dto) {
    const fid = await this.ensureFideliusConfig();
    const paramMap = {};
    if (dto && dto.queryParams && Array.isArray(dto.queryParams)) {
      dto.queryParams.forEach(p => { paramMap[p.paramName] = p.paramValue; });
    }
    const paramDto = { api_hash: fid.apiHash, api_method: 'GET', api_param: paramMap };
    const jsonBody = JSON.stringify(paramDto);

    log.debug('doAsyncRequestGet paramDto', paramDto);

    const encryptedParamHex = await this.ctx.getAlgorithm().encryptMessage(this.ctx.getPublicKey(), jsonBody);
    if (!encryptedParamHex) throw new Error('encryptMessage returned empty encryptedParamHex');
    const base64Map = { encrypted_param: encryptedParamHex, shu_pkey: this.ctx.getPublicKey() };
    const paramsHex = bytesToHex(utf8ToBytes(JSON.stringify(base64Map)));

    const dataHash = fid.dianPkey + fid.enclaveHash;
    const shuInfo = await this.ctx.getAlgorithm().auditParam(this.ctx.getPrivateKey(), this.ctx.getPublicKey(), fid.dianPkey, fid.enclaveHash, dataHash);
    if (!shuInfo || (typeof shuInfo === 'object' && !shuInfo.encryptedShuPrivateKey)) {
      throw new Error('auditParam returned empty/invalid shuInfo (encryptedShuPrivateKey missing)');
    }

    const url = `${this.ctx.getBaseUrl()}/async/api/get/${this.apiId}`;
    const headers = {
      'Content-Type': 'application/json',
      appCode: this.ctx.getAppCode(),
      credential: this.ctx.getPublicKey(),
      shuInfo: typeof shuInfo === 'string' ? shuInfo : JSON.stringify(shuInfo)
    };

    const fetch = await getFetchImpl();
    if (!fetch) return { url, method: 'GET', headers, params: { params: paramsHex } };
    const reqUrl = `${url}?params=${encodeURIComponent(paramsHex)}`;
    log.debug('doAsyncRequestGet request', { url: reqUrl });
    const resp = await fetch(reqUrl, { method: 'GET', headers });
    const text = await resp.text();
    log.debug('doAsyncRequestGet response', { status: resp.status, text });
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
    const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
    if (!ok) throw new Error('doAsyncRequestGet error: ' + text);
    const dsSeqNo = parsed && parsed.data && parsed.data.DSSeqNO;
    if (!dsSeqNo) throw new Error('doAsyncRequestGet missing DSSeqNO: ' + text);
    return dsSeqNo;
  }

  async doAsyncResultPost(dsSeqNo, dto = {}) {
    if (!dsSeqNo) throw new Error('dsSeqNo required');
    const fid = await this.ensureFideliusConfig();

    // DSSeqNO needs to be included in encrypted params (bodyParams) AND also sent as plaintext field
    const bodyMap = {};
    const bodyParams = Array.isArray(dto.bodyParams) ? dto.bodyParams : [];
    bodyParams.concat([{ paramName: 'DSSeqNO', paramValue: dsSeqNo }]).forEach(p => { bodyMap[p.paramName] = p.paramValue; });

    const paramDto = { api_hash: fid.resultApiHash, api_method: 'POST', api_body: bodyMap };
    const jsonBody = JSON.stringify(paramDto);

    const encryptedParamHex = await this.ctx.getAlgorithm().encryptMessage(this.ctx.getPublicKey(), jsonBody);
    if (!encryptedParamHex) throw new Error('encryptMessage returned empty encryptedParamHex');
    const base64Map = { encrypted_param: encryptedParamHex, shu_pkey: this.ctx.getPublicKey() };
    const paramsHex = bytesToHex(utf8ToBytes(JSON.stringify(base64Map)));

    const dataHash = fid.dianPkey + fid.enclaveHash;
    const shuInfo = await this.ctx.getAlgorithm().auditParam(this.ctx.getPrivateKey(), this.ctx.getPublicKey(), fid.dianPkey, fid.enclaveHash, dataHash);
    if (!shuInfo || (typeof shuInfo === 'object' && !shuInfo.encryptedShuPrivateKey)) {
      throw new Error('auditParam returned empty/invalid shuInfo (encryptedShuPrivateKey missing)');
    }

    const url = `${this.ctx.getBaseUrl()}/async/result/post/${this.apiId}`;
    const headers = {
      'Content-Type': 'application/json',
      appCode: this.ctx.getAppCode(),
      credential: this.ctx.getPublicKey(),
      shuInfo: typeof shuInfo === 'string' ? shuInfo : JSON.stringify(shuInfo)
    };
    const body = { DSSeqNO: dsSeqNo, params: paramsHex };

    log.debug('doAsyncResultPost request', {
      url,
      body: { DSSeqNO: dsSeqNo, params: '[masked]' },
    });

    const fetch = await getFetchImpl();
    if (!fetch) return { url, method: 'POST', headers, body };
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await resp.text();
    log.debug('doAsyncResultPost response', { status: resp.status, text });
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
    const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100);
    if (!ok) return text;
    const enc = parsed && parsed.data && parsed.data.encrypted_result;
    if (!enc) return text;
    const plain = await this.ctx.getAlgorithm().decryptMessage(this.ctx.getPrivateKey(), enc);
    return plain;
  }

  // Alias for compatibility with existing calling style:
  // dto: { bodyParams: [ { paramName: 'DSSeqNO', paramValue: '...' }, ... ] }
  async doAsyncResult(dto) {
    const bodyParams = (dto && Array.isArray(dto.bodyParams)) ? dto.bodyParams : [];
    const dsParam = bodyParams.find(p => p && p.paramName === 'DSSeqNO');
    const dsSeqNo = dsParam && dsParam.paramValue;
    if (!dsSeqNo) throw new Error('doAsyncResult requires dto.bodyParams include DSSeqNO');
    // Avoid duplicating DSSeqNO when doAsyncResultPost injects it again
    const rest = bodyParams.filter(p => !(p && p.paramName === 'DSSeqNO'));
    return this.doAsyncResultPost(dsSeqNo, { ...dto, bodyParams: rest });
  }

  // Convenience: poll result API until success or timeout
  async pollAsyncResultPost(dsSeqNo, { loopTime = 15, intervalMs = 500 } = {}) {
    for (let i = 0; i < loopTime; i++) {
      const r = await this.doAsyncResultPost(dsSeqNo);
      // when not ready, server likely returns non-100 code; we return raw text then retry
      if (typeof r === 'string') {
        try {
          const parsed = JSON.parse(r);
          const ok = parsed && (parsed.code === 100 || parsed.resultCode === 100) && parsed.data && parsed.data.encrypted_result;
          if (!ok) {
            await new Promise(res => setTimeout(res, intervalMs));
            continue;
          }
        } catch {
          // non-json response, still retry
          await new Promise(res => setTimeout(res, intervalMs));
          continue;
        }
      }
      return r;
    }
    throw new Error(`pollAsyncResultPost timeout after ${loopTime} attempts`);
  }
}

export default DSAPIClient;
