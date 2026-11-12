import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const clientDir = __dirname;
  const rootDir = path.resolve(__dirname, '..');
  const serverDir = path.resolve(rootDir, 'server');

  const hasClientEnv = fs.existsSync(path.join(clientDir, '.env'));
  const envDir = hasClientEnv ? clientDir : rootDir;

  const rootEnv = loadEnv(mode, rootDir, '');
  const serverEnv = loadEnv(mode, serverDir, '');
  const apiPort = serverEnv.PORT || rootEnv.PORT || 5000;

  return {
    plugins: [react()],
    envDir,
    // Expose only public Supabase keys alongside VITE_ variables; never expose service role or Gemini keys.
    envPrefix: ['VITE_', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            ui: ['lucide-react', 'dompurify'],
          },
        },
      },
    },
  };
});
