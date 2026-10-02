import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    allowedHosts: ['.v3c.dev'],
    watch: {
      usePolling: true,
    }
  },
  publicDir: 'public',
});
