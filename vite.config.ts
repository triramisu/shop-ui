import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { resolveBuildEnvironment } from './build/environment';

// Trong môi trường dev, proxy mọi lời gọi /api sang backend Spring để tránh
// cấu hình CORS phức tạp. Khi chạy sau nginx (prod/lab) frontend và API cùng
// origin nên không cần proxy.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const { devApiTarget } = resolveBuildEnvironment(command, mode, env);
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 5173,
      proxy: devApiTarget ? {
        '/api': { target: devApiTarget, changeOrigin: true },
        '/actuator': { target: devApiTarget, changeOrigin: true },
      } : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
