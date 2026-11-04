import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  server: {
    // 与 apps/web 保持一致：固定 IPv4，避免本地 E2E 就绪探测等不到服务。
    host: '127.0.0.1',
    port: 5174,
    // 代理目标用 127.0.0.1 而不是 localhost：避免 Node 把 localhost
    // 解析到 ::1、而 API 只监听 IPv4 时出现随机 502。
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
