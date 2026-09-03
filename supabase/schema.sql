-- ============================================================
--  Dallas & Las Vegas Trip App — database schema
--  Run this ONCE in the Supabase SQL Editor, then run seed.sql.
--  Safe to re-run: everything is idempotent.
-- ============================================================
--
--  ACCESS MODEL: "anyone with the link".
--  There is no login. The policies below deliberately let the
--  anonymous (anon) key read AND write every table, because the
--  app ships that key in the browser and nobody signs in.
--
--  What that means in practice: anyone who has the site URL can
--  add, edit and delete trip content and photos. That is the
--  trade-off we chose for a family trip site. If the link ever
--  spreads further than you want, see README.md → "Locking it down".
-- ============================================================


-- ------------------------------------------------------------
--  1. Photos  (metadata; the files themselves live in Storage)
-- ------------------------------------------------------------
create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  city          text        not null check (city in ('texas','vegas')),
  storage_path  text        not null unique,
  caption       text,
  added_by      text,
  created_at    timestamptz not null default now()
);

create index if not exists photos_city_created_idx
  on public.photos (city, created_at desc);


-- ------------------------------------------------------------
--  2. Packing checklist state
--     One row per checklist item. item_key is a stable slug
--     generated from the item's position in the HTML, e.g.
--     "texas-wear-0". Item text stays in index.html; only the
--     ticked/unticked state lives here.
-- ------------------------------------------------------------
create table if not exists public.packing_state (
  item_key    text        primary key,
  checked     boolean     not null default false,
  updated_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
--  3. Itinerary stops
--     day_key values: '1','2','3' for Dallas (Fri/Sat/Sun),
--     'v1' for the Las Vegas day. sort_order controls display
--     order within a day; gaps of 10 leave room to insert.
-- ------------------------------------------------------------
create table if not exists public.stops (
  id           uuid primary key default gen_random_uuid(),
  city         text        not null check (city in ('texas','vegas')),
  day_key      text        not null,
  time_label   text,
  title        text        not null,
  description  text,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists stops_day_idx
  on public.stops (city, day_key, sort_order);


-- ------------------------------------------------------------
--  4. Free-text notes, one per day
-- ------------------------------------------------------------
create table if not exists public.day_notes (
  city        text        not null check (city in ('texas','vegas')),
  day_key     text        not null,
  body        text        not null default '',
  updated_at  timestamptz not null default now(),
  primary key (city, day_key)
);


-- ============================================================
--  Row Level Security
--  RLS is ON for every table, with explicit open policies —
--  rather than RLS off — so that tightening access later is a
--  matter of editing one policy instead of restructuring.
-- ============================================================

alter table public.photos        enable row level security;
alter table public.packing_state enable row level security;
alter table public.stops         enable row level security;
alter table public.day_notes     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['photos','packing_state','stops','day_notes'] loop
    execute format('drop policy if exists %I on public.%I', 'open_access_' || t, t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      'open_access_' || t, t
    );
  end loop;
end $$;


-- ============================================================
--  Storage bucket for the shared photo album
--  If this section errors with a permissions message, create the
--  bucket in the dashboard instead: Storage → New bucket →
--  name "trip-photos" → toggle Public ON. Then re-run just the
--  policy block below.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "trip photos are publicly readable" on storage.objects;
create policy "trip photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'trip-photos');

drop policy if exists "anyone can add trip photos" on storage.objects;
create policy "anyone can add trip photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'trip-photos');

drop policy if exists "anyone can remove trip photos" on storage.objects;
create policy "anyone can remove trip photos"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'trip-photos');
