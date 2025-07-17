import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8765,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.js', '.json']
  }
});