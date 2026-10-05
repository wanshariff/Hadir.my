-- Hadir, validation slice. Neon Postgres.
-- Events live as JSON in the repo during the concierge phase, so tables key on event_slug.
-- When the editor ships, add the PRD's `events` table and backfill event_id from slug.

create extension if not exists pgcrypto;

create table if not exists rsvps (
  id               uuid primary key default gen_random_uuid(),
  event_slug       text not null,
  name             text not null,
  name_key         text not null,           -- normalised name, for de-duplication per device
  phone            text,
  status           text not null check (status in ('hadir', 'tak_hadir')),
  pax              int  not null check (pax >= 0),
  message          text,
  hidden           boolean not null default false,  -- host can hide a doa (PRD F5)
  device_key       text not null,
  edit_token_hash  text not null,
  ip_hash          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One live RSVP per person per device. A shared phone (Mak answering for Tok) can hold several.
create unique index if not exists rsvps_device_person on rsvps (event_slug, device_key, name_key);
create index if not exists rsvps_event on rsvps (event_slug, updated_at desc);
create index if not exists rsvps_ip_recent on rsvps (ip_hash, created_at);

create table if not exists analytics_events (
  id          bigint generated always as identity primary key,
  name        text not null,
  props       jsonb not null default '{}',
  path        text,
  ref         text,
  created_at  timestamptz not null default now()
);
create index if not exists analytics_events_name_time on analytics_events (name, created_at);

create table if not exists waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  event_month  text,
  source       text not null,
  price_seen   int,
  created_at   timestamptz not null default now()
);

-- Fake-door readout: clicks per price variant.
create or replace view fake_door_by_price as
select (props->>'price')::int as price,
       count(*) filter (where name = 'upgrade_viewed')    as views,
       count(*) filter (where name = 'fake_door_clicked') as clicks
from analytics_events
where name in ('upgrade_viewed', 'fake_door_clicked')
group by 1 order by 1;
