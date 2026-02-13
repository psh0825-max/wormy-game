import { defineConfig } from 'vite';

export default defineConfig({
  base: '/wormy-game/',
  server: {
    host: true,
  },
  build: {
    target: 'es2020',
  },
});
