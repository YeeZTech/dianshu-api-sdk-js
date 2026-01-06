# Dianshu API JS SDK

典枢数据平台 API 的 JavaScript SDK，支持浏览器和 Node.js 环境。

## 安装

```bash
npm install @yeez-tech/dianshu-api-sdk
```

### 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0

## 快速开始

### 获取凭证

在使用 SDK 之前，你需要获取以下凭证：

- **appCode**: 应用代码，用于标识你的应用
- **apiCode**: API 标识，用于标识要调用的具体 API

> 📖 详细获取方式请参考：[如何获取 appCode 和 apiCode](https://help.yeez.tech/docs/bu-zhou-wu-xia-zai-shu-ju)

### 1. 初始化上下文和客户端

#### 测试环境

```javascript
import { DSAPIContext, DSAPIClient } from "@yeez-tech/dianshu-api-sdk";

// 测试环境需要指定 baseUrl
const ctx = new DSAPIContext(
  "你的appCode",
  "https://test-data-api.dianshudata.com"
);
const client = new DSAPIClient("你的apiCode", ctx);
```

#### 正式环境

```javascript
import { DSAPIContext, DSAPIClient } from "@yeez-tech/dianshu-api-sdk";

// 正式环境不需要传入 baseUrl，使用默认值
const ctx = new DSAPIContext("你的appCode");
const client = new DSAPIClient("你的apiCode", ctx);
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

### 5. 共享 Context 和并发调用

多个 `DSAPIClient` 可以共享同一个 `DSAPIContext`，这样可以复用密钥对和加密算法，提高效率。多个 `DSAPIClient` 可以并发调用。

```javascript
// 共享同一个 Context（测试环境示例）
const ctx = new DSAPIContext("你的appCode", "https://test-data-api.dianshudata.com");
// 正式环境：const ctx = new DSAPIContext("你的appCode");

// 创建多个客户端，使用不同的 apiCode
const client1 = new DSAPIClient("apiCode1", ctx);
const client2 = new DSAPIClient("apiCode2", ctx);
const client3 = new DSAPIClient("apiCode3", ctx);

// 可以并发调用
const [result1, result2, result3] = await Promise.all([
  client1.doPost({ bodyParams: [...] }),
  client2.doGet({ queryParams: [...] }),
  client3.doAsyncRequestPost({ bodyParams: [...] })
]);
```

## API 说明

### DSAPIContext

应用上下文，管理密钥对和加密算法。

```javascript
// 测试环境
const ctx = new DSAPIContext(appCode, baseUrl);

// 正式环境
const ctx = new DSAPIContext(appCode);
```

- `appCode`: 应用代码（必填）
- `baseUrl`: API 基础地址（可选）
  - 测试环境：`https://test-data-api.dianshudata.com`
  - 正式环境：不传此参数，使用默认值 `https://data-api.dianshudata.com`

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

### Node.js

- **版本要求**: >= 18.0.0
- **模块格式**: 支持 CommonJS 和 ESM
- **依赖**: SDK 会自动安装所需依赖，包括 `@yeez-tech/meta-encryptor`、`buffer`、`loglevel` 等

### 浏览器

- **版本要求**: 需要支持全局 `fetch` API 的浏览器
- **支持的浏览器**:
  - Chrome 42+
  - Firefox 39+
  - Safari 10.1+
  - Edge 14+
  - Opera 29+
- **依赖**: SDK 的 browser 构建版本已包含必要的 polyfills，通常无需额外配置

## License

MIT
