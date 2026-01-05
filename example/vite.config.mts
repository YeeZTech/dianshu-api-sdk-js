import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite config only; types may be absent depending on install resolution
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Vite + Vue 配置，用于在浏览器环境试跑 SDK
export default defineConfig({
  plugins: [
    vue(),
    // meta-encryptor -> keccak256 -> keccak/readable-stream 会触发 Node core 模块 (buffer/events/util/stream)
    // 用 polyfills 保证在浏览器下也可运行（与 meta-encryptor 的 _try 示例一致的思路）
    // nodePolyfills({
    //   protocolImports: true,
    //   // 关键：不要让插件把 `buffer` 模块重定向到它自己的 shim（会导致 CJS 包 `require('buffer').Buffer` 变 undefined）
    //   // Buffer 全局由 index.html 里手动注入（与 _try demo 一致）
    //   globals: {
    //     Buffer: false,
    //     global: true,
    //     process: true,
    //   },
    // }),
  ],
  define: {
    // dianshu-api-js-sdk 内部使用了 process 环境变量，这里做个最小 polyfill
    'process.env': {}
  },
  optimizeDeps: {
    // 确保 CommonJS 模块被正确处理
    include: ['dianshu-api-js-sdk']
  },
  build: {
    rollupOptions: {
      // 浏览器环境不需要 node-fetch（SDK 会使用原生 fetch），构建时 externalize 避免 polyfill 冲突
      external: ['node-fetch'],
    },
  },
});


