# EAP AI Commons

Shared resources for using AI in English for Academic Purposes (EAP) teaching,
learning and professional practice — a clean, monochrome dark-mode library of
documents and links contributed by the community.

Implemented from a Claude Design handoff bundle as a static HTML/CSS/JS site.

## Pages

- **`EAP AI Commons.html`** — home: hero, a 2×3 grid of the six categories
  (Skills · Artefacts · Frameworks · Docs · Links · Other), a contribute band,
  and a recently-added list.
- **`Browse.html`** — sidebar with live category / level / type filters, sort
  (newest / A–Z), and a card ↔ list view toggle. Opens filtered when reached via
  a category card (`#cat=skills`).
- **`Artefact.html`** — detail view: breadcrumb, document preview (or external
  link card), a "How to use it" callout, full metadata panel, related items, and
  a ratings + comments section. Routed by `#id=<artefact>`.
- **`Search.html`** — results page with live filtering, relevance ranking and
  match highlighting; submitted from the nav search box (or ⌘K) on any page.

## Shared layer

- `commons.css` — design tokens (overridable by the Tweaks panel) and shared chrome.
- `commons-data.js` — categories, artefacts and seed ratings/comments (sample data).
- `commons.js` — upload modal, nav search wiring, and render helpers.
- `social.js` — ratings + comments, persisted per-visitor in `localStorage`.
- `tweaks-panel.jsx` / `tweaks-home.jsx` — the floating Tweaks panel
  (accent / corners / density), mounted via React + Babel.

Navigation uses URL hashes (`#id=`, `#cat=`, `#q=`) so every page resolves when
opened directly. Ratings, comments and uploads are a front-end prototype with no
backend — contributions persist locally in the browser only.

## Running

Static files — open `EAP AI Commons.html` in a browser, or serve the folder:

```
python3 -m http.server
```
