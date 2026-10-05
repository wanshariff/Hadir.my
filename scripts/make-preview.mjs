// Turns the PUBLIC_PREVIEW build (dist-preview/) into a self-contained static bundle (preview-site/)
// that runs inside a sandboxed host serving files from a sub-path:
//  - each page's module script is bundled to one inline IIFE (no cross-file imports),
//  - root-absolute URLs become relative (the site isn't served at /),
//  - the home page is index.html, and again as main.html with no document skeleton for hosts that wrap the main page.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'dist-preview';
const OUT = 'preview-site';

// Every built page keeps its path. The home page is the root (index.html); the screen directory is preview.html.
function htmlFiles(dir, base = '') {
  return readdirSync(join(dir, base), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? htmlFiles(dir, join(base, d.name)) : d.name.endsWith('.html') ? [join(base, d.name)] : []);
}
const PAGES = Object.fromEntries(htmlFiles(SRC).map((f) => [f, f]));
const ROUTES = { '/': 'index.html', '/preview': 'preview.html' };
const STATIC = ['favicon.svg', ...readdirSync(SRC).filter((f) => f.endsWith('.ics'))];

function mapPath(abs) {
  const [path, rest = ''] = abs.split(/(?=[?#])/);
  if (path in ROUTES) return ROUTES[path] + rest;
  const clean = path.replace(/^\//, '');
  return (/\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}.html`) + rest;
}

async function inlineScripts(html) {
  const re = /<script type="module" src="(\/_astro\/[^"]+)"><\/script>/g;
  let out = html;
  for (const [tag, src] of html.matchAll(re)) {
    const res = await build({ entryPoints: [join(SRC, src)], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' });
    const code = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    out = out.replace(tag, `<script>${code}</script>`);
  }
  if (/<script[^>]+src="\/_astro/.test(out)) throw new Error('unbundled script left');
  return out;
}

function relativise(html, publishedPath) {
  const depth = publishedPath.split('/').length - 1;
  const up = depth ? '../'.repeat(depth) : './';
  // An empty mapped path is the main page: "./" at the root, "../" one level down.
  return html.replace(/(\s(?:href|src|data-ics)=")(\/(?!\/)[^"]*)"/g, (_, attr, abs) => `${attr}${(depth ? up : '') + mapPath(abs) || './'}"`);
}

function stripSkeleton(html) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>/, '')
    .replace(/<meta name="viewport"[^>]*>/, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  const lang = html.match(/<html lang="([^"]+)"/)?.[1] ?? 'ms';
  return `${head}\n<script>document.documentElement.lang=${JSON.stringify(lang)}</script>\n${body}`;
}

rmSync(OUT, { recursive: true, force: true });
for (const [src, dest] of Object.entries(PAGES)) {
  let html = readFileSync(join(SRC, src), 'utf8');
  html = await inlineScripts(html);
  html = relativise(html, dest);
  mkdirSync(dirname(join(OUT, dest)), { recursive: true });
  writeFileSync(join(OUT, dest), html);
  // Hosts that wrap the main page themselves get the home page without its document skeleton.
  if (dest === 'index.html') writeFileSync(join(OUT, 'main.html'), stripSkeleton(html));
}
for (const f of STATIC) if (existsSync(join(SRC, f))) copyFileSync(join(SRC, f), join(OUT, f));
writeFileSync(join(OUT, '.nojekyll'), ''); // serve files as-is on GitHub Pages
console.log(`preview-site: ${Object.keys(PAGES).length} pages`);
