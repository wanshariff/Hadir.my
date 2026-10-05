import { track } from './track';
import { FAMILIES, THEME_COLOURS, pickRefiners, rankFamilies, type FamilyId, type Refiner } from '../lib/styles';

const root = document.querySelector<HTMLElement>('[data-quiz]')!;
const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
const params = new URLSearchParams(location.search);
const ref = params.get('ref');
const ORDER: FamilyId[] = ['A', 'B', 'C', 'D', 'E'];
const byId = (f: FamilyId) => FAMILIES.find((x) => x.id === f)!;
const VARIANT: Record<Refiner['kind'], string> = { palette: 'v-palette', density: 'v-airy', type: 'v-type', photo: 'v-photo' };

// ---------- state ----------
let names = 'Aisyah & Hakim';
let colour: { id: string; hex: string } | null = null;
let anchors: Record<FamilyId, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
let liked: Refiner[] = [];
type Card = { kind: 'anchor'; family: FamilyId } | { kind: 'refiner'; refiner: Refiner };
let deck: Card[] = [];
let index = 0;
let answered = 0;
let total = 13;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function show(step: string) {
  root.querySelectorAll<HTMLElement>('[data-step]').forEach((s) => { s.hidden = s.dataset.step !== step; });
  $<HTMLElement>('.progress').hidden = step === 'intro' || step === 'result';
  const h = root.querySelector<HTMLElement>(`[data-step="${step}"] h1`);
  h?.setAttribute('tabindex', '-1');
  h?.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function progress() {
  $<HTMLElement>('[data-count]').textContent = String(answered);
  $<HTMLElement>('[data-total]').textContent = String(total);
  const bar = $<HTMLElement>('.bar');
  bar.setAttribute('aria-valuenow', String(answered));
  bar.setAttribute('aria-valuemax', String(total));
  $<HTMLElement>('.bar span').style.width = `${Math.round((answered / total) * 100)}%`;
}

// ---------- templates ----------
function template(f: FamilyId, variants: string[], who: string, accent?: string) {
  const style = accent ? ` style="--tpl-accent:${accent};--tpl-name:${accent}"` : '';
  return `<div class="tpl tpl-${f} ${variants.join(' ')}"${style} role="img" aria-label="Contoh kad gaya ${esc(byId(f).name)}">
    <span class="tpl-photo">Foto pasangan</span>
    <p class="tpl-pre">Walimatul Urus</p>
    <p class="tpl-names">${esc(who)}</p>
    <p class="tpl-date">Sabtu, 12 Disember 2026</p>
    <p class="tpl-venue">Dewan Seri Melati, Shah Alam</p>
  </div>`;
}

// ---------- deck ----------
function renderCard() {
  const card = deck[index];
  const el = $<HTMLElement>('[data-card]');
  el.className = 'swipe-card';
  if (card.kind === 'anchor') {
    $<HTMLElement>('[data-swipe-title]').textContent = 'Suka suasana ini?';
    el.innerHTML = `<div class="scene scene-${card.family}" role="img" aria-label="Lakaran suasana majlis"></div>`;
    $<HTMLElement>('[data-caption]').textContent = `Lakaran: ${byId(card.family).scene}`;
  } else {
    const r = card.refiner;
    $<HTMLElement>('[data-swipe-title]').textContent = 'Suka butiran kad ini?';
    el.innerHTML = template(r.family, [VARIANT[r.kind]], 'Aisyah & Hakim', colour && r.kind !== 'palette' ? colour.hex : undefined);
    $<HTMLElement>('[data-caption]').textContent = r.label;
  }
}

function startAnchors() {
  deck = shuffle(ORDER).map((family) => ({ kind: 'anchor', family }) as Card);
  index = 0;
  show('swipe');
  renderCard();
}

function startRefiners() {
  const picked = pickRefiners(anchors, Boolean(colour));
  deck = picked.map((refiner) => ({ kind: 'refiner', refiner }) as Card);
  total = answered + deck.length;
  index = 0;
  progress();
  show('swipe');
  renderCard();
}

function answer(value: 1 | -1) {
  const card = deck[index];
  if (!card) return;
  answered += 1;
  if (card.kind === 'anchor') anchors[card.family] += value;
  else if (value > 0) liked.push(card.refiner);
  track('quiz_answered', { phase: card.kind, family: card.kind === 'anchor' ? card.family : card.refiner.family, like: value > 0 });
  progress();
  const el = $<HTMLElement>('[data-card]');
  el.classList.add(value > 0 ? 'out-right' : 'out-left');
  const next = () => {
    index += 1;
    if (index < deck.length) { renderCard(); return; }
    if (card.kind === 'anchor') {
      if (ORDER.every((f) => anchors[f] < 0)) { show('ask'); return; }
      startRefiners();
    } else {
      finish();
    }
  };
  matchMedia('(prefers-reduced-motion: reduce)').matches ? next() : setTimeout(next, 200);
}

// ---------- result ----------
function variantsFor(f: FamilyId) {
  return liked.filter((r) => r.family === f).map((r) => VARIANT[r.kind]);
}

function renderResult(top: FamilyId[], who: string, accent?: string, variantMap?: Partial<Record<FamilyId, string[]>>) {
  const first = byId(top[0]);
  $<HTMLElement>('[data-result-name]').textContent = first.name;
  $<HTMLElement>('[data-result-mood]').textContent = `${first.mood}. ${first.palette}, motif ${first.motif.toLowerCase()}.`;
  const mula = (f: FamilyId) => {
    const q = new URLSearchParams({ gaya: f });
    if (ref && /^[a-z0-9-]{1,60}$/.test(ref)) q.set('ref', ref);
    return `${mulaPath}?${q}`;
  };
  $<HTMLElement>('[data-matches]').innerHTML = top.map((f, i) => `
    <li class="match">
      <div class="match-head">
        <h2 class="h5">${i + 1}. ${esc(byId(f).name)}</h2>
        ${i === 0 ? '<span class="badge">Padanan terbaik</span>' : ''}
      </div>
      ${template(f, variantMap?.[f] ?? variantsFor(f), who, accent)}
      <a class="btn ${i === 0 ? 'btn-primary' : ''} btn-block" href="${mula(f)}" data-choose="${f}" data-rank="${i + 1}">Guna reka bentuk ini</a>
    </li>`).join('');
  root.querySelectorAll<HTMLAnchorElement>('[data-choose]').forEach((a) =>
    a.addEventListener('click', () => track('template_chosen', { family: a.dataset.choose!, rank: Number(a.dataset.rank) })));
  show('result');
}

function finish() {
  const top = rankFamilies(anchors, liked).slice(0, 3);
  track('quiz_completed', { top: top[0], answered });
  const v: Partial<Record<FamilyId, string[]>> = {};
  for (const f of top) v[f] = variantsFor(f);
  shareState = { top, who: names, colour: colour?.id ?? '', v };
  renderResult(top, names, colour?.hex, v);
}

// Where "Guna reka bentuk ini" leads. The preview build rewrites root links to files, so read it from the page.
const mulaPath = document.querySelector<HTMLAnchorElement>('[data-mula-link]')?.getAttribute('href') ?? '/mula';

// ---------- share ----------
let shareState: { top: FamilyId[]; who: string; colour: string; v: Partial<Record<FamilyId, string[]>> } | null = null;

$<HTMLButtonElement>('[data-share]').addEventListener('click', async () => {
  if (!shareState) return;
  const q = new URLSearchParams({ hasil: shareState.top.join(''), n: shareState.who });
  if (shareState.colour) q.set('w', shareState.colour);
  const code: Record<string, string> = { 'v-palette': 'p', 'v-airy': 'a', 'v-type': 't', 'v-photo': 'h' };
  const v = shareState.top.map((f) => (shareState!.v[f] ?? []).map((x) => code[x]).join('')).join('.');
  if (v.replace(/\./g, '')) q.set('v', v);
  const url = `${location.origin}${location.pathname}?${q}`;
  const msg = $<HTMLElement>('[data-share-msg]');
  track('quiz_result_shared', { top: shareState.top[0] });
  try {
    if (navigator.share) { await navigator.share({ title: 'Gaya majlis kami', url }); return; }
    await navigator.clipboard.writeText(url);
    msg.textContent = 'Pautan disalin. Hantar kepada keluarga untuk setuju bersama.';
  } catch {
    msg.textContent = url;
  }
});

$<HTMLButtonElement>('[data-restart]').addEventListener('click', () => {
  anchors = { A: 0, B: 0, C: 0, D: 0, E: 0 }; liked = []; answered = 0; total = 13; colour = null;
  history.replaceState(null, '', location.pathname);
  progress();
  show('intro');
});

// ---------- wiring ----------
$<HTMLFormElement>('form.names').addEventListener('submit', (e) => {
  e.preventDefault();
  const a = $<HTMLInputElement>('#n1').value.trim();
  const b = $<HTMLInputElement>('#n2').value.trim();
  if (a || b) names = [a, b].filter(Boolean).join(' & ');
  track('quiz_started', { named: Boolean(a || b) });
  answered = 0; total = 13; progress();
  show('colour');
});

$<HTMLAnchorElement>('[data-skip]').addEventListener('click', (e) => {
  e.preventDefault();
  track('quiz_skipped', {});
  renderResult(['A', 'C', 'D'], names);
  // Skipping shows all five families, not a ranking.
  const list = $<HTMLElement>('[data-matches]');
  list.insertAdjacentHTML('beforeend', ['B', 'E'].map((f) => `<li class="match"><div class="match-head"><h2 class="h5">${esc(byId(f as FamilyId).name)}</h2></div>${template(f as FamilyId, [], names)}<a class="btn btn-block" href="${mulaPath}?gaya=${f}">Guna reka bentuk ini</a></li>`).join(''));
  list.querySelectorAll('.match .badge').forEach((b) => b.remove());
  $<HTMLElement>('[data-result-name]').textContent = 'Semua gaya';
  $<HTMLElement>('[data-result-mood]').textContent = 'Lima keluarga gaya. Ambil kuiz untuk cadangan yang sesuai dengan anda.';
});

const yes = $<HTMLButtonElement>('[data-colour-yes]');
yes.addEventListener('click', () => { yes.setAttribute('aria-pressed', 'true'); $<HTMLElement>('.swatches').hidden = false; });
$<HTMLButtonElement>('[data-colour-no]').addEventListener('click', () => { colour = null; answered = 1; progress(); startAnchors(); });
root.querySelectorAll<HTMLInputElement>('input[name="colour"]').forEach((r) => r.addEventListener('change', () => { $<HTMLButtonElement>('[data-colour-go]').disabled = false; }));
$<HTMLButtonElement>('[data-colour-go]').addEventListener('click', () => {
  const sel = root.querySelector<HTMLInputElement>('input[name="colour"]:checked');
  if (sel) colour = { id: sel.value, hex: sel.dataset.hex! };
  answered = 1; total = 12; progress(); startAnchors();
});

root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.answer) as 1 | -1)));
document.addEventListener('keydown', (e) => {
  if ($<HTMLElement>('[data-step="swipe"]').hidden || (e.target as HTMLElement).matches('input, textarea')) return;
  if (e.key === 'ArrowRight') answer(1);
  if (e.key === 'ArrowLeft') answer(-1);
});

root.querySelectorAll<HTMLButtonElement>('[data-lean]').forEach((b) => b.addEventListener('click', () => {
  // "Klasik atau moden?" seeds the two closest families, then the quiz continues.
  if (b.dataset.lean === 'klasik') { anchors.A = 1; anchors.D = 1; } else { anchors.B = 1; anchors.E = 1; }
  startRefiners();
}));

// Swipe: a horizontal drag past 80px answers; anything less springs back.
const stage = $<HTMLElement>('.card-stage');
let startX: number | null = null;
stage.addEventListener('pointerdown', (e) => { startX = e.clientX; });
stage.addEventListener('pointermove', (e) => {
  if (startX === null) return;
  const dx = e.clientX - startX;
  $<HTMLElement>('[data-card]').style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
});
const end = (e: PointerEvent) => {
  if (startX === null) return;
  const dx = e.clientX - startX;
  startX = null;
  $<HTMLElement>('[data-card]').style.transform = '';
  if (Math.abs(dx) > 80) answer(dx > 0 ? 1 : -1);
};
stage.addEventListener('pointerup', end);
stage.addEventListener('pointercancel', () => { startX = null; $<HTMLElement>('[data-card]').style.transform = ''; });

// A shared result link opens straight on the result.
const hasil = params.get('hasil');
if (hasil && /^[A-E]{3}$/.test(hasil)) {
  const top = hasil.split('') as FamilyId[];
  const who = (params.get('n') ?? names).slice(0, 60);
  const hex = THEME_COLOURS.find((c) => c.id === params.get('w'))?.hex;
  const short: Record<string, string> = { p: 'v-palette', a: 'v-airy', t: 'v-type', h: 'v-photo' };
  const vs = (params.get('v') ?? '').split('.');
  const v: Partial<Record<FamilyId, string[]>> = {};
  top.forEach((f, i) => { v[f] = (vs[i] ?? '').split('').map((c) => short[c]).filter(Boolean); });
  shareState = { top, who, colour: params.get('w') ?? '', v };
  renderResult(top, who, hex, v);
}

