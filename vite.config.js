import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative, so the build runs from a domain root or a subpath alike.
  base: './',
  build: { outDir: 'dist', sourcemap: true }
});
