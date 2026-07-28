import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'build'
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      '/exist': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    ui: false,
    setupFiles: './src/setupTests.ts'
  }
});


