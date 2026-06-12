import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas para que el build funcione en cualquier URL
  // (Vercel, Hugging Face Spaces, abrir dist/index.html directo, etc.).
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
