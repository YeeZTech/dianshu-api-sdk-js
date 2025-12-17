# Dianshu JS SDK (generated skeleton)

这是为 `dianshu-api-vue-sdk` 中生成的 JS SDK 起始骨架。此版本提供：

- `src/crypto.js`：加解密封装，优先使用外部 `libspec` 包（如果安装），否则回退到 Node 内置的 AES-256-GCM 实现。
- `src/apiClient.js`：API 客户端骨架（包含请求构建和可选加密示例）。
- `src/index.js`：导出入口。
- `test/run.js`：快速自测脚本，验证加/解密能否正确回环。


快速开始：

1. 安装依赖：

```bash
npm install
```

2. 使用示例（与 Java SDK 的 Test.main 等价）

保存为 `examples/usage.js` 并运行：

```bash
node examples/usage.js
```

示例（Node/CommonJS）：

```javascript
const { DSAPIContext, DSAPIClient } = require('./src');

async function main() {
	const ctx = new DSAPIContext('你的appCode', 'https://test-data-api.dianshudata.com');
	// 可选：提前初始化以避免首次调用的额外网络延迟
	const client = new DSAPIClient('你的apiId', ctx);
	await client.init(); // 可省略，客户端会在首次调用时自动懒加载

	const dto = { bodyParams: [ { paramName: 'name', paramValue: '张三' } ] };
	const result = await client.doPost(dto);
	console.log('接口返回结果:', result);
}

main();
```


说明与下一步：

- 当前骨架不包含从 Java SDK 自动生成的 API 对应实现（因为未能读取到 `dianshu-api-sdk` 源码）。如需完整映射，请提供 `dianshu-api-sdk` 项目源码或 Git 仓库地址及分支（你提到的 `develop_2.9.2`），我会从 Java 类签名生成对应的 JS 接口实现与类型注释。
- 如果你希望强制使用 `libspec` 的 API（而不是回退实现），请把 `libspec` 的 npm 包名与其加/解密 API 说明发给我，或在工程中安装该包后我会调整 `src/crypto.js` 以使用正确的调用方式。

如果准备好了我会继续：
1) 读取 `dianshu-api-sdk` 的 Java 源（或提供路径/仓库），
2) 分析关键类和方法，
3) 自动生成对应的 JS API 层并添加更完整的测试。
