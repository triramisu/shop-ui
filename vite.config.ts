import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Trong môi trường dev, proxy mọi lời gọi /api sang backend Spring để tránh
// cấu hình CORS phức tạp. Khi chạy sau nginx (prod/lab) frontend và API cùng
// origin nên không cần proxy.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget =
    process.env.VITE_DEV_API_TARGET ??
    env.VITE_DEV_API_TARGET ??
    'http://localhost:8080';
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/actuator': { target: apiTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
