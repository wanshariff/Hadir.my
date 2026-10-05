// Gives Pages Functions the server-side view of each event (no globbing in the Workers bundle).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../src/data/events/', import.meta.url);
const out = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const e = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  if (`${e.slug}.json` !== f) throw new Error(`${f}: slug "${e.slug}" must match the file name`);
  if (!/^[a-f0-9]{64}$/.test(e.hostKeyHash ?? '')) throw new Error(`${f}: hostKeyHash missing; use npm run new-event`);
  out[e.slug] = { maxPax: e.maxPax, hostKeyHash: e.hostKeyHash };
}
writeFileSync(new URL('../server/events.generated.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`gen-events: ${Object.keys(out).length} event(s)`);
