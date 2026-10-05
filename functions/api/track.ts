import { getStore, type Env } from '../../server/db.ts';
import { parseTrack } from '../../server/validate.ts';
import { json, readJson } from '../../server/http.ts';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const parsed = parseTrack(await readJson(request, 2048));
  if (!parsed.ok) return json({ error: parsed.error }, 422);
  // Analytics must never slow down or break the page.
  waitUntil(getStore(env).track(parsed.value).catch(() => {}));
  return new Response(null, { status: 204 });
};
