# Dallas & Las Vegas Trip App — Handoff Document

How the app is built and how to change it. For *setup and deployment*, see `README.md`.

> **This document was updated when the app moved from Claude Chat to GitHub + Supabase.** It used to describe one self-contained HTML file. That's still the heart of it, but the photo album, packing checkboxes, and itinerary are now backed by a database so they can be shared between people. Section 12 lists exactly what changed.

---

## 1. What it is

A static site — no build step, no framework, no `npm install`.

```
index.html   content, layout, styles
app.js       navigation + Supabase syncing
config.js    your two Supabase values
img/         two hero photos
```

Open `index.html` in a browser and it works. Everything the family researched renders with no JavaScript and no network. Supabase is layered on top for the three things plain HTML can't do: a shared photo album, a synced packing checklist, and an editable itinerary.

**The design rule to preserve if you change anything:** the app must stay useful with no signal. Every database feature has a fallback, and none of them can blank the page.

---

## 2. The trip it covers

| | |
|---|---|
| Travelers | Family trip; staying in Vegas with a nephew visiting from Korea |
| Fri 10/16 | Delta #2798 — Salt Lake City → Dallas-Fort Worth, arrives 11:44 AM |
| Sat 10/17 | Dallas |
| Sun 10/18 | Dallas |
| Mon 10/19 | Southwest #1368 — Dallas Love Field (DAL) 7:35 AM → Las Vegas (LAS) 8:30 AM |

**Key trip fact baked into the content:** the State Fair of Texas 2026 runs Sept 25 – Oct 18 at Fair Park, so it overlaps all three Dallas days. The Saturday itinerary is built around it.

---

## 3. Navigation model

Two levels, and this is the main thing to understand before editing:

**Top level — tabs (in the dark navy header):**
`Weather` · `Places` · `Food` · `What to Wear` · `Pictures`

**Second level — big buttons (below the header):**
`Texas` · `Las Vegas`

You pick the category first, then the city. The visible content is whichever panel matches *both*. That's 10 panels (5 tabs × 2 cities).

Every panel carries two data attributes:

```html
<div class="panel" id="panel-food-vegas" data-city="vegas" data-tab="food">
```

`render()` in `app.js` shows the one panel where both match:

```js
p.classList.toggle('active', p.dataset.city === currentCity && p.dataset.tab === currentTab);
```

It also controls the hero photo — visible only on the **Weather** tab, swapping between the two cities.

**To add a tab:** add a `<button class="tab-btn" data-tab="yourtab">` in the header, then two panels (`data-city="texas"` and `data-city="vegas"`) with `data-tab="yourtab"`. No JS changes — the existing listeners pick it up.

---

## 4. The day-picker inside Places

A second, smaller row of day buttons. Texas has three days, Vegas has one. Scoped by `data-group` so the two cities don't interfere:

```html
<button class="day-btn" data-group="texas" data-day="2">Sat 10/17</button>
<div class="day-panel" data-group="texas" id="day-2" data-city="texas" data-day-key="2">
  <div class="stop-list"> ... </div>
</div>
```

The click handler only touches buttons and panels sharing a `data-group`. If you add days, keep `data-group`, make `data-day="X"` match `id="day-X"`, and add `data-city` + `data-day-key` so the database can find it.

---

## 5. The itinerary (database-backed)

Each day panel holds a `.stop-list`. The `.stop` divs inside it are the **offline fallback**, and they're also what `supabase/setup.sql` loads into the database, so the two start out identical.

On load, `loadStops()` reads the `stops` table and replaces the contents of every `.stop-list`. Two deliberate refusals to overwrite:

- If the query **fails**, the static HTML stays put.
- If the table is **empty** (seed never ran), the static HTML stays put — rather than showing an empty itinerary.

Editing controls (`Edit` / `Delete` / `+ Add a stop`) are only built when a database connection exists, since without one they'd do nothing.

Each day also has a free-text notes box, saved to `day_notes` 800 ms after you stop typing. A reload won't overwrite a note you're actively typing in.

**To change the itinerary,** edit it in the running app — that's the point of it being editable. Edit the HTML only if you want to change the offline fallback too.

---

## 5b. Languages (English / 한국어)

A pill at the right of the eyebrow row switches the whole app. The choice is
saved in `localStorage`; with no saved choice, a Korean-language device opens in
Korean, so family arriving from Korea don't have to hunt for the switch.

Korean lives in three places, one per kind of text:

| Kind of text | Where the Korean lives |
|---|---|
| Page copy (headings, food, weather, packing) | `data-ko` attribute on the element in `index.html` |
| Strings `app.js` builds (buttons, confirms, status) | the `STRINGS` table near the top of `app.js` |
| Itinerary rows | `title_ko` / `description_ko` / `time_label_ko` columns |

`applyLanguage()` swaps `textContent` for every `[data-ko]` element, caching the
original English in `data-en` the first time, so switching back is lossless.

Three things to know before editing this:

- **Never put `data-ko` on an element whose contents JavaScript replaces.** The
  packing list is the cautionary tale: `setupPacking()` swaps each `<li>` for a
  checkbox label, so the translation is handed down to the inner `.pack-text`
  span. Translating the `<li>` itself would delete the checkbox.
- **Everything falls back to English.** `stopField()` uses a Korean column only
  when it is non-empty, so a stop the family adds themselves appears in both
  languages rather than vanishing from one.
- **Editing in Korean writes only the `_ko` columns**, so a translation can't
  overwrite the English original. The exception is *adding* a stop in Korean:
  `title` is `NOT NULL`, so both columns take the Korean text and English
  readers see Korean rather than a blank row.

Korean typography is handled by the `html[lang="ko"]` rules: Noto Sans KR (the
Latin display face has no Hangul at all), looser line height, and
`word-break: keep-all` so Hangul breaks between words instead of mid-word.

---

## 6. The packing checklist

The item *text* stays in `index.html`. Only the ticked state is stored, keyed by each `<li>`'s `data-key`:

```html
<li data-key="tx-pack-sunscreen">Sunscreen — afternoons still hit near-80°F sun</li>
```

`setupPacking()` wraps each item's text in a label with a checkbox. State goes to the `packing_state` table and is mirrored to `localStorage`, so ticks survive a reload with no signal.

**Keys are slugs, not positions** (`tx-pack-sunscreen`, not `tx-pack-3`), so reordering or inserting items won't scramble what's already ticked. If you add an item, give it a new unique `data-key`. If you *rename* an item, keep its key to preserve its ticked state.

---

## 7. The Pictures tab

Photos upload to the Supabase Storage bucket `trip-photos`; a row in the `photos` table records which city, the storage path, and an optional uploader name (remembered in `localStorage`).

Before upload, `downscale()` shrinks each image to 1600px at JPEG quality 0.82 using a canvas — a 5 MB phone photo becomes roughly 300 KB. This matters more than it sounds: it's the difference between an album that loads on hotel wifi and one that doesn't. EXIF rotation is handled via `imageOrientation: 'from-image'`. Anything that can't be decoded (some HEIC files) uploads unchanged rather than failing.

Deleting removes both the storage object and the table row, **for everyone** — there's a confirm dialog, but no undo.

With no database configured, the tab falls back to the original in-memory behaviour: photos appear, but vanish on reload and aren't shared.

---

## 8. The two hero images

Previously base64 data URIs inside the HTML, which made the file 308 KB and painful to edit. Now ordinary files:

| Element ID | File |
|---|---|
| `heroFeatureTexas` | `img/stockyards.jpg` — Fort Worth Stockyards cattle drive |
| `heroFeatureVegas` | `img/sphere.jpg` — The Sphere at night |

To swap one, replace the file. Keep them around 800–900px wide at JPEG quality ~75.

---

## 9. Design tokens

All colors are CSS variables at the top of the `<style>` block:

```css
:root{
  --cream: #F5EFE1;   /* page background */
  --paper: #FBF7EC;   /* cards */
  --ink:   #241C15;   /* body text */
  --navy:  #22314F;   /* header, active buttons */
  --rust:  #BC4B2C;   /* accents, temps, upload button */
  --gold:  #DDA323;   /* active tab underline, note boxes */
  --oak:   #4B5D3A;   /* small tag text */
  --line:  rgba(36,28,21,0.15);
}
```

Fonts: **Big Shoulders Display** (headings, numbers) and **Karla** (body), from Google Fonts, with system fallbacks if you're offline. Mobile-first, with a breakpoint at `520px` that collapses the packing grid to one column and stacks food items.

---

## 10. Weather data caveat

The weather numbers are **climate averages for mid-October, not a live forecast** — the trip was more than 7 weeks out when the app was built, beyond any forecast range.

- Dallas: highs 78–80°F, lows 58–59°F, ~15–20% rain chance
- Las Vegas: high 82°F, low 56°F, ~5% rain chance

**Around Oct 9** a real 7–10 day forecast will reach the trip dates. Update the numbers in the `.dayw-card` blocks and soften the caveat in the `.note-box` below them.

---

## 11. Quick reference

| To change... | Look for... |
|---|---|
| Colors | `:root` variables at top of `<style>` |
| Title / dates | `.hero-inner` near the start of `<body>` |
| Tab buttons | `<div class="tabs" id="tabsBar">` |
| City buttons | `<div class="city-switch-row" id="citySwitchRow">` |
| Hero photos | files in `img/` |
| Any content | The panel with matching `data-city` + `data-tab` |
| Show/hide logic | `render()` in `app.js` |
| Itinerary | The running app, or `supabase/setup.sql` for the starting set |
| Packing items | `.pack-list li[data-key]` in `index.html` |
| Database tables | `supabase/setup.sql` |
| Korean page copy | the `data-ko` attribute beside the English text |
| Korean button/status text | the `STRINGS` table near the top of `app.js` |
| Korean itinerary | `supabase/translate-korean.sql`, or just edit in the app in Korean |

---

## 12. What changed in the move to GitHub + Supabase

- **Photos are shared and permanent.** Previously in-memory only — gone on reload, invisible to everyone else. This was the main thing the move was for.
- **Packing checkboxes exist**, and sync.
- **The itinerary is editable in the app** and shared, with the original hardcoded plan kept as an offline fallback.
- **Hero images moved out of the HTML** into `img/`; `index.html` went from 308 KB to about 33 KB.
- **JavaScript moved to `app.js`.**
- The site is deployed on GitHub Pages instead of being emailed around as a file.

## Things that were removed along the way

Noting these so you don't rebuild them by accident:

- **A Map tab** with embedded Google Maps and tappable pins — removed on request. Leftover CSS (`.map-embed`, `.pin`, `.map-city-label`) is still in the stylesheet and can be deleted or reused.
- **A Monday itinerary for Dallas** — removed because the 7:35 AM flight leaves no time for anything. The flight details moved to the Vegas Places tab.
