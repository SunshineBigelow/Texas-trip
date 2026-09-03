# Dallas & Las Vegas Trip

A family trip app for **Fri Oct 16 – Mon Oct 19, 2026**. Static HTML, hosted free on GitHub Pages, with Supabase behind it for the parts that need to be shared between people.

- **Weather · Places · Food · What to Wear · Pictures**, each split between **Texas** and **Las Vegas**.
- The photo album, packing checkboxes, and itinerary edits are **shared** — everyone with the link sees the same thing on any device.
- Everything else is plain HTML and works with no network at all.

---

## Setup

Three steps. Budget about fifteen minutes.

### 1. Create the database tables

In your Supabase project: **SQL Editor → New query →** paste the whole of `supabase/setup.sql` **→ Run**.

One paste, one click. It creates the tables, the security policies, the photo storage bucket, and loads the starting itinerary. Safe to run more than once — it won't duplicate the itinerary or erase anyone's edits.

> If it errors on the storage section with a permissions message, create the bucket by hand instead — **Storage → New bucket → name `trip-photos` → toggle Public ON** — then re-run the file.

### 2. Point the app at your project

In Supabase go to **Project Settings → API** and copy two values into `config.js`:

```js
window.TRIP_CONFIG = {
  supabaseUrl:     'https://xxxxxxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJhbGci...',
  photoBucket: 'trip-photos'
};
```

Use the key labelled **anon / public**. It belongs in the browser and is fine to commit — access is controlled by the security policies in `setup.sql`, not by keeping this key secret.

**Never put the `service_role` key here.** That one bypasses every security policy.

### 3. Publish it

**Settings → Pages → Source: Deploy from a branch**, pick your branch, folder `/ (root)`, Save. A minute later the site is live at:

```
https://sunshinebigelow.github.io/Texas-trip/
```

Share that link with the family. There's no login — the link *is* the access.

---

## Who can do what

You chose the simplest access model: **anyone with the link can view and edit.** No accounts, no passwords, nothing for your nephew to sign up for on his phone in Korea.

The trade-off is real and worth naming: anyone who ends up with that URL can add or delete photos and itinerary items. For a family trip site nobody is advertising, that's usually fine. If it ever stops being fine, see **Locking it down** below.

---

## What syncs, and what happens offline

| | Stored where | If there's no signal |
|---|---|---|
| Weather, food, museums, flight times | In `index.html` | Works normally |
| Packing checkboxes | Supabase + local mirror | Ticks still work, saved on that device, sync when back online |
| Itinerary stops & day notes | Supabase | Falls back to the built-in plan; edits are disabled |
| Photos | Supabase Storage | Album can't load |

The app never shows a blank screen because the network is down. If it can't reach Supabase it says so in a banner and shows the built-in trip plan instead.

Photos are shrunk to 1600px in the browser before uploading, so a phone photo lands around 300 KB instead of 5 MB. Supabase's free tier gives you 1 GB — roughly 3,000 photos at that size.

---

## Files

```
index.html          The whole app: content, layout, styles
app.js              Navigation + all the Supabase syncing
config.js           Your two Supabase values — the only file you must edit
img/                The two hero photos
supabase/
  setup.sql         Everything: tables, policies, bucket, starting itinerary
HANDOFF.md          How the app is put together, and how to change it
```

---

## Making changes

Content lives in `index.html` and is meant to be edited by hand — see `HANDOFF.md` for the map of what's where. The short version:

- **Colors** — the `:root` block at the top of the `<style>` section.
- **Any content panel** — find the `<div class="panel">` whose `data-city` and `data-tab` match what you're looking for.
- **Itinerary** — edit it in the running app instead; those changes save to Supabase and everyone sees them.

### Before you fly

**Update the weather.** The numbers on the Weather tab are historical mid-October averages, not a forecast — they were the only option when the app was built. Around **Oct 9** a real 7–10 day forecast will cover the trip. Replace the numbers in the `.dayw-card` blocks and soften the caveat in the `.note-box` underneath.

Also worth re-confirming closer to the date: the State Fair's closing date, and museum hours (the DMA and Sixth Floor Museum are closed Mondays and Tuesdays).

### Locking it down

If the link spreads further than you'd like, in ascending order of effort:

1. **Rotate the URL** — rename the repo. The old link dies immediately.
2. **Make writes read-only** — in `setup.sql`, change the `for all` policies to `for select`. Everyone can still view; nobody can change anything.
3. **Add real logins** — turn on Supabase Auth and scope the policies to `authenticated`. Most work, and it means everyone needs an account.

---

## Local development

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` as a `file://` URL also mostly works, but browsers restrict some features there, so the server is the safer way to check your changes.
