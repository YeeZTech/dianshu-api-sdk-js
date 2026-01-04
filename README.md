# Dianshu API JS SDK

典枢数据平台 API 的 JavaScript SDK，支持浏览器和 Node.js 环境。

## 安装

```bash
npm install dianshu-api-js-sdk
```

## 快速开始

### 1. 初始化上下文和客户端

```javascript
import { DSAPIContext, DSAPIClient } from "dianshu-api-js-sdk";

const ctx = new DSAPIContext(
  "你的appCode",
  "https://test-data-api.dianshudata.com"
);
const client = new DSAPIClient("你的apiId", ctx);
```

### 2. 同步调用（POST）

```javascript
const dto = {
  bodyParams: [{ paramName: "name", paramValue: "张三" }],
};

const result = await client.doPost(dto);
console.log("返回结果:", result);
```

### 3. 同步调用（GET）

```javascript
const dto = {
  queryParams: [{ paramName: "id", paramValue: "123" }],
};

const result = await client.doGet(dto);
console.log("返回结果:", result);
```

### 4. 异步调用

异步调用分为两步：先提交请求获取 `DSSeqNO`，然后轮询结果接口。

#### 方式一：手动轮询

```javascript
// 第一步：提交异步请求，获取 DSSeqNO
const requestDto = {
  bodyParams: [{ paramName: "name", paramValue: "张三" }],
};
const dsSeqNo = await client.doAsyncRequestPost(requestDto);
console.log("DSSeqNO:", dsSeqNo);

// 第二步：轮询结果接口
const loopTime = 15; // 最多轮询次数
const intervalMs = 5000; // 轮询间隔（毫秒）

for (let i = 0; i < loopTime; i++) {
  const result = await client.doAsyncResultPost(dsSeqNo);

  // 判断结果状态
  if (typeof result === "string") {
    const parsed = JSON.parse(result);
    const code = parsed.code ?? parsed.resultCode;

    if (code === 102) {
      // 处理中，继续轮询
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      continue;
    }

    if (code === 200 || code === 100) {
      // 成功，返回结果
      console.log("最终结果:", result);
      break;
    }
  }

  // 其他情况直接返回
  console.log("最终结果:", result);
  break;
}
```

#### 方式二：查询已有 DSSeqNO 的结果

如果已有 `DSSeqNO`，可以直接查询结果：

```javascript
const dto = {
  bodyParams: [{ paramName: "DSSeqNO", paramValue: "你的DSSeqNO" }],
};
const result = await client.doAsyncResult(dto);
console.log("结果:", result);
```

## API 说明

### DSAPIContext

应用上下文，管理密钥对和加密算法。

```javascript
const ctx = new DSAPIContext(appCode, baseUrl);
```

- `appCode`: 应用代码
- `baseUrl`: API 基础地址（如：`https://test-data-api.dianshudata.com`）

### DSAPIClient

API 客户端，提供同步和异步调用方法。

#### 同步方法

- `doPost(dto)`: POST 请求
  - `dto.bodyParams`: 请求体参数数组，格式：`[{ paramName, paramValue }, ...]`
- `doGet(dto)`: GET 请求
  - `dto.queryParams`: 查询参数数组，格式：`[{ paramName, paramValue }, ...]`

#### 异步方法

- `doAsyncRequestPost(dto)`: 提交异步 POST 请求，返回 `DSSeqNO`
- `doAsyncRequestGet(dto)`: 提交异步 GET 请求，返回 `DSSeqNO`
- `doAsyncResultPost(dsSeqNo, dto)`: 查询异步结果（POST 方式）
- `doAsyncResult(dto)`: 查询异步结果（兼容方法，从 `dto.bodyParams` 中提取 `DSSeqNO`）

## 环境支持

- **Node.js**: 支持 CommonJS 和 ESM
- **浏览器**: 支持现代浏览器（需要全局 `fetch` API）

## License

MIT
