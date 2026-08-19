import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const rootEnv = loadEnv(mode, path.resolve(__dirname, '../../'), '');
    const localEnv = loadEnv(mode, '.', '');
    const apiKey = localEnv.GEMINI_API_KEY || localEnv.API_KEY || rootEnv.GEMINI_API_KEY || rootEnv.API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    return {
      base: '/marketing/remodeling/',
      build: {
        outDir: '../../public/marketing/remodeling',
        emptyOutDir: true,
      },
      server: {
        port: 3007,
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
