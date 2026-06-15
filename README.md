# EAP AI Commons

Shared resources for using AI in English for Academic Purposes (EAP) teaching,
learning and professional practice — a clean, monochrome dark-mode library of
documents and links, backed by Supabase.

Implemented from a Claude Design handoff bundle: a static HTML/CSS/JS front end
talking to a Supabase (Postgres + Storage + Auth) backend.

## Pages

- **`EAP AI Commons.html`** — home: hero, a 2×3 grid of the six categories
  (Skills · Artefacts · Frameworks · Docs · Links · Other), and a contribute band.
  Category counts and the stat line are rendered from the database.
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
- `supabase-client.js` — Supabase client, the per-browser `visitorId()`, relative
  time formatting, and the `Auth` helper (sign in/up, admin check).
- `commons-data.js` — async data access (`loadData()`); populates `CATEGORIES`,
  `ARTEFACTS`, `TOTAL`, `CONTRIBUTORS` from the database.
- `commons.js` — admin-gated upload modal (file upload to Storage / link), nav
  search wiring, and render helpers.
- `social.js` — ratings + comments backed by the database.
- `tweaks-panel.jsx` / `tweaks-home.jsx` — the floating Tweaks panel
  (accent / corners / density), mounted via React + Babel.

Navigation uses URL hashes (`#id=`, `#cat=`, `#q=`) so every page resolves when
opened directly.

## Backend (Supabase)

Project ref `yeqykdtclexxexzvzvlb` · `https://yeqykdtclexxexzvzvlb.supabase.co`.
The URL and publishable key live in `supabase-client.js` — both are safe to ship
to the browser; access is enforced server-side by Row Level Security.

### Schema

- `categories` — the six fixed buckets (id, idx, name, blurb, examples).
- `artefacts` — documents or links: type, category, title, description, how-to,
  tags, level, contributor, format, and either a `link_url` or a `file_path` into
  Storage.
- `ratings` — one row per (artefact, visitor); a visitor can update their own.
- `comments` — public comments tied to a `visitor_id` (so the UI can mark "yours").
- `admins` — auth users allowed to publish/edit artefacts.
- `artefact_rating_stats` — view: count, average and per-star distribution.
- Storage bucket `artefacts` — uploaded PDF/Word/PowerPoint files (public read via
  object URL, admin-only writes).

### Access model (moderated library)

- **Anyone** can read everything, rate (via the `submit_rating` RPC), and comment.
- **Only admins** can publish/edit artefacts and upload files — enforced by RLS
  and the `is_admin()` check, not just the UI.

### Becoming an editor

1. Open the Upload modal and create an account (email + password).
2. If email confirmation is enabled in Supabase Auth, confirm, then sign in.
3. The first signed-in user can click **Become an editor** — `claim_first_admin()`
   grants admin while the `admins` table is empty. After that, add further admins
   from an existing admin account, or via SQL:
   `insert into admins(user_id, email) values ('<auth-user-uuid>', '<email>');`

### Security advisor notes

`get_advisors` reports two `WARN`s: `is_admin()` and `submit_rating()` are
`SECURITY DEFINER` functions executable by `anon`/`authenticated`. This is
intentional — both only ever act on the caller's own context (`is_admin()`
reflects only the caller's status; `submit_rating()` validates its inputs and is
keyed by a client-supplied visitor id). This is the standard Supabase pattern for
an RLS helper and a public upsert.

## Running

Static files — serve the folder (don't use `file://`, as the Supabase client and
ES modules need an HTTP origin):

```
python3 -m http.server
```

Then open <http://localhost:8000/EAP%20AI%20Commons.html>.
