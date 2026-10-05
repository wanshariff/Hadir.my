import { track } from './track';

const params = new URLSearchParams(location.search);
const ref = params.get('ref');
track('landing_viewed', { source: params.get('utm_source') ?? 'direct' });

const form = document.querySelector<HTMLFormElement>('.join form')!;
const email = form.querySelector<HTMLInputElement>('#j-email')!;
const month = form.querySelector<HTMLInputElement>('#j-date')!;
const err = form.querySelector<HTMLElement>('.error')!;
const status = form.querySelector<HTMLElement>('.status')!;
const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;

const valid = () => {
  const ok = email.checkValidity() && email.value.includes('@');
  email.setAttribute('aria-invalid', String(!ok));
  err.hidden = ok;
  return ok;
};
email.addEventListener('blur', valid);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!valid()) { email.focus(); return; }
  btn.disabled = true;
  status.textContent = 'Menyimpan…';
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), eventMonth: month.value || null, source: ref ? `invite:${ref}` : 'home' }),
    });
    if (!res.ok) throw new Error(String(res.status));
    track('waitlist_joined', { source: ref ? 'invite' : 'home' });
    status.textContent = 'Terima kasih. Kami akan hubungi anda dalam 2 hari bekerja.';
    btn.hidden = true;
  } catch {
    status.textContent = 'Tak berjaya disimpan. Cuba sekali lagi.';
    btn.disabled = false;
  }
});
