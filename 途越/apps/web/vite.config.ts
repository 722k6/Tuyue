import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  server: {
    // 固定监听 IPv4：默认的 'localhost' 在本机会只解析到 ::1，
    // 和 Playwright 的就绪探测（走 127.0.0.1）对不上，E2E 会一直等超时。
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
