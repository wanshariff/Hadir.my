import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAIRS, checkPair, light, dark, primitives, SCALES, STEPS } from './tokens.ts';

test('every primitive from the spec is present', () => {
  for (const s of SCALES) for (const n of STEPS) assert.match(primitives[`${s}-${n}`] ?? '', /^#[0-9a-f]{6}$/, `${s}-${n}`);
});

for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
  test(`${name}: every semantic pair meets its WCAG threshold`, () => {
    for (const p of PAIRS) {
      const { ratio } = checkPair(theme, p.fg, p.bg);
      assert.ok(ratio >= p.min, `${p.use}: ${ratio.toFixed(2)} < ${p.min}`);
    }
  });
}
