-- ============================================================
--  Dallas & Las Vegas Trip App — complete database setup
-- ============================================================
--
--  HOW TO RUN THIS
--    1. Open your Supabase project
--    2. Click "SQL Editor" in the left sidebar
--    3. Click "New query"
--    4. Paste this entire file
--    5. Click "Run"
--
--  That's it — one paste, one click. It creates the tables, the
--  security policies, the photo storage bucket, and loads the
--  starting itinerary.
--
--  Safe to run more than once. Re-running will not duplicate the
--  itinerary or erase edits the family has made.
--
--  If you see an error, copy the whole message back to Claude —
--  the storage section near the bottom is the part most likely to
--  need adjusting, and it has a fallback noted inline.
--
-- ------------------------------------------------------------
--  ACCESS MODEL: "anyone with the link".
--  There is no login. The policies below deliberately let the
--  anonymous (anon) key read AND write every table, because the
--  app ships that key in the browser and nobody signs in.
--
--  What that means in practice: anyone who has the site URL can
--  add, edit and delete trip content and photos. That is the
--  trade-off chosen for a family trip site. To change it, see
--  README.md → "Locking it down".
-- ============================================================


-- ============================================================
--  PART 1 — TABLES
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
--  PART 2 — ROW LEVEL SECURITY
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
--  PART 3 — STORAGE BUCKET for the shared photo album
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


-- ============================================================
--  PART 4 — STARTING ITINERARY
--  Loads the plan that ships in index.html into the stops table,
--  so the database starts out matching the app exactly and no
--  curated research is lost. Guarded: does nothing if the table
--  already has rows.
-- ============================================================

insert into public.stops (city, day_key, time_label, title, description, sort_order)
select v.city, v.day_key, v.time_label, v.title, v.description, v.sort_order
from (values

  -- ---------- Dallas · Friday 10/16 ----------
  ('texas', '1', '11:44 AM', 'Arrive Dallas-Fort Worth — Delta #2798',
   'Landing from Salt Lake City. Gate seat assignment, so allow a little extra time getting off the plane.', 10),

  ('texas', '1', 'Afternoon', 'Klyde Warren Park',
   'An easy first stop after landing — a deck park built over a freeway with a playground, food trucks, and lawn games. Low-key way to stretch legs after travel.', 20),

  ('texas', '1', 'Evening', 'Dinner nearby',
   'The Exchange Food Hall or Rodeo Goat are both a short drive from downtown and flexible for picky eaters — see the Food tab.', 30),

  -- ---------- Dallas · Saturday 10/17 ----------
  ('texas', '2', 'All day', 'State Fair of Texas, Fair Park',
   'Go on a Saturday for the full atmosphere: midway rides, the auto show, livestock barns, and fried everything. Fair Park is walkable, but plan for a long day — arrive early to beat crowds and heat.', 10),

  ('texas', '2', 'If time', 'Children''s Aquarium at Fair Park',
   'Right on the fairgrounds — stingray touch tank and axolotls, a good cooler-down break between fair attractions for younger kids.', 20),

  -- ---------- Dallas · Sunday 10/18 ----------
  ('texas', '3', 'Morning', 'The Dallas World Aquarium',
   'Part aquarium, part zoo — jaguars, sloths, and bats alongside the fish tanks. Go early; it gets tight with strollers by midday.', 10),

  ('texas', '3', 'Midday', 'Museum of Illusions',
   'Self-guided, interactive, about an hour — good option if anyone in the group needs a break from walking-heavy stops.', 20),

  ('texas', '3', 'Sunset', 'Reunion Tower',
   'The GeO-Deck gives a 360° view of the skyline — best right at sunset when the city lights start coming on.', 30),

  -- ---------- Las Vegas · Monday 10/19 ----------
  ('vegas', 'v1', '7:35 AM', 'Depart Dallas — Southwest #1368',
   'Leaves Dallas Love Field (DAL) 7:35am. This is an early one, so bags should be packed and ready to go the night before — no time for a Dallas stop that morning.', 10),

  ('vegas', 'v1', '8:30 AM', 'Arrive Las Vegas — Southwest #1368',
   'Staying with your nephew visiting from Korea.', 20),

  ('vegas', 'v1', 'Free', 'Bellagio Conservatory & Botanical Gardens',
   'Free seasonal floral display inside the Bellagio — an easy, low-key first stop and usually the least crowded in the morning.', 30),

  ('vegas', 'v1', 'Free', 'Flamingo Wildlife Habitat',
   'A shaded, tropical courtyard inside the Flamingo with real flamingos, koi, and turtles — a nice break from the casino floor and free to walk through.', 40),

  ('vegas', 'v1', '1–2 hrs', 'Shark Reef Aquarium, Mandalay Bay',
   'Sharks, a stingray touch tank, and a shipwreck room — a reliable hit for kids and grandkids alike. Around $29/adult, $24/kid.', 50),

  ('vegas', 'v1', '1–1.5 hrs', 'Museum of Illusions, Las Vegas',
   'Same interactive concept as the Dallas one, different exhibits — skip if you already did the Dallas location, otherwise a fun rainy-day-proof option.', 60),

  ('vegas', 'v1', 'Evening', 'The Sphere',
   'Worth it if the group wants one splashy, only-in-Vegas experience — book ahead, since shows and tickets sell out and it runs pricier than a typical outing.', 70)

) as v(city, day_key, time_label, title, description, sort_order)
where not exists (select 1 from public.stops);
