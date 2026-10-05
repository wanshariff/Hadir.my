import { neon } from '@neondatabase/serverless';
import type { RsvpInput } from './validate.ts';

export interface Env {
  DATABASE_URL?: string;
  HASH_SALT?: string;
  DEV_MEMORY_DB?: string;
}

export interface RsvpRow extends RsvpInput { id: string; updatedAt: string }

export interface Store {
  /** Insert, or update the same person's row from the same device. */
  upsertRsvp(r: RsvpInput & { slug: string; nameKey: string; deviceKey: string; editTokenHash: string; ipHash: string | null }): Promise<string>;
  /** Update by edit token; returns false if the token doesn't match. */
  updateRsvp(id: string, slug: string, editTokenHash: string, r: RsvpInput & { nameKey: string }): Promise<boolean>;
  listRsvps(slug: string): Promise<RsvpRow[]>;
  recentFromIp(ipHash: string, minutes: number): Promise<number>;
  track(e: { name: string; props: Record<string, unknown>; path: string | null; ref: string | null }): Promise<void>;
  joinWaitlist(w: { email: string; eventMonth: string | null; source: string; price: number | null }): Promise<void>;
}

export function getStore(env: Env): Store {
  if (env.DEV_MEMORY_DB === '1') return memoryStore();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return neonStore(env.DATABASE_URL);
}

function neonStore(url: string): Store {
  const sql = neon(url);
  return {
    async upsertRsvp(r) {
      const rows = await sql`
        insert into rsvps (event_slug, name, name_key, phone, status, pax, message, device_key, edit_token_hash, ip_hash)
        values (${r.slug}, ${r.name}, ${r.nameKey}, ${r.phone}, ${r.status}, ${r.pax}, ${r.message}, ${r.deviceKey}, ${r.editTokenHash}, ${r.ipHash})
        on conflict (event_slug, device_key, name_key) do update set
          name = excluded.name, phone = excluded.phone, status = excluded.status, pax = excluded.pax,
          message = excluded.message, edit_token_hash = excluded.edit_token_hash, updated_at = now()
        returning id`;
      return rows[0].id as string;
    },
    async updateRsvp(id, slug, editTokenHash, r) {
      const rows = await sql`
        update rsvps set name = ${r.name}, name_key = ${r.nameKey}, phone = ${r.phone}, status = ${r.status},
          pax = ${r.pax}, message = ${r.message}, updated_at = now()
        where id = ${id} and event_slug = ${slug} and edit_token_hash = ${editTokenHash}
        returning id`;
      return rows.length === 1;
    },
    async listRsvps(slug) {
      const rows = await sql`
        select id, name, phone, status, pax, message, updated_at
        from rsvps where event_slug = ${slug} order by updated_at desc`;
      return rows.map((r) => ({
        id: r.id, name: r.name, phone: r.phone, status: r.status, pax: r.pax, message: r.message,
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    },
    async recentFromIp(ipHash, minutes) {
      const rows = await sql`
        select count(*)::int as n from rsvps
        where ip_hash = ${ipHash} and created_at > now() - make_interval(mins => ${minutes})`;
      return rows[0].n as number;
    },
    async track(e) {
      await sql`insert into analytics_events (name, props, path, ref) values (${e.name}, ${JSON.stringify(e.props)}, ${e.path}, ${e.ref})`;
    },
    async joinWaitlist(w) {
      await sql`
        insert into waitlist (email, event_month, source, price_seen) values (${w.email}, ${w.eventMonth}, ${w.source}, ${w.price})
        on conflict (email) do update set event_month = coalesce(excluded.event_month, waitlist.event_month)`;
    },
  };
}

// Local development only (DEV_MEMORY_DB=1). Lives as long as the isolate.
const mem = { rsvps: [] as (RsvpRow & { slug: string; nameKey: string; deviceKey: string; editTokenHash: string; ipHash: string | null; createdAt: number })[], events: [] as unknown[], waitlist: [] as unknown[] };

function memoryStore(): Store {
  return {
    async upsertRsvp(r) {
      const now = new Date().toISOString();
      const existing = mem.rsvps.find((x) => x.slug === r.slug && x.deviceKey === r.deviceKey && x.nameKey === r.nameKey);
      if (existing) { Object.assign(existing, { ...pick(r), editTokenHash: r.editTokenHash, updatedAt: now }); return existing.id; }
      const id = crypto.randomUUID();
      mem.rsvps.push({ ...pick(r), id, slug: r.slug, nameKey: r.nameKey, deviceKey: r.deviceKey, editTokenHash: r.editTokenHash, ipHash: r.ipHash, updatedAt: now, createdAt: Date.now() });
      return id;
    },
    async updateRsvp(id, slug, editTokenHash, r) {
      const row = mem.rsvps.find((x) => x.id === id && x.slug === slug && x.editTokenHash === editTokenHash);
      if (!row) return false;
      Object.assign(row, { ...pick(r), nameKey: r.nameKey, updatedAt: new Date().toISOString() });
      return true;
    },
    async listRsvps(slug) {
      return mem.rsvps.filter((x) => x.slug === slug)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((x) => ({ id: x.id, updatedAt: x.updatedAt, ...pick(x) }));
    },
    async recentFromIp(ipHash, minutes) {
      return mem.rsvps.filter((x) => x.ipHash === ipHash && x.createdAt > Date.now() - minutes * 60_000).length;
    },
    async track(e) { mem.events.push({ ...e, at: new Date().toISOString() }); },
    async joinWaitlist(w) { mem.waitlist.push(w); },
  };
}

const pick = (r: RsvpInput): RsvpInput => ({ name: r.name, phone: r.phone, status: r.status, pax: r.pax, message: r.message });
