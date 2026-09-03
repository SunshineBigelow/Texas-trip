-- ============================================================
--  Dallas & Las Vegas Trip App — seed data
--  Run AFTER schema.sql, in the Supabase SQL Editor.
--
--  This loads the itinerary that was originally hardcoded in
--  index.html into the stops table, so the database starts out
--  matching the app exactly and no curated research is lost.
--
--  Guarded: if public.stops already has rows, this does nothing,
--  so re-running it will never duplicate your itinerary or wipe
--  edits the family has made.
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
