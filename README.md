# EAP AI Commons

Shared resources for using AI in English for Academic Purposes (EAP) teaching,
learning and professional practice — a clean, monochrome dark-mode library of
documents and links, backed by Supabase.

Implemented from a Claude Design handoff bundle: a static HTML/CSS/JS front end
talking to a Supabase (Postgres + Storage + Auth) backend.

## Readings library — "AI Commons for Education"

The site's front door (`index.html` → `Library.html`) is a community **reading
commons**: a curated, votable, rateable, discussable index of articles and
websites on AI in higher education. Built from the `Library.dc.html` handoff;
the artefact pages below remain and will be re-skinned into the same shell.

- **`Library.html`** — a single-page app with two screens: a **home** (hero,
  "How it works", category grid, "Top rated") and an **app** (sidebar search /
  Read-later / category nav / Suggest-a-link + a main pane of ranked reading rows
  with upvote/score, inline star rating, tags, and a comment thread). Own visual
  system (IBM Plex Mono + Helvetica Neue) with a **light/dark theme toggle**.
- `edu.css` — readings design tokens (light/dark via `[data-theme]`), scoped
  under `.edu` so it never collides with the artefact pages' `commons.css`.
- `readings-data.js` — async data access for readings, categories, the visitor's
  votes/ratings, and comments; Read-later lives in `localStorage`.
- `readings.js` — the app logic (`EDUApp.mount(el)`): render + all interactions.

### Readings backend

- `reading_categories` — the 6 community buckets (policy, pedagogy, ethics,
  research, tools, student).
- `readings` — external article/website rows with a `status` (`pending` /
  `approved`): **anyone can suggest** via the `suggest_reading()` RPC, landing in
  a moderation queue; only admins approve (RLS).
- `reading_votes` + `vote_reading()` RPC — one −1/0/+1 vote per visitor; `score`
  is `base_score + Σ votes` (the `reading_cards` view, `security_invoker`).
- `add_reading_tag()` RPC — append-only community tagging on approved readings.
- **Polymorphic social**: `ratings`/`comments` gained `target_type` + `target_id`
  (kept in sync with `artefact_id` by a trigger), a generic `rating_stats` view,
  and a `submit_rating` overload — so readings reuse the same engine while the
  artefact pages keep working unchanged.

### Moderating readings

Signed-in editors get an **Editor sign-in** link in the readings sidebar (claim
the first admin via "Become an editor" while the `admins` table is empty). Once
an admin, a **Review queue** appears in the sidebar listing pending suggestions
with **Approve & publish** / **Reject** — backed by the readings UPDATE RLS
policy, so non-editors can never moderate even if they reach the view.

### Shareable reading pages

Every approved reading has a static, crawlable page at `r/<id>.html` with proper
`<title>`/description/OpenGraph/Twitter meta (so links unfurl and rank), a
readable themed view, a "Read the original" link, and a "Rate & discuss" link
back into the app (`Library.html#id=<id>`). A **Share** link on each row in the
app points to it, and `sitemap.xml` lists them all.

These are plain static files (no runtime server). Regenerate them whenever the
approved readings change:

```
node tools/build-reading-pages.mjs                 # fetch live data from Supabase
node tools/build-reading-pages.mjs --data file.json # or build from a JSON array
```

### Unified app

Artefacts now live **inside the readings app** (`Library.html`) as a second
section — a Readings | Artefacts toggle in the sidebar switches between the
community readings index and the EAP artefacts library, sharing one design
system, one theme, and the polymorphic ratings/comments engine. Admins publish
artefacts (file upload to Storage, or a link) from an in-app modal; `ART`
(`artefacts-data.js`) is the artefact data layer.

The old standalone artefact pages (`EAP AI Commons.html`, `Browse.html`,
`Artefact.html`, `Search.html`) are retired — they now redirect into the app
(`Library.html#artefacts`, preserving a deep-linked artefact id). Their former
shared layer (`commons.*`, `social.js`, `tweaks-*.jsx`) is no longer loaded.

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

The remaining `get_advisors` `WARN`s are intentional: the public RPCs
(`is_admin`, `submit_rating`, `vote_reading`, `suggest_reading`,
`add_reading_tag`, `claim_first_admin`) are `SECURITY DEFINER` functions
executable by `anon`/`authenticated` — each only ever acts on the caller's own
context and validates its inputs. This is the standard Supabase pattern for an
RLS helper and a public upsert. The internal rate-limit helpers
(`_client_ip_hash`, `_rate_guard`) are **not** callable through the REST API
(EXECUTE revoked from `anon`/`authenticated`), `rating_stats` runs as
`security_invoker`, and `sync_social_target` has a pinned `search_path`.
`app_config` and `rate_hits` are deliberately deny-all (RLS enabled, no
policies) — only `SECURITY DEFINER` functions touch them.

One advisor item must be toggled in the dashboard, not SQL: enable **leaked
password protection** under Auth → Passwords.

## Running

Static files — serve the folder (don't use `file://`, as the Supabase client and
ES modules need an HTTP origin):

```
python3 -m http.server
```

Then open <http://localhost:8000/> (redirects to `Library.html`, the app).

Production is deployed on Vercel at <https://ai-commons-for-eap.vercel.app>.
