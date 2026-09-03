# Dallas & Las Vegas Trip App — Handoff Document

This document explains what the app is, how it's built, and how to rebuild or modify it if you move the code somewhere else.

---

## 1. What it is

A single self-contained HTML file: `dallas-family-trip.html`

- No build step, no server, no dependencies to install.
- Open it directly in any browser (double-click, or drag into a browser tab).
- Everything (CSS, JavaScript, images) is inside that one file.
- The only external resource is a Google Fonts stylesheet, so text falls back to system fonts if you're offline.

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

Two levels of navigation, and this is the main thing to understand before editing:

**Top level — tabs (in the dark navy header):**
`Weather` · `Places` · `Food` · `What to Wear` · `Pictures`

**Second level — big buttons (below the header):**
`Texas` · `Las Vegas`

You pick the category first, then the city. The visible content is whichever panel matches *both* the current tab and the current city.

That gives 10 content panels total (5 tabs × 2 cities).

---

## 4. How the code decides what to show

Every content panel is a `<div class="panel">` carrying two data attributes:

```html
<div class="panel" id="panel-food-vegas" data-city="vegas" data-tab="food">
```

Two JavaScript variables track state:

```js
let currentCity = 'texas';
let currentTab  = 'weather';
```

The `render()` function shows the one panel where both attributes match, and hides everything else:

```js
p.classList.toggle('active', p.dataset.city === currentCity && p.dataset.tab === currentTab);
```

`render()` also controls the hero photo — it only appears on the **Weather** tab, and swaps between the Texas photo and the Vegas photo based on `currentCity`.

**To add a new tab:** add a `<button class="tab-btn" data-tab="yourtab">` in the header, then add two panels (`data-city="texas"` and `data-city="vegas"`) with `data-tab="yourtab"`. No JS changes needed — the existing listeners pick it up automatically.

---

## 5. The day-picker inside Places

The Places tab has a second, smaller row of day buttons. Texas has three days, Vegas has one. These are scoped by a `data-group` attribute so the two cities' day-pickers don't interfere with each other:

```html
<button class="day-btn" data-group="texas" data-day="2">Sat 10/17</button>
<div class="day-panel" data-group="texas" id="day-2"> ... </div>
```

The click handler only toggles buttons and panels sharing the same `data-group`. If you add days, keep the `data-group` and make sure `data-day="X"` matches an element with `id="day-X"`.

---

## 6. The Pictures tab

Each city has an upload button and a photo grid:

- `photoUploadTexas` → `photoGridTexas`
- `photoUploadVegas` → `photoGridVegas`

Wired up by `setupUpload(inputId, gridId)`. It reads files with `FileReader`, converts them to data URLs, and appends each as a `.photo-item` div containing an `<img>` plus a small round **×** remove button.

**Important limitation:** photos live in memory only. They disappear when the page is closed or reloaded, and they are *not* shared between people — if your nephew uploads a photo on his phone, you won't see it on yours. If you want a shared album, use Google Photos alongside this app rather than trying to make this file do it.

To make photos persist for a single user, you'd swap the in-memory approach for `localStorage`. That works in a normal browser but be aware it has a size cap of roughly 5–10 MB, which fills up fast with photos.

---

## 7. The two hero images

Both are embedded as base64 data URIs directly in the HTML (not linked files), which is why the file is self-contained but fairly large.

| Element ID | Image |
|---|---|
| `heroFeatureTexas` | Fort Worth Stockyards cattle drive |
| `heroFeatureVegas` | The Sphere lit up at night |

**To swap an image:** find the `<img src="data:image/jpeg;base64,...">` inside the relevant `hero-feature-inner` div and replace the base64 string. To generate one:

```bash
# Resize/compress first — full-size photos bloat the file badly
# then:
base64 -w0 yourphoto.jpg
```

Keep source images around 800–900px wide at JPEG quality ~75. Larger images make the file slow to email or upload.

---

## 8. Design tokens

All colors are CSS variables at the top of the `<style>` block — change them in one place:

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

Fonts: **Big Shoulders Display** (headings, numbers) and **Karla** (body), both from Google Fonts.

Layout is mobile-first with breakpoints at `520px` that collapse the packing-list grid to one column and stack food items vertically.

---

## 9. Weather data caveat

The weather numbers are **climate averages for mid-October, not a live forecast** — the trip was more than 7 weeks out when the app was built, which is beyond any forecast range.

- Dallas: highs 78–80°F, lows 58–59°F, ~15–20% rain chance
- Las Vegas: high 82°F, low 56°F, ~5% rain chance

Before the trip, recheck a real forecast (they extend 7–10 days out) and update the numbers in the `.dayw-card` blocks.

---

## 10. Sharing it

Since it's one file, any of these work:

- Email it as an attachment
- Text / iMessage / WhatsApp as a file
- AirDrop between Apple devices
- Upload to Google Drive or Dropbox and share the link
- Drag onto **Netlify Drop** (netlify.com/drop) for an instant public URL

Each person gets an independent copy — no data syncs between them.

---

## 11. Things that were removed along the way

Noting these so you don't rebuild them by accident:

- **A Map tab** with embedded Google Maps and tappable pins for both cities — removed on request. Some leftover CSS (`.map-embed`, `.pin`, `.map-city-label`) is still in the stylesheet and can be deleted or reused.
- **A Monday itinerary for Dallas** — removed because the 7:35 AM flight leaves no time for anything. The flight details moved to the Vegas Places tab instead.

---

## 12. Quick reference — where to find things

| To change... | Look for... |
|---|---|
| Colors | `:root` variables at top of `<style>` |
| Title / dates | `.hero-inner` near the start of `<body>` |
| Tab buttons | `<div class="tabs" id="tabsBar">` |
| City buttons | `<div class="city-switch-row" id="citySwitchRow">` |
| Hero photos | `<div class="hero-feature">` |
| Any content | The panel with matching `data-city` + `data-tab` |
| Show/hide logic | `function render()` in the `<script>` block |
| Photo uploads | `function setupUpload()` |
