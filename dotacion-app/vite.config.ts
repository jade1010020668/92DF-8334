import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas para que el build funcione en cualquier URL
  // (Vercel, Hugging Face Spaces, abrir dist/index.html directo, etc.).
  base: './',
  plugins: [react()],
  test: {
    // Por defecto node (rápido, para la lógica pura). Los tests de componentes
    // (.tsx en __ui__) corren en jsdom para tener DOM.
    environment: 'node',
    environmentMatchGlobs: [['src/**/__ui__/**', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
