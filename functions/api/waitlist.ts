import { getStore, type Env } from '../../server/db.ts';
import { parseWaitlist } from '../../server/validate.ts';
import { json, readJson } from '../../server/http.ts';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parsed = parseWaitlist(await readJson(request, 1024));
  if (!parsed.ok) return json({ error: parsed.error }, 422);
  await getStore(env).joinWaitlist(parsed.value);
  return json({ ok: true }, 201);
};
