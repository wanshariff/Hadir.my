// Product events -> /api/track. Never send guest names or phone numbers (PRD: analytics).
export function track(name: string, props: Record<string, string | number | boolean> = {}) {
  const body = JSON.stringify({ name, props, path: location.pathname, ref: new URLSearchParams(location.search).get('ref') });
  try {
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return;
  } catch { /* fall through */ }
  void fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
}
