# Hadir.my

"Tahu siapa yang datang." Digital invites with headcount control for Malaysian hosts.
Spec: [PRD v0.1](https://claude.ai/code/artifact/8cc8e2bd-0834-464a-b661-e38fda4aa5ce).

## What's here: the validation slice

The smallest build that can run the PRD's concierge test and fake-door pricing before P1 is built.

| Route | What it does | PRD |
| --- | --- | --- |
| `/<slug>` | Guest invite: cover, details, Waze / Google Maps, calendar, RSVP, footer CTA | F3 (partial), F4, F8, F9 copy |
| `/h/<slug>#k=<key>` | Host dashboard: totals, list, WhatsApp share, copy to Google Sheets | F6 |
| `/harga` | Pricing with a fake-door Kawal Tetamu button (RM29 / 35 / 39 per browser) and a waitlist | Validation |
| `/selamat` | How to tell a real invite from an APK scam | Trust |
| `/` | Holding page: early-host waitlist (the editor isn't built yet) | — |

**Not built yet:** the editor (F1), Clerk sign-in (F2), the generated per-event OG image (F3), the public doa guestbook wall (F5), salam kaut (F7), all of P1, and the EN toggle for guests. The copy dictionary already holds EN.

### Decisions that differ from the PRD (on purpose, for now)

- **Events are JSON files** in `src/data/events/` and are pre-rendered at build. There is no `events` table yet, so DB rows key on `event_slug`.
- **One RSVP per person per device**, not per device. Mak can answer for Tok on her own phone ("Jawab untuk orang lain"). Each answer gets an edit token stored on that phone.
- **Calendar:** Google Calendar link everywhere; `.ics` only on iOS, where it opens the native sheet. Android never gets a file download, keeping the "tiada muat turun" promise.
- **Buttons are plum with white text (14.6:1); marigold is an accent fill, never text on light.** In dark mode plum would sit at 1.3:1 against the background, so primary buttons flip to marigold with plum text (7.8:1).
- **Tahlil** pages drop the marigold accent (`data-tone="muted"`).

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
