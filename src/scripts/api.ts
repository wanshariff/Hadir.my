// One door for every API call. Production hits /functions; PUBLIC_PREVIEW builds answer from
// localStorage so a static preview can be clicked through end to end. The preview branch is
// removed from production bundles because the condition is replaced at build time.

export const PREVIEW = import.meta.env.PUBLIC_PREVIEW === '1';

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  if (PREVIEW) return mock(path, init);
  return fetch(path, init);
}

// ---------- preview mock ----------

interface MockRsvp { id: string; slug: string; name: string; phone: string | null; status: 'hadir' | 'tak_hadir'; pax: number; message: string | null; updatedAt: string; editToken: string }

const KEY = 'hadir:preview:rsvps';
const now = Date.now();
const SEED: MockRsvp[] = [
  { id: 'seed-1', slug: 'sofea-adam', name: 'Mak Long Rohana (contoh)', phone: '012-3456789', status: 'hadir', pax: 4, message: 'Tahniah, semoga berkekalan hingga ke jannah.', updatedAt: new Date(now - 3_600_000).toISOString(), editToken: 'x' },
  { id: 'seed-2', slug: 'sofea-adam', name: 'Hafiz & Nurul (contoh)', phone: null, status: 'hadir', pax: 2, message: null, updatedAt: new Date(now - 7_200_000).toISOString(), editToken: 'x' },
  { id: 'seed-3', slug: 'sofea-adam', name: 'Pak Cik Salleh (contoh)', phone: '019-8765432', status: 'tak_hadir', pax: 0, message: 'Maaf tak dapat hadir. Selamat pengantin baru.', updatedAt: new Date(now - 86_400_000).toISOString(), editToken: 'x' },
];

function load(): MockRsvp[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockRsvp[]) : [...SEED];
  } catch { return [...SEED]; }
}
function save(rows: MockRsvp[]) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* preview only */ }
}
const reply = (data: unknown, status = 200) =>
  new Response(data === null ? null : JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

async function mock(path: string, init: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 350)); // feel a real round trip
  const method = (init.method ?? 'GET').toUpperCase();
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
  const url = new URL(path, 'https://preview.local');
  const rows = load();

  if (url.pathname === '/api/rsvp' && method === 'POST') {
    const name = String(body.name ?? '').trim();
    if (!name) return reply({ error: 'name' }, 422);
    const nameKey = name.toLowerCase();
    const existing = rows.find((r) => r.slug === body.slug && r.name.toLowerCase() === nameKey);
    const row: MockRsvp = {
      id: existing?.id ?? crypto.randomUUID(), slug: body.slug, name, phone: body.phone || null,
      status: body.status, pax: body.status === 'hadir' ? Number(body.pax) : 0, message: body.message || null,
      updatedAt: new Date().toISOString(), editToken: crypto.randomUUID(),
    };
    save([row, ...rows.filter((r) => r.id !== row.id)]);
    return reply({ id: row.id, editToken: row.editToken }, 201);
  }
  if (url.pathname === '/api/rsvp' && method === 'PUT') {
    const row = rows.find((r) => r.id === body.id && r.editToken === body.editToken);
    if (!row) return reply({ error: 'auth' }, 401);
    Object.assign(row, { name: body.name, phone: body.phone || null, status: body.status, pax: body.status === 'hadir' ? Number(body.pax) : 0, message: body.message || null, updatedAt: new Date().toISOString() });
    save(rows);
    return reply({ id: row.id });
  }
  if (url.pathname === '/api/host') {
    const slug = url.searchParams.get('slug');
    const list = rows.filter((r) => r.slug === slug).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ editToken: _t, slug: _s, ...rest }) => rest);
    return reply({ rsvps: list });
  }
  if (url.pathname === '/api/waitlist') return reply({ ok: true }, 201);
  return reply(null, 204);
}
