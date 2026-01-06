import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite config only; types may be absent depending on install resolution
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Vite + Vue 配置，用于在浏览器环境试跑 SDK
export default defineConfig({
  plugins: [
    vue(),
  ],
  build: {
    rollupOptions: {
      // 浏览器环境不需要 node-fetch（SDK 会使用原生 fetch），构建时 externalize 避免 polyfill 冲突
      external: ['node-fetch'],
    },
  },
});


