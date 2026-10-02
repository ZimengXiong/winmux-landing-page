import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [{
    name: 'inline-winmux-artwork',
    transformIndexHtml(html) {
      const artwork = readFileSync(new URL('./artwork/winmux-overview.svg', import.meta.url), 'utf8');
      return html.replace('<!-- winmux-artwork -->', artwork);
    },
  }],
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
