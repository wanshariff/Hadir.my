import { getStore, type Env } from '../../server/db.ts';
import { getServerEvent } from '../../server/events.ts';
import { nameKey, parseRsvp } from '../../server/validate.ts';
import { randomToken, sha256 } from '../../server/crypto.ts';
import { json, readJson } from '../../server/http.ts';

// Soft limit per IP. Wedding guests often share one home Wi-Fi, so this is generous.
const MAX_NEW_PER_IP_10_MIN = 30;

// POST: new RSVP (or the same person again from the same device).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const event = getServerEvent(body?.slug);
  if (!event) return json({ error: 'event' }, 404);
  const deviceKey = typeof body?.deviceKey === 'string' && /^[\w-]{16,64}$/.test(body.deviceKey) ? body.deviceKey : null;
  if (!deviceKey) return json({ error: 'device' }, 400);

  const parsed = parseRsvp(body, event.maxPax);
  if (!parsed.ok) return json({ error: parsed.error }, 422);

  const store = getStore(env);
  const ip = request.headers.get('cf-connecting-ip');
  const ipHash = ip ? await sha256(`${env.HASH_SALT ?? ''}:${ip}`) : null;
  if (ipHash && (await store.recentFromIp(ipHash, 10)) >= MAX_NEW_PER_IP_10_MIN) return json({ error: 'rate' }, 429);

  const editToken = randomToken();
  const id = await store.upsertRsvp({
    ...parsed.value,
    slug: body!.slug as string,
    nameKey: nameKey(parsed.value.name),
    deviceKey,
    editTokenHash: await sha256(editToken),
    ipHash,
  });
  return json({ id, editToken }, 201);
};

// PUT: edit an existing RSVP with the token returned when it was created.
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const event = getServerEvent(body?.slug);
  if (!event) return json({ error: 'event' }, 404);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof body!.id !== 'string' || !UUID.test(body!.id) || typeof body!.editToken !== 'string') return json({ error: 'auth' }, 401);
  const parsed = parseRsvp(body, event.maxPax);
  if (!parsed.ok) return json({ error: parsed.error }, 422);
  const ok = await getStore(env).updateRsvp(body!.id, body!.slug as string, await sha256(body!.editToken), { ...parsed.value, nameKey: nameKey(parsed.value.name) });
  return ok ? json({ id: body!.id }) : json({ error: 'auth' }, 401);
};
