import { defineConfig } from 'astro/config';

// Static output: invite pages are pre-rendered and cached at the edge.
// Dynamic routes live in /functions (Cloudflare Pages Functions).
export default defineConfig({
  site: 'https://hadir.my',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
