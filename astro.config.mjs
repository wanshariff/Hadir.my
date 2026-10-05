import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// Static output: invite pages are pre-rendered and cached at the edge.
// Dynamic routes live in /functions (Cloudflare Pages Functions).
// PUBLIC_PREVIEW=1 builds a self-contained click-through preview (mock API, Google Fonts) into dist-preview.
const preview = process.env.PUBLIC_PREVIEW === '1';

export default defineConfig({
  site: 'https://hadir.my',
  output: 'static',
  trailingSlash: 'never',
  outDir: preview ? './dist-preview' : './dist',
  build: { format: 'file', inlineStylesheets: preview ? 'always' : 'auto' },
  integrations: preview
    ? [{
        name: 'hadir-preview-hub',
        hooks: { 'astro:config:setup': ({ injectRoute }) => injectRoute({ pattern: '/preview', entrypoint: './src/preview/Hub.astro' }) },
      }]
    : [],
  vite: {
    resolve: {
      alias: {
        '@hadir/fonts': fileURLToPath(new URL(preview ? './src/styles/fonts-none.css' : './src/styles/fonts.css', import.meta.url)),
      },
    },
  },
});
