import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Mantém os caminhos relativos para funcionar perfeitamente em qualquer URL do GitHub Pages
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
