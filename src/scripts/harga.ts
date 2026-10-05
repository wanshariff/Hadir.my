import { track } from './track';

const PRICES = [29, 35, 39] as const;

function pickPrice(): number {
  const forced = Number(new URLSearchParams(location.search).get('p'));
  if ((PRICES as readonly number[]).includes(forced)) return forced;
  try {
    const saved = Number(localStorage.getItem('hadir:price'));
    if ((PRICES as readonly number[]).includes(saved)) return saved;
    const p = PRICES[Math.floor(Math.random() * PRICES.length)];
    localStorage.setItem('hadir:price', String(p));
    return p;
  } catch {
    return 35;
  }
}

const price = pickPrice();
document.querySelectorAll('[data-price]').forEach((el) => { el.textContent = String(price); });
track('upgrade_viewed', { price });

const dialog = document.querySelector<HTMLDialogElement>('dialog.door')!;
const email = dialog.querySelector<HTMLInputElement>('#w-email')!;
const month = dialog.querySelector<HTMLInputElement>('#w-date')!;
const err = dialog.querySelector<HTMLElement>('.error')!;
const status = dialog.querySelector<HTMLElement>('.status')!;
const join = dialog.querySelector<HTMLButtonElement>('[data-join]')!;

document.querySelector('[data-fake-door]')!.addEventListener('click', () => {
  track('fake_door_clicked', { price });
  dialog.showModal();
});
dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());

const valid = () => {
  const ok = email.checkValidity() && email.value.includes('@');
  email.setAttribute('aria-invalid', String(!ok));
  err.hidden = ok;
  return ok;
};
email.addEventListener('blur', valid);

dialog.querySelector('form')!.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!valid()) { email.focus(); return; }
  join.disabled = true;
  status.textContent = 'Menyimpan…';
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), eventMonth: month.value || null, price }),
    });
    if (!res.ok) throw new Error(String(res.status));
    status.textContent = 'Terima kasih. Kami akan e-mel anda.';
    join.hidden = true;
  } catch {
    status.textContent = 'Tak berjaya disimpan. Cuba sekali lagi.';
    join.disabled = false;
  }
});
