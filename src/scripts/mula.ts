import { track } from './track';
import { api } from './api';

// Guests who tapped "Buat kad anda" on an invite carry ?ref=<slug> through to here.
const ref = new URLSearchParams(location.search).get('ref');

const form = document.querySelector<HTMLFormElement>('form.join')!;
const email = form.querySelector<HTMLInputElement>('#j-email')!;
const type = form.querySelector<HTMLSelectElement>('#j-type')!;
const month = form.querySelector<HTMLInputElement>('#j-date')!;
const err = form.querySelector<HTMLElement>('.field-error')!;
const status = form.querySelector<HTMLElement>('.status')!;
const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;

const valid = () => {
  const ok = email.checkValidity() && email.value.includes('@');
  email.setAttribute('aria-invalid', String(!ok));
  err.hidden = ok;
  return ok;
};
email.addEventListener('blur', valid);
email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true') valid(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!valid()) { email.focus(); return; }
  btn.disabled = true;
  status.textContent = 'Menyimpan…';
  try {
    const res = await api('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), eventMonth: month.value || null, source: `${ref ? `invite:${ref}` : 'mula'}:${type.value}` }),
    });
    if (!res.ok) throw new Error(String(res.status));
    track('waitlist_joined', { source: ref ? 'invite' : 'mula', type: type.value });
    status.textContent = 'Terima kasih. Kami akan hubungi anda dalam 2 hari bekerja.';
    btn.hidden = true;
  } catch {
    status.textContent = 'Tak berjaya disimpan. Cuba sekali lagi.';
    btn.disabled = false;
  }
});
