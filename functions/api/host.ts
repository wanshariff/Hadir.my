import { getStore, type Env } from '../../server/db.ts';
import { getServerEvent } from '../../server/events.ts';
import { safeEqual, sha256 } from '../../server/crypto.ts';
import { json } from '../../server/http.ts';

// Host dashboard data. Guest phone numbers leave the server only through here (PRD: PDPA).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const slug = new URL(request.url).searchParams.get('slug');
  const event = getServerEvent(slug);
  const key = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  // Same response for an unknown event and a wrong key, so slugs can't be probed.
  if (!event || !key || !safeEqual(await sha256(key), event.hostKeyHash)) return json({ error: 'auth' }, 401);
  const rsvps = await getStore(env).listRsvps(slug!);
  return json({ rsvps });
};
