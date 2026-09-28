/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base keeps asset paths portable (needed for the Electron build,
  // which historically relied on CRA's `homepage: "."`).
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Split large, stable vendor code into their own chunks so browser
        // caching survives app-code changes.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('/react-dom/') || id.includes('/react/')) return 'react';
            if (id.includes('/antd/') || id.includes('/@ant-design/')) return 'antd';
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 3000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts'
  }
});
