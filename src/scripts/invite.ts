// Guest invite behaviour. Budget: well under 60 KB; no framework.
import { track } from './track';
import { api } from './api';

type Status = 'hadir' | 'tak_hadir';
interface Answer { id: string; editToken: string; name: string; phone: string; status: Status; pax: number; message: string }

const root = document.querySelector<HTMLElement>('main.invite')!;
const slug = root.dataset.slug!;
const maxPax = Number(root.dataset.maxPax) || 10;
const t = JSON.parse(root.dataset.t!) as Record<string, string>;
const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

// --- storage (may be blocked in private mode) ---
const store = {
  get<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

function deviceKey(): string {
  let key = store.get<string | null>('hadir:device', null);
  if (!key) { key = crypto.randomUUID(); store.set('hadir:device', key); }
  return key;
}

const answersKey = `hadir:rsvp:${slug}`;
const loadAnswers = () => store.get<Answer[]>(answersKey, []);
const saveAnswers = (list: Answer[]) => store.set(answersKey, list);

track('invite_opened', { slug });

// --- countdown ---
const days = Math.ceil((new Date(root.dataset.starts!).getTime() - Date.now()) / 86_400_000);
if (days > 0) {
  const el = $<HTMLElement>('[data-countdown]');
  el.textContent = t.inDays.replace('{n}', String(days));
  el.parentElement!.hidden = false;
}

// --- calendar: .ics opens the native sheet on iOS; everywhere else stay on the Google link (no file downloads) ---
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  root.querySelectorAll<HTMLAnchorElement>('[data-calendar]').forEach((a) => {
    a.href = root.dataset.ics!;
    a.removeAttribute('target');
  });
}

// --- music: tap to play, nothing loads until then ---
const musicBtn = root.querySelector<HTMLButtonElement>('.music');
if (musicBtn) {
  let audio: HTMLAudioElement | null = null;
  musicBtn.addEventListener('click', () => {
    audio ??= Object.assign(new Audio(musicBtn.dataset.src), { loop: true });
    const playing = musicBtn.getAttribute('aria-pressed') === 'true';
    if (playing) audio.pause(); else void audio.play();
    musicBtn.setAttribute('aria-pressed', String(!playing));
    musicBtn.setAttribute('aria-label', playing ? t.music : t.pause);
  });
}

// --- RSVP ---
const form = $<HTMLFormElement>('form');
const fields = $<HTMLElement>('.fields');
const nameInput = $<HTMLInputElement>('#f-name');
const nameErr = $<HTMLElement>('#f-name-err');
const phoneInput = $<HTMLInputElement>('#f-phone');
const msgInput = $<HTMLTextAreaElement>('#f-msg');
const paxOut = $<HTMLOutputElement>('#f-pax');
const paxField = $<HTMLElement>('[data-pax-field]');
const statusEl = $<HTMLElement>('.status');
const submitBtn = $<HTMLButtonElement>('button[type=submit]');
const thanks = $<HTMLElement>('.thanks');
const mine = $<HTMLElement>('.mine');
const mineList = $<HTMLUListElement>('.mine-list');
const statusBtns = root.querySelectorAll<HTMLButtonElement>('[data-status]');

let status: Status | null = null;
let pax = 1;
let editing: Answer | null = null;

function setStatus(s: Status) {
  status = s;
  statusBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.status === s)));
  fields.hidden = false;
  paxField.hidden = s !== 'hadir';
}

function setPax(n: number) {
  pax = Math.min(maxPax, Math.max(1, n));
  paxOut.textContent = String(pax);
}

function validateName(): boolean {
  const ok = nameInput.value.trim().length > 0;
  nameInput.setAttribute('aria-invalid', String(!ok));
  nameErr.hidden = ok;
  nameErr.textContent = ok ? '' : t.nameRequired;
  return ok;
}

function resetForm(prefill?: Answer) {
  editing = prefill ?? null;
  form.reset();
  nameInput.value = prefill?.name ?? '';
  phoneInput.value = prefill?.phone ?? '';
  msgInput.value = prefill?.message ?? '';
  setPax(prefill?.pax ?? 1);
  statusEl.textContent = '';
  nameInput.removeAttribute('aria-invalid');
  nameErr.hidden = true;
  if (prefill) setStatus(prefill.status);
  else { status = null; statusBtns.forEach((b) => b.setAttribute('aria-pressed', 'false')); fields.hidden = true; }
  form.hidden = false;
  thanks.hidden = true;
}

function renderMine() {
  const list = loadAnswers();
  mine.hidden = list.length === 0;
  mineList.replaceChildren(...list.map((a) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${a.name} · ${a.status === 'hadir' ? `${t.yes}, ${a.pax} ${t.people}` : t.no}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = t.edit;
    btn.addEventListener('click', () => { resetForm(a); nameInput.focus(); });
    li.append(label, btn);
    return li;
  }));
  // A returning guest sees their answers first, not an empty form.
  if (list.length && !editing) { form.hidden = true; }
}

statusBtns.forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.status as Status)));
root.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) =>
  b.addEventListener('click', () => setPax(pax + Number(b.dataset.step))));
nameInput.addEventListener('blur', validateName);
// Clear the error while typing, so the blur that comes with the next tap doesn't shift the layout under the finger.
nameInput.addEventListener('input', () => { if (nameInput.getAttribute('aria-invalid') === 'true') validateName(); });
$<HTMLButtonElement>('[data-new]').addEventListener('click', () => { resetForm(); statusBtns[0].focus(); });

async function send(body: unknown, method: 'POST' | 'PUT', attempt = 0): Promise<{ id: string; editToken: string }> {
  try {
    const res = await api('/api/rsvp', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return res.json();
    if (res.status < 500) throw Object.assign(new Error('rejected'), { fatal: true });
  } catch (err) {
    if ((err as { fatal?: boolean }).fatal) throw err;
  }
  if (attempt >= 4) throw new Error('gave up');
  statusEl.textContent = t.retry;
  await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  return send(body, method, attempt + 1);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!status || !validateName()) { nameInput.focus(); return; }
  const answer = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    status,
    pax: status === 'hadir' ? pax : 0,
    message: msgInput.value.trim(),
  };
  submitBtn.disabled = true;
  statusEl.textContent = t.saving;
  try {
    const saved = editing
      ? await send({ ...answer, slug, id: editing.id, editToken: editing.editToken }, 'PUT').then(() => editing!)
      : await send({ ...answer, slug, deviceKey: deviceKey() }, 'POST');
    // "Disimpan" only after the server confirms (PRD: weak network).
    const list = loadAnswers().filter((a) => a.id !== saved.id);
    list.push({ ...answer, id: saved.id, editToken: saved.editToken });
    saveAnswers(list);
    track('rsvp_submitted', { slug, status, pax: answer.pax, edit: Boolean(editing) });
    editing = null;
    statusEl.textContent = t.saved;
    form.hidden = true;
    thanks.hidden = false;
    $<HTMLElement>('.thanks-msg').textContent = status === 'hadir' ? t.thanksYes : t.thanksNo;
    renderMine();
  } catch {
    statusEl.textContent = t.failed;
  } finally {
    submitBtn.disabled = false;
  }
});

root.querySelectorAll<HTMLAnchorElement>('[data-track]').forEach((a) =>
  a.addEventListener('click', () => track(a.dataset.track!, { slug })));

renderMine();
