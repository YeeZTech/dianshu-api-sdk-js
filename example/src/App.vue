<template>
  <div class="page">
    <h1>Dianshu API JS SDK Vue 示例</h1>

    <section class="card">
      <h2>POST 调用测试（与 test_dopost.js 相同的 key）</h2>
      <p class="desc">
        点击下方按钮，将通过 <code>dianshu-api-sdk</code> 调用典枢测试环境 POST 接口，
        使用与 <code>test/test_dopost.js</code> 中相同的 <code>appCode</code> 和 <code>apiId</code>。
      </p>

      <div class="field-row">
        <label>调用状态：</label>
        <span>{{ status }}</span>
      </div>

      <div class="actions">
        <button :disabled="loading" @click="handleCall">
          {{ loading ? '调用中…' : '发起调用' }}
        </button>
      </div>

      <div class="result" v-if="resultText">
        <h3>返回结果</h3>
        <pre>{{ resultText }}</pre>
      </div>

      <div class="result error" v-if="errorText">
        <h3>错误信息</h3>
        <pre>{{ errorText }}</pre>
      </div>
    </section>

    <section class="card">
      <h2>异步 API 调用测试（与 test_doasync.js 相同的 key）</h2>
      <p class="desc">
        点击下方按钮，将通过 <code>dianshu-api-sdk</code> 调用典枢测试环境异步接口，
        使用与 <code>test/test_doasync.js</code> 中相同的 <code>appCode</code> 和 <code>apiId</code>。
        会自动轮询结果接口，直到返回成功或超时。
      </p>

      <div class="field-row">
        <label>调用状态：</label>
        <span>{{ asyncStatus }}</span>
      </div>

      <div class="actions">
        <button :disabled="asyncLoading" @click="handleAsyncCall">
          {{ asyncLoading ? '调用中…' : '发起异步调用' }}
        </button>
      </div>

      <div class="result" v-if="asyncResultText">
        <h3>最终结果</h3>
        <pre>{{ asyncResultText }}</pre>
      </div>

      <div class="result error" v-if="asyncErrorText">
        <h3>错误信息</h3>
        <pre>{{ asyncErrorText }}</pre>
      </div>

      <div class="result" v-if="asyncLogs.length > 0">
        <h3>轮询日志</h3>
        <div class="log-container">
          <div
            v-for="(log, idx) in asyncLogs"
            :key="idx"
            class="log-item"
            :class="{ 'log-success': log.type === 'success', 'log-error': log.type === 'error' }"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DSAPIContext, DSAPIClient } from 'dianshu-api-sdk';

// Debug 模式控制（浏览器控制台可见）
// - DS_DEBUG: 打开流程日志（设为 '1' 或 'true' 开启，'0' 或 false 关闭）
// - DS_DEBUG_SECRETS: 打开敏感信息（私钥/密文/headers 全量）日志（设为 '1' 或 'true' 开启）
// 注意：生产环境建议关闭 debug，避免暴露敏感信息
// (globalThis as any).DS_DEBUG = '1';
// (globalThis as any).DS_DEBUG_SECRETS = '0';

// 与 test/test_dopost.js 保持一致的写死配置
const APP_CODE = '9c499056245d4915b77b8500e7d1b805';
const BASE_URL = 'https://test-data-api.dianshudata.com';
const API_ID = '8Sr4FxTgp561675MWRmQzhaA9QWkJKFPHXjGsL6vgQZ5';
// 异步 API 的 apiId（与 test_doasync.js 一致）
const ASYNC_API_ID = 'AtZuvMKVp2Qf94mPbB126JWJXpiLRkwyKGGoCXtmPDuX';

const status = ref('未调用');
const loading = ref(false);
const resultText = ref('');
const errorText = ref('');

// 异步 API 相关状态
const asyncStatus = ref('未调用');
const asyncLoading = ref(false);
const asyncResultText = ref('');
const asyncErrorText = ref('');
const asyncLogs = ref<Array<{ time: string; message: string; type?: 'success' | 'error' }>>([]);

async function handleCall() {
  loading.value = true;
  status.value = '调用中';
  resultText.value = '';
  errorText.value = '';

  try {
    const ctx = new DSAPIContext(APP_CODE, BASE_URL);
    const client = new DSAPIClient(API_ID, ctx);

    const dto = {
      bodyParams: [{ paramName: 'name', paramValue: '张三' }]
    };

    const result = await client.doPost(dto);
    status.value = '调用成功';
    try {
      // 尝试格式化为 JSON，便于阅读
      resultText.value =
        typeof result === 'string'
          ? result
          : JSON.stringify(result, null, 2);
    } catch {
      resultText.value = String(result);
    }
  } catch (e: any) {
    status.value = '调用失败';
    errorText.value = e?.message || String(e);
  } finally {
    loading.value = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function tryParsePossiblyEscapedJson(input: any): any {
  if (typeof input !== 'string') return null;
  // 1) normal JSON
  try {
    const v = JSON.parse(input);
    // Sometimes backend returns a JSON-string-wrapped JSON object
    if (typeof v === 'string') {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
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

  if (input.includes('\\\"')) {
    try {
      const unescaped = input.replace(/\\\"/g, '"').replace(/\\n/g, '\n');
      return JSON.parse(unescaped);
    } catch {}
  }

  return null;
}

function addLog(message: string, type?: 'success' | 'error') {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  asyncLogs.value.push({ time, message, type });
}

async function handleAsyncCall() {
  asyncLoading.value = true;
  asyncStatus.value = '调用中';
  asyncResultText.value = '';
  asyncErrorText.value = '';
  asyncLogs.value = [];

  try {
    const ctx = new DSAPIContext(APP_CODE, BASE_URL);
    const client = new DSAPIClient(ASYNC_API_ID, ctx);

    // 第一步：调用异步请求接口，获取 DSSeqNO
    addLog('发起异步请求...');
    const requestDto = {
      bodyParams: [{ paramName: 'name', paramValue: '张三' }]
    };
    const dsSeqNo = await client.doAsyncRequestPost(requestDto);
    addLog(`获取到 DSSeqNO: ${dsSeqNo}`);

    // 第二步：轮询结果接口
    const loopTime = 15;
    const intervalMs = 5000;

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
              addLog(`轮询 ${i + 1}/${loopTime}: 处理中 (code=102)`);
              await sleep(intervalMs);
              continue;
            }

            // 成功：直接结束（后端常见返回 code=200；也兼容 code=100）
            if (code === 200 || code === 100) {
              addLog(`轮询 ${i + 1}/${loopTime}: 成功 (code=${code})`, 'success');
              asyncStatus.value = '调用成功';
              try {
                asyncResultText.value =
                  typeof result === 'string'
                    ? result
                    : JSON.stringify(result, null, 2);
              } catch {
                asyncResultText.value = String(result);
              }
              return;
            }

            // 其他 code：直接打印并结束，避免无限轮询
            if (typeof code !== 'undefined') {
              addLog(`轮询 ${i + 1}/${loopTime}: 完成 (code=${code})`);
              asyncStatus.value = '调用完成';
              try {
                asyncResultText.value =
                  typeof result === 'string'
                    ? result
                    : JSON.stringify(result, null, 2);
              } catch {
                asyncResultText.value = String(result);
              }
              return;
            }
          }
        }

        // 如果返回的不是预期的格式，也直接结束
        addLog(`轮询 ${i + 1}/${loopTime}: 完成`, 'success');
        asyncStatus.value = '调用成功';
        try {
          asyncResultText.value =
            typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2);
        } catch {
          asyncResultText.value = String(result);
        }
        return;
      } catch (e: any) {
        addLog(`轮询 ${i + 1}/${loopTime} 错误: ${e?.message || String(e)}`, 'error');
        await sleep(intervalMs);
      }
    }

    throw new Error(`异步结果未就绪，已尝试 ${loopTime} 次`);
  } catch (e: any) {
    asyncStatus.value = '调用失败';
    asyncErrorText.value = e?.message || String(e);
    addLog(`调用失败: ${e?.message || String(e)}`, 'error');
  } finally {
    asyncLoading.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 40px 24px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    'Segoe UI', sans-serif;
  background: radial-gradient(circle at top, #f5f7ff 0, #f9fafb 40%, #ffffff 100%);
  color: #111827;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
}

.card {
  max-width: 720px;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px 24px 20px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.3);
}

h2 {
  font-size: 18px;
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  color: #4b5563;
  margin-bottom: 16px;
}

.field-row {
  font-size: 14px;
  margin-bottom: 12px;
}

.field-row label {
  color: #6b7280;
  margin-right: 4px;
}

.actions {
  margin: 16px 0 12px;
}

button {
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
  transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.08s ease;
}

button:hover:enabled {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(37, 99, 235, 0.35);
}

button:active:enabled {
  transform: translateY(0);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.28);
}

button:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

.result {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.result h3 {
  font-size: 14px;
  margin-bottom: 4px;
}

.result pre {
  max-height: 260px;
  overflow: auto;
  background: #0b1120;
  color: #e5e7eb;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
}

.result.error pre {
  background: #450a0a;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  background: rgba(15, 23, 42, 0.04);
  padding: 1px 4px;
  border-radius: 4px;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: #0b1120;
  border-radius: 10px;
  padding: 12px;
  font-size: 12px;
}

.log-item {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: #e5e7eb;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #9ca3af;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  min-width: 80px;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.log-item.log-success .log-message {
  color: #34d399;
}

.log-item.log-error .log-message {
  color: #f87171;
}
</style>


