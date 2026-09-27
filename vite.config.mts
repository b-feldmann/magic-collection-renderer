/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base keeps asset paths portable (needed for the Electron build,
  // which historically relied on CRA's `homepage: "."`).
  base: './',
  server: {
    port: 3000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts'
  }
});
