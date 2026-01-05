import { describe, it, expect } from '@jest/globals';
import { DSAPIContext, DSAPIClient } from '../src/index.js';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function tryParsePossiblyEscapedJson(input) {
  if (typeof input !== 'string') return null;
  // 1) normal JSON
  try {
    const v = JSON.parse(input);
    // Sometimes backend returns a JSON-string-wrapped JSON object
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  } catch {}

  // 2) string contains \" style escapes without outer quotes
  //    Example: {\"code\":102,\"desc\":\"processing\"}
  if (input.includes('\\"') || input.includes('\\\"')) {
    try {
      const unescaped = input.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      return JSON.parse(unescaped);
    } catch {}
  }

  // 3) string contains \" but not \\"
  if (input.includes('\\"') === false && input.includes('\\"') === false && input.includes('\\"') === false && input.includes('\\"') === false) {
    // no-op
  }

  if (input.includes('\\\"')) {
    try {
      const unescaped = input.replace(/\\\"/g, '"').replace(/\\n/g, '\n');
      return JSON.parse(unescaped);
    } catch {}
  }

  return null;
}

describe('doAsync integration test', () => {
  it('should perform async request and poll result', async () => {
    // 复用 test_dopost.js 的默认配置（也可以用环境变量覆盖）
    const appCode = process.env.DS_APP_CODE || '9c499056245d4915b77b8500e7d1b805';
    const baseUrl = process.env.DS_BASE_URL || 'https://test-data-api.dianshudata.com';
    // 按你提供的异步 API 示例默认 apiId（可用 DS_API_ID 覆盖）
    const apiId = process.env.DS_API_ID || 'AtZuvMKVp2Qf94mPbB126JWJXpiLRkwyKGGoCXtmPDuX';

    const ctx = new DSAPIContext(appCode, baseUrl);
    const client = new DSAPIClient(apiId, ctx);

    // 如果指定 DS_SEQNO，则只走"结果接口"（用于你提供的第二段脚本场景）
    const presetSeq = process.env.DS_SEQNO;
    if (presetSeq) {
      const dto = { bodyParams: [ { paramName: 'DSSeqNO', paramValue: presetSeq } ] };
      const result = await client.doAsyncResult(dto);
      console.log('result:', result);
      expect(result).toBeDefined();
      return;
    }

    // 否则走完整流程：请求接口拿 DSSeqNO → 轮询结果接口
    const requestDto = { bodyParams: [ { paramName: 'name', paramValue: '张三' } ] };
    const dsSeqNo = await client.doAsyncRequestPost(requestDto);
    console.log('DSSeqNO:', dsSeqNo);
    expect(dsSeqNo).toBeDefined();

    // 第二步：轮询结果接口（返回 encrypted_result，需要解密）
    const loopTime = Number(process.env.DS_ASYNC_LOOP_TIME || 15);
    const intervalMs = Number(process.env.DS_ASYNC_INTERVAL_MS || 5000);

    for (let i = 0; i < loopTime; i++) {
      try {
        const result = await client.doAsyncResultPost(dsSeqNo);
        // 轮询结果接口：processing 时一般返回 code=102；成功时常见 code=200（也可能是 100）
        if (typeof result === 'string') {
          const parsed = tryParsePossiblyEscapedJson(result);
          if (parsed && typeof parsed === 'object') {
            const code = parsed.code ?? parsed.resultCode;
            // 处理中：继续轮询
            if (code === 102) {
              console.log(`Poll ${i + 1}/${loopTime}: processing ->`, result);
              await sleep(intervalMs);
              continue;
            }

            // 成功：直接结束（后端常见返回 code=200；也兼容 code=100）
            if (code === 200 || code === 100) {
              console.log(`Poll ${i + 1}/${loopTime}: success ->`, result);
              expect(result).toBeDefined();
              return;
            }

            // 其他 code：直接打印并结束，避免无限轮询
            if (typeof code !== 'undefined') {
              console.log(`Poll ${i + 1}/${loopTime}: done(code=${code}) ->`, result);
              expect(result).toBeDefined();
              return;
            }
          }
        }

        console.log(`Poll ${i + 1}/${loopTime}: final ->`, result);
        expect(result).toBeDefined();
        return;
      } catch (e) {
        console.error(`Poll ${i + 1}/${loopTime} error:`, e && e.message ? e.message : e);
        await sleep(intervalMs);
      }
    }

    throw new Error(`Async result not ready after ${loopTime} attempts`);
  });
});
