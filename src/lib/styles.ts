// Style families for the taste quiz (PRD v0.2: P0 Taste quiz). Source: E-Invite Project, Source of Truth.
// Scenes and cards here are drawn sketches standing in for the 25-image bank until real images exist.

export type FamilyId = 'A' | 'B' | 'C' | 'D' | 'E';
export type RefinerKind = 'palette' | 'density' | 'type' | 'photo';

export interface Family {
  id: FamilyId;
  name: string;
  mood: string;
  palette: string;
  motif: string;
  type: string;
  /** One line describing the decor scene the anchor image will show. */
  scene: string;
}

export const FAMILIES: Family[] = [
  { id: 'A', name: 'Klasik Diraja', mood: 'Tradisional, megah', palette: 'Merah marun, emas', motif: 'Songket', type: 'Serif klasik, khat', scene: 'Pelamin tiga tingkat, panel ukiran kayu bersalut emas, langsir songket marun.' },
  { id: 'B', name: 'Moden Minimalis', mood: 'Moden, bersih', palette: 'Hitam, putih, neutral', motif: 'Tiada atau garis halus', type: 'Sans moden', scene: 'Dewan galeri putih, bingkai geometri logam hitam, kerusi bouclé krim.' },
  { id: 'C', name: 'Romantik Floral', mood: 'Lembut, romantik', palette: 'Merah jambu, pic', motif: 'Bunga cat air', type: 'Skrip', scene: 'Dinding bunga ros dan peoni, gerbang bunga, lampu kelip dan lilin.' },
  { id: 'D', name: 'Islamik Geometri', mood: 'Tenang, anggun', palette: 'Biru tua, emas, zamrud', motif: 'Corak geometri, gerbang', type: 'Aksen khat', scene: 'Skrin kekisi geometri membentuk gerbang mihrab, tanglung tembaga.' },
  { id: 'E', name: 'Rustik Alam', mood: 'Hangat, alami', palette: 'Terakota, sage', motif: 'Tumbuhan kering, kraf', type: 'Serif', scene: 'Taman kampung waktu senja, panel rotan dan mengkuang, padi kering.' },
];

/** What a liked refiner card sets on the result. */
export interface Refiner { family: FamilyId; kind: RefinerKind; label: string }

export const REFINERS: Refiner[] = [
  { family: 'A', kind: 'palette', label: 'Zamrud dan emas' },
  { family: 'A', kind: 'density', label: 'Lebih lapang, hiasan nipis' },
  { family: 'A', kind: 'type', label: 'Nama dalam tulisan skrip' },
  { family: 'A', kind: 'photo', label: 'Dengan foto pasangan' },
  { family: 'B', kind: 'palette', label: 'Pasir dan coklat lembut' },
  { family: 'B', kind: 'density', label: 'Tengah, dengan ranting halus' },
  { family: 'B', kind: 'type', label: 'Serif ringan, gaya majalah' },
  { family: 'B', kind: 'photo', label: 'Foto penuh hitam putih' },
  { family: 'C', kind: 'palette', label: 'Biru lembut dan putih' },
  { family: 'C', kind: 'density', label: 'Sejambak kecil, ruang lapang' },
  { family: 'C', kind: 'type', label: 'Serif huruf kecil besar' },
  { family: 'C', kind: 'photo', label: 'Dengan foto senja' },
  { family: 'D', kind: 'palette', label: 'Zamrud dan krim' },
  { family: 'D', kind: 'density', label: 'Garis emas sahaja, corak samar' },
  { family: 'D', kind: 'type', label: 'Sans moden, huruf besar' },
  { family: 'D', kind: 'photo', label: 'Foto dalam gerbang' },
  { family: 'E', kind: 'palette', label: 'Krim, zaitun dan kunyit' },
  { family: 'E', kind: 'density', label: 'Lukisan daun halus sahaja' },
  { family: 'E', kind: 'type', label: 'Tulisan tangan berus' },
  { family: 'E', kind: 'photo', label: 'Foto sawah, tepi kertas koyak' },
];

/** Colours offered when the couple already has a theme colour (Phase 0). */
export const THEME_COLOURS = [
  { id: 'marun', label: 'Marun', hex: '#5a1a1f' },
  { id: 'emas', label: 'Emas', hex: '#c9a44c' },
  { id: 'zamrud', label: 'Zamrud', hex: '#0f4d3a' },
  { id: 'biru', label: 'Biru tua', hex: '#14213d' },
  { id: 'jambu', label: 'Merah jambu', hex: '#d98c96' },
  { id: 'sage', label: 'Sage', hex: '#8a9a6b' },
  { id: 'terakota', label: 'Terakota', hex: '#b5603f' },
  { id: 'hitam', label: 'Hitam', hex: '#111111' },
] as const;

export interface Prefs { palette?: boolean; density?: boolean; type?: boolean; photo?: boolean }

/**
 * Pure scoring, kept free of the DOM so it can be tested.
 * anchors: family -> +1 / -1 from the decor scenes. refinerLikes: refiners liked.
 */
export function rankFamilies(anchors: Partial<Record<FamilyId, number>>, refinerLikes: Refiner[]): FamilyId[] {
  const score: Record<FamilyId, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const [f, v] of Object.entries(anchors)) score[f as FamilyId] += (v ?? 0) * 2;
  for (const r of refinerLikes) score[r.family] += 1;
  const order: FamilyId[] = ['A', 'B', 'C', 'D', 'E'];
  return [...order].sort((a, b) => score[b] - score[a] || order.indexOf(a) - order.indexOf(b));
}

/** Which refiner cards to show after the anchors (Phase 2), per the PRD's rules and edge cases. */
export function pickRefiners(anchors: Record<FamilyId, number>, skipPalette: boolean): Refiner[] {
  const ranked = rankFamilies(anchors, []);
  const scores = ranked.map((f) => anchors[f]);
  const likedAll = scores.every((s) => s > 0);
  const top = scores[0];
  const tied = ranked.filter((f) => anchors[f] === top);
  const plan: [FamilyId, number][] =
    tied.length > 1 && !likedAll ? tied.slice(0, 2).map((f) => [f, 3] as [FamilyId, number])
    : likedAll ? [[ranked[0], 3], [ranked[1], 2], [ranked[2], 2]]
    : [[ranked[0], 4], [ranked[1], 2], [ranked[2], 1]];
  const out: Refiner[] = [];
  for (const [f, n] of plan) {
    const pool = REFINERS.filter((r) => r.family === f && !(skipPalette && r.kind === 'palette'));
    out.push(...pool.slice(0, n));
  }
  return out.slice(0, 7);
}
