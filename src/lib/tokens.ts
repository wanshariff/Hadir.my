// Build-time reader for src/styles/tokens.css, so /design always shows the real values.
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

// Resolved from the project root: builds and tests both run there, and bundling moves this module.
const css = readFileSync(resolvePath(process.cwd(), 'src/styles/tokens.css'), 'utf8');

export const SCALES = ['brand', 'secondary', 'neutral', 'success', 'info', 'warning', 'error'] as const;
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export const primitives: Record<string, string> = {};
for (const m of css.matchAll(/--color-([a-z]+-\d+):\s*(#[0-9a-f]{6})/gi)) primitives[m[1]] = m[2].toLowerCase();

/** Resolve a token value like `var(--color-brand-500)`, `#ffffff` or `rgb(255 255 255 / 0.8)` to opaque hex. */
export function resolve(value: string, over = '#ffffff'): string {
  const v = value.trim();
  const ref = v.match(/^var\(--color-([a-z]+-\d+)\)$/);
  if (ref) return primitives[ref[1]];
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const rgba = v.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (rgba) {
    // Translucent panels: flatten over the page colour to get the colour text actually sits on.
    const [r, g, b, a] = rgba.slice(1).map(Number);
    const base = hexToRgb(over);
    const mix = [r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a)));
    return '#' + mix.map((c) => c.toString(16).padStart(2, '0')).join('');
  }
  throw new Error(`Can't resolve token value: ${value}`);
}

function block(selector: RegExp): Record<string, string> {
  const m = css.match(selector);
  if (!m) throw new Error(`tokens.css: block not found ${selector}`);
  const out: Record<string, string> = {};
  for (const d of m[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}

export const light = block(/^:root \{([\s\S]*?)^\}/m);
export const dark = block(/^:root\[data-theme='dark'\] \{([\s\S]*?)^\}/m);

function hexToRgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Semantic pairs that must pass, checked in both themes. `min` is the WCAG threshold for that use. */
export const PAIRS: { fg: string; bg: string; use: string; min: number }[] = [
  { fg: 'text', bg: 'bg', use: 'Body text on page', min: 4.5 },
  { fg: 'text', bg: 'surface', use: 'Body text on Aurora panel', min: 4.5 },
  { fg: 'text-muted', bg: 'surface', use: 'Muted text on panel', min: 4.5 },
  { fg: 'link', bg: 'bg', use: 'Links', min: 4.5 },
  { fg: 'action-fg', bg: 'action-bg', use: 'Primary button label', min: 4.5 },
  { fg: 'action-bg', bg: 'bg', use: 'Primary button against page', min: 3 },
  { fg: 'border-control', bg: 'surface-solid', use: 'Input and button edges', min: 3 },
  { fg: 'focus', bg: 'bg', use: 'Focus ring', min: 3 },
  { fg: 'badge-fg', bg: 'badge-bg', use: 'Badge', min: 4.5 },
  { fg: 'success-fg', bg: 'success-bg', use: 'Success alert', min: 4.5 },
  { fg: 'warning-fg', bg: 'warning-bg', use: 'Warning alert', min: 4.5 },
  { fg: 'error-fg', bg: 'surface-solid', use: 'Field error', min: 4.5 },
  { fg: 'info-fg', bg: 'info-bg', use: 'Info alert', min: 4.5 },
];

export function checkPair(theme: Record<string, string>, fg: string, bg: string) {
  const page = resolve(theme.bg);
  const fgHex = resolve(theme[fg], page);
  const bgHex = resolve(theme[bg], page);
  return { fgHex, bgHex, ratio: contrast(fgHex, bgHex) };
}
