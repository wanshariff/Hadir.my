import { track } from './track';

interface Row { name: string; phone: string | null; status: 'hadir' | 'tak_hadir'; pax: number; message: string | null; updatedAt: string }

const root = document.querySelector<HTMLElement>('main.wrap')!;
const slug = root.dataset.slug!;
const key = new URLSearchParams(location.hash.slice(1)).get('k');
const dash = root.querySelector<HTMLElement>('.dash')!;
const msg = root.querySelector<HTMLElement>('[data-msg]')!;
const tbody = root.querySelector('tbody')!;
const empty = root.querySelector<HTMLElement>('.empty')!;
let rows: Row[] = [];

function render() {
  const yes = rows.filter((r) => r.status === 'hadir');
  root.querySelector('[data-people]')!.textContent = String(yes.reduce((n, r) => n + r.pax, 0));
  root.querySelector('[data-yes]')!.textContent = String(yes.length);
  root.querySelector('[data-no]')!.textContent = String(rows.length - yes.length);
  empty.hidden = rows.length > 0;
  tbody.replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    if (r.status !== 'hadir') tr.className = 'no';
    for (const v of [r.name, r.status === 'hadir' ? String(r.pax) : 'Tak hadir', r.phone ?? '', r.message ?? '']) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.append(td);
    }
    return tr;
  }));
}

async function load() {
  const res = await fetch(`/api/host?slug=${encodeURIComponent(slug)}`, { headers: { authorization: `Bearer ${key}` } });
  if (res.status === 401 || res.status === 404) {
    dash.hidden = true;
    root.querySelector<HTMLElement>('.locked')!.hidden = false;
    return false;
  }
  if (!res.ok) { msg.textContent = 'Tak dapat dikemas kini. Mencuba lagi…'; return true; }
  rows = (await res.json()).rsvps as Row[];
  dash.hidden = false;
  render();
  msg.textContent = 'Dikemas kini setiap 10 saat.';
  return true;
}

if (!key) {
  root.querySelector<HTMLElement>('.locked')!.hidden = false;
} else {
  void load().then((ok) => {
    if (ok) setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 10_000);
  });
}

// Tab-separated so it pastes straight into Google Sheets (the concierge test runs on a Sheet).
root.querySelector('[data-copy]')!.addEventListener('click', async () => {
  const lines = [['Nama', 'Status', 'Orang', 'Telefon', 'Doa'], ...rows.map((r) => [
    r.name, r.status === 'hadir' ? 'Hadir' : 'Tak hadir', String(r.pax), r.phone ?? '', (r.message ?? '').replace(/\s+/g, ' '),
  ])];
  try {
    await navigator.clipboard.writeText(lines.map((l) => l.join('\t')).join('\n'));
    msg.textContent = `${rows.length} jawapan disalin. Tampal ke Google Sheets.`;
  } catch {
    msg.textContent = 'Tak dapat menyalin pada pelayar ini.';
  }
});

root.querySelector('[data-share]')!.addEventListener('click', () => track('share_clicked', { slug, channel: 'whatsapp' }));
