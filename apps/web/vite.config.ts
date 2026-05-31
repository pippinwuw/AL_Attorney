import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { materialAssetsPlugin } from './src/plugins/materialAssetsPlugin';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const materialDir = fileURLToPath(new URL('../../material', import.meta.url));

export default defineConfig({
  envDir: rootDir,
  plugins: [react(), materialAssetsPlugin(materialDir)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
