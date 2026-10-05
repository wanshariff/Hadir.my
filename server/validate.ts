// Pure input validation for the API. No I/O here so it can be unit-tested with `node --test`.

export type RsvpStatus = 'hadir' | 'tak_hadir';

export interface RsvpInput {
  name: string;
  phone: string | null;
  status: RsvpStatus;
  pax: number;
  message: string | null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};

/** Malaysian numbers: keep digits and a leading +; 9–15 digits. */
export function normalisePhone(v: unknown): Result<string | null> {
  const raw = str(v, 30);
  if (!raw) return { ok: true, value: null };
  const cleaned = raw.replace(/(?!^\+)[^\d]/g, '');
  const digits = cleaned.replace(/^\+/, '');
  if (digits.length < 9 || digits.length > 15) return { ok: false, error: 'phone' };
  return { ok: true, value: cleaned };
}

export function parseRsvp(body: unknown, maxPax: number): Result<RsvpInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const b = body as Record<string, unknown>;
  const name = str(b.name, 80);
  if (!name) return { ok: false, error: 'name' };
  if (b.status !== 'hadir' && b.status !== 'tak_hadir') return { ok: false, error: 'status' };
  const phone = normalisePhone(b.phone);
  if (!phone.ok) return phone;
  let pax = 0;
  if (b.status === 'hadir') {
    pax = Number(b.pax);
    // Checked on the server, not just by the stepper (PRD: data model, rsvps.pax).
    if (!Number.isInteger(pax) || pax < 1 || pax > maxPax) return { ok: false, error: 'pax' };
  }
  const message = typeof b.message === 'string' ? b.message.trim().slice(0, 500) || null : null;
  return { ok: true, value: { name, phone: phone.value, status: b.status, pax, message } };
}

/** Same person answering again from the same phone updates their row instead of adding one. */
export const nameKey = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const EVENT_NAME = /^[a-z][a-z0-9_]{2,40}$/;

export function parseTrack(body: unknown): Result<{ name: string; props: Record<string, string | number | boolean>; path: string | null; ref: string | null }> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string' || !EVENT_NAME.test(b.name)) return { ok: false, error: 'name' };
  const props: Record<string, string | number | boolean> = {};
  if (b.props && typeof b.props === 'object') {
    for (const [k, v] of Object.entries(b.props as Record<string, unknown>).slice(0, 12)) {
      // Defence in depth: never store guest PII in analytics.
      if (/name|phone|email|message/i.test(k)) continue;
      if (typeof v === 'string') props[k] = v.slice(0, 80);
      else if (typeof v === 'number' || typeof v === 'boolean') props[k] = v;
    }
  }
  return { ok: true, value: { name: b.name, props, path: str(b.path, 200), ref: str(b.ref, 80) } };
}

export function parseWaitlist(body: unknown): Result<{ email: string; eventMonth: string | null; source: string; price: number | null }> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const b = body as Record<string, unknown>;
  const email = str(b.email, 200)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'email' };
  const eventMonth = typeof b.eventMonth === 'string' && /^\d{4}-\d{2}$/.test(b.eventMonth) ? b.eventMonth : null;
  const price = [29, 35, 39].includes(Number(b.price)) ? Number(b.price) : null;
  return { ok: true, value: { email, eventMonth, source: str(b.source, 100) ?? (price ? 'harga' : 'home'), price } };
}
