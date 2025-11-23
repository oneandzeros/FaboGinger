import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  base: './', // 使用相对路径，确保在 Electron 中正确加载资源
  build: {
    outDir: 'dist-react',
    assetsDir: 'assets',
  },
});
