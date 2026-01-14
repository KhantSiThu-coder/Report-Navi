
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import EnvironmentPlugin from 'vite-plugin-environment';

export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin(['SUPABASE_URL', 'SUPABASE_KEY'])
  ],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
