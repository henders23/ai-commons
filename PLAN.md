# Plan: AI Commons for Education

Expanding the site from a moderated **artefact** library (EAP AI Commons) into a
community **reading commons** — a curated, votable, rateable, discussable index of
links and readings on AI in higher education — with the existing artefacts kept as
a second content type.

Implemented from the Claude Design handoff `Library.dc.html` ("AI Commons for
Education").

## Decisions

- **Readings are a first-class, separate entity** from artefacts (their own
  categories, social mechanics, and pages).
- **The design becomes the new shell for the whole site.** Readings are the
  centerpiece; the brand broadens from "EAP AI Commons" to "AI Commons for
  Education"; artefacts get re-skinned into the same shell (later phase).
- **Readings use a moderated queue:** anyone can *suggest* a reading; it lands
  `pending` and an admin approves before it shows publicly. (Artefacts stay
  admin-only, unchanged.)

## What the design is

A single-page, two-screen app:

- **Home** — hero, a 4-step "How it works", a 6-category grid, "Top rated now".
- **App** — left sidebar (search, Read later, category nav, Suggest a link) + main
  pane with header (category label, active-tag chip, theme toggle, group-by-tag,
  sort Top/Newest/Rated, list/cards view) and ranked reading rows.

Each reading row: upvote/score/downvote, rank, title → external URL, meta
(`ARTICLE`/`WEBSITE` · domain · date · ★avg(count)), description, and
Save / Discuss / Open actions. Expanding a row reveals an inline star rating,
editable tags, and a comment thread.

Own visual system: IBM Plex Mono + Helvetica Neue, **light/dark theme toggle**,
`--bg/--t-1/--line/--card…` tokens.

## Data model (Supabase, additive — artefacts untouched)

- `reading_categories(key, label, blurb, sort_order)` — the 6 reading buckets.
- `readings(id, cat, type[article|website], title, url, domain, published_label,
  description, tags[], contributor, base_score, base_avg, base_count,
  status[pending|approved], created_at)`.
- `reading_votes(reading_id, visitor_id, value -1/0/+1)` — drives score via a view;
  written through a `vote_reading()` RPC.
- `suggest_reading()` RPC (SECURITY DEFINER) inserts as `status='pending'`.
- **Polymorphic social:** `ratings`/`comments` gain `target_type` + `target_id`
  (default `artefact`, kept in sync with `artefact_id` by a trigger so the existing
  artefact pages keep working). A generic `rating_stats` view + a `submit_rating`
  overload serve both content types.

## Build phases

1. **Foundations** — design tokens + light/dark theme in `commons.css`; brand
   rename; reconcile the Tweaks panel with the theme toggle.
2. **Readings schema + seed** — migrations above; seed 6 categories + 14 readings.
3. **Readings app** — port the design faithfully (`Library.html`,
   `readings-data.js`, `readings.js`): home screen + two-pane app, votes/ratings/
   comments wired to Supabase, read-later in localStorage.
4. **Suggest-a-link (moderated)** — suggest modal → pending; admin approval view.
5. **Polymorphic social** — readings reuse `social.js` for inline ratings/comments.
6. **Re-skin artefacts into the shell + unify** — artefact pages adopt the new look;
   unified search across readings + artefacts.

> First delivery covers phases 1–3 (plus the social + suggest pieces the reading
> rows need). The artefact re-skin (phase 6) is a follow-up.
