import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5192,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3024',
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
