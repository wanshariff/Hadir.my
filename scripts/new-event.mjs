// Creates a concierge event file and prints the host's private dashboard link.
// Usage: npm run new-event -- <slug> <type>
//   type: kahwin | aqiqah | rumah_terbuka | tahlil | hari_jadi
import { existsSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';

const [slug, type = 'kahwin'] = process.argv.slice(2);
const TYPES = ['kahwin', 'aqiqah', 'rumah_terbuka', 'tahlil', 'hari_jadi'];
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
  console.error('Slug: lowercase letters, numbers and dashes, e.g. sofea-adam');
  process.exit(1);
}
if (!TYPES.includes(type)) { console.error(`Type must be one of: ${TYPES.join(', ')}`); process.exit(1); }

const RESERVED = ['h', 'api', 'harga', 'selamat', 'kad', 'kawal-tetamu', 'kahwin', 'aqiqah', 'rumah-terbuka', 'tahlil', 'index'];
if (RESERVED.includes(slug)) { console.error(`"${slug}" is a reserved path`); process.exit(1); }

const file = new URL(`../src/data/events/${slug}.json`, import.meta.url);
if (existsSync(file)) { console.error(`${slug} already exists`); process.exit(1); }

const key = randomBytes(24).toString('base64url');
const event = {
  slug, type, lang: 'bm',
  hostNames: 'Nama & Nama',
  hostedBy: '',
  startsAt: '2026-12-12T11:00:00+08:00',
  endsAt: '2026-12-12T16:00:00+08:00',
  venue: { name: 'Nama dewan', address: 'Alamat penuh', lat: 3.139, lng: 101.6869 },
  rsvpBy: '2026-12-05',
  maxPax: 10,
  note: '',
  hostKeyHash: createHash('sha256').update(key).digest('hex'),
};
writeFileSync(file, JSON.stringify(event, null, 2) + '\n');
console.log(`Created src/data/events/${slug}.json. Fill in the details, then deploy.\n`);
console.log(`Guest link:  https://hadir.my/${slug}`);
console.log(`Host link:   https://hadir.my/h/${slug}#k=${key}`);
console.log('\nThe host link is shown once. Send it to the host privately; it is not stored anywhere.');
