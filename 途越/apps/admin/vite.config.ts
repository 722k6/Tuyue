import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  server: {
    // 与 apps/web 保持一致：固定 IPv4，避免本地 E2E 就绪探测等不到服务。
    host: '127.0.0.1',
    port: 5174,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
