import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRefiners, rankFamilies, REFINERS } from './styles.ts';

const base = { A: 0, B: 0, C: 0, D: 0, E: 0 } as const;

test('normal run: 4 from the top family, 2 from the second, 1 wildcard', () => {
  const r = pickRefiners({ ...base, C: 1, A: 1, B: -1, D: 0, E: -1 } as never, false);
  // A and C tie at +1, so the tie rule applies: 3 from each tied family.
  assert.equal(r.length, 6);
  const clear = pickRefiners({ ...base, C: 1, A: 0, B: -1, D: -1, E: -1 } as never, false);
  assert.deepEqual(clear.map((x) => x.family), ['C', 'C', 'C', 'C', 'A', 'A', 'B']);
});

test('palette known: palette refiners are skipped', () => {
  const r = pickRefiners({ ...base, D: 1, A: -1, B: -1, C: -1, E: -1 } as never, true);
  assert.ok(r.every((x) => x.kind !== 'palette'));
  assert.ok(r.length <= 7);
});

test('liked all five: refiners come from the top three families', () => {
  const r = pickRefiners({ A: 1, B: 1, C: 1, D: 1, E: 1 }, false);
  assert.equal(new Set(r.map((x) => x.family)).size, 3);
  assert.equal(r.length, 7);
});

test('ranking: anchors count double, refiner likes break ties', () => {
  const liked = REFINERS.filter((x) => x.family === 'E').slice(0, 2);
  assert.deepEqual(rankFamilies({ A: 1, E: 1 }, liked).slice(0, 2), ['E', 'A']);
  assert.equal(rankFamilies({ B: -1, C: 1 }, [])[0], 'C');
});
