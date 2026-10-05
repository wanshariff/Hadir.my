import { track } from './track';

const params = new URLSearchParams(location.search);
track('landing_viewed', { source: params.get('utm_source') ?? 'direct' });

// Before / after: operated with buttons, not dragging (PRD: home page).
const baButtons = document.querySelectorAll<HTMLButtonElement>('[data-ba]');
baButtons.forEach((b) => b.addEventListener('click', () => {
  baButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll<HTMLElement>('[data-ba-panel]').forEach((p) => { p.hidden = p.dataset.baPanel !== b.dataset.ba; });
}));

// Kawal Tetamu demo: the stepper stops at the invitation's cap and says why.
const CAP = 2;
const out = document.querySelector<HTMLOutputElement>('.cap-out');
const msg = document.querySelector<HTMLElement>('.cap-msg');
let pax = 1;
document.querySelectorAll<HTMLButtonElement>('[data-cap-step]').forEach((b) => b.addEventListener('click', () => {
  const next = pax + Number(b.dataset.capStep);
  if (msg) msg.hidden = next <= CAP;
  pax = Math.min(CAP, Math.max(1, next));
  if (out) out.textContent = String(pax);
}));

// Carry the invite that sent this visitor through to sign-up, so the waitlist records it (PRD: invite as ad).
const ref = params.get('ref');
document.querySelectorAll<HTMLAnchorElement>('a[href*="mula"]').forEach((a) => {
  if (ref && /^[a-z0-9-]{1,60}$/.test(ref)) a.search = `?ref=${ref}`;
  a.addEventListener('click', () => track('cta_clicked', { from: 'home' }));
});
