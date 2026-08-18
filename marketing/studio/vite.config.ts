import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.GEMINI_API_KEY || env.API_KEY || '';
    return {
      base: '/marketing/studio/',
      build: {
        outDir: '../../public/marketing/studio',
        emptyOutDir: true,
      },
      server: {
        port: 3009,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
