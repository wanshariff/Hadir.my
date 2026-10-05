# Hadir.my

"Tahu siapa yang datang." Digital invites with headcount control for Malaysian hosts.
Spec: [PRD v0.2](https://claude.ai/code/artifact/8cc8e2bd-0834-464a-b661-e38fda4aa5ce).

## What's here: the validation slice

The smallest build that can run the PRD's concierge test and fake-door pricing before P1 is built.

| Route | What it does | PRD |
| --- | --- | --- |
| `/` | Landing page: hero with a live invite, trust strip, before/after, how it works, Kawal Tetamu demo, event types, pricing, FAQ, final CTA | Home page sections |
| `/pilih` | Taste quiz: one colour question, 5 decor scenes, up to 7 card details, 3 matches with the couple's names, a shareable result. Every "Buat kad" leads here | v0.2 P0 Taste quiz |
| `/kad` | One live example invite per event type | `/kad` Contoh |
| `/mula` | Early-access sign-up after the quiz (the editor isn't built yet). Shows the chosen style and keeps the `ref` of the invite that sent the visitor | Conversion mechanics |
| `/<slug>` | Guest invite: cover, details, Waze / Google Maps, calendar, RSVP, footer CTA | F3 (partial), F4, F8, F9 copy |
| `/h/<slug>#k=<key>` | Host dashboard: totals, list, WhatsApp share, copy to Google Sheets | F6 |
| `/harga` | Pricing with a fake-door Kawal Tetamu button (RM29 / 35 / 39 per browser) and a waitlist | Validation |
| `/selamat` | How to tell a real invite from an APK scam | Trust |
| `/design` | Design system reference (linked from the footer only) | — |

Preview builds also have `/preview`, a directory of every screen.

**Quiz images are drawn sketches** (`src/styles/templates.css`) standing in for the 25-image bank and Wan's 5 templates; the class contract (`.tpl-A`…`.tpl-E`, `.v-palette|airy|type|photo`) stays when real designs replace them.

**Not built yet:** the editor (F1), Clerk sign-in (F2), the generated per-event OG image (F3), the public doa guestbook wall (F5), salam kaut (F7), all of P1, and the EN toggle for guests. The copy dictionary already holds EN.

### Decisions that differ from the PRD (on purpose, for now)

- **Events are JSON files** in `src/data/events/` and are pre-rendered at build. There is no `events` table yet, so DB rows key on `event_slug`.
- **One RSVP per person per device**, not per device. Mak can answer for Tok on her own phone ("Jawab untuk orang lain"). Each answer gets an edit token stored on that phone.
- **Calendar:** Google Calendar link everywhere; `.ics` only on iOS, where it opens the native sheet. Android never gets a file download, keeping the "tiada muat turun" promise.
- **Buttons are plum with white text (14.6:1); marigold is decoration, never text on light.** The spec's dark action (brand-400) fails at 2.95:1, so dark mode uses marigold with brand-950 text (10.0:1). See `/design` for every change to the spec.
- **Tahlil** pages drop the marigold accent (`data-tone="muted"`).

## Design system

Tokens live in `src/styles/tokens.css`: the Pairwise spec's primitives verbatim, then semantic roles (`--text`, `--action-bg`, …) for light and dark. Components use roles only. `/design` documents the system from those same files. Every text pair is contrast-tested in `src/lib/tokens.test.ts`, so a token change that breaks WCAG fails `npm test`.

Fonts are self-hosted (Fraunces 500, Figtree 400/600, Roboto Mono 500, Latin subset, 54 KB total).

## Click-through preview

```sh
npm run preview:site   # builds preview-site/: mock API in localStorage, inlined scripts, relative links
```

`preview-site/index.html` is the home page; `preview.html` lists every screen. The bundle runs on any static host served from a sub-path. Nothing in it reaches a server.

## Stack

Astro (static) on Cloudflare Pages, Pages Functions in `functions/api/`, shared server code in `server/`, Neon Postgres. Guest page JS is about 4 KB (budget: 60 KB).

## Run locally

```sh
npm install
cp .dev.vars.example .dev.vars   # set DEV_MEMORY_DB=1 to skip Neon
npm run preview                  # build + wrangler pages dev on :8788
npm test                         # validation unit tests
npm run check                    # type-check browser and Workers code
```

## Set up production

1. Create a Neon project, then run `db/schema.sql` in its SQL editor.
2. Create a Cloudflare Pages project from this repo. Build command `npm run build`, output `dist`.
3. Under Settings, Environment variables, add `DATABASE_URL` and `HASH_SALT` (a long random string) as secrets.
4. Point `hadir.my` at the Pages project.

## Run a concierge event

```sh
npm run new-event -- aina-hakim kahwin    # kahwin | aqiqah | rumah_terbuka | tahlil | hari_jadi
```

This writes `src/data/events/aina-hakim.json` and prints the guest link and the host's private dashboard link **once**. Only a hash of the key is stored. Fill in the JSON, commit, deploy, then send the host link privately.

`src/data/events/sofea-adam.json` is a demo whose host key isn't secret. Delete it before real launch.

## Read the results (SQL)

```sql
select * from fake_door_by_price;                                  -- fake-door clicks per price
select event_slug, count(*) responses, sum(pax) people from rsvps group by 1;
select ref, count(*) from analytics_events where name = 'cta_from_invite' group by 1;   -- invite as ad
select source, count(*) from waitlist group by 1;
```
