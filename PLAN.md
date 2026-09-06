# Plan: The AI Commons for EAP — redesign

A from-scratch redesign of the site. This document is the agreed brief for the
build. It replaces the earlier readings-expansion plan.

## Purpose

Help educators in English for Academic Purposes engage well with AI. The site
holds documents, activities, frameworks and guides that shape the thinking of
tutors and course leaders, lets them download material for their own practice
and for their teams, and carries invitations to courses.

## Decisions taken

- **Curated, editorially owned.** Nobody uploads. Contributions arrive by email
  and are added by the editor, with attribution to the contributor.
- **Name.** "The AI Commons" is the wordmark, "for EAP" the qualifier, so a later
  broadening to education generally changes the qualifier, not the brand.
- **Scope.** EAP only at launch. Built so broadening is cheap:
  every resource carries a `field` tag (always `eap` for now); URLs are
  field-neutral (`/library/<slug>`, not `/eap/library/<slug>`); any purchased
  domain should be the general one.
- **Community features.** Ratings only (1–5 stars, one per browser visitor,
  average and count shown). No votes, comments, tags, accounts, moderation.
- **Existing readings.** The 14 seeded readings are design-handoff seed content,
  not real, and not about EAP. They are discarded. A few of the real websites
  among them may be re-added as proper readings later (EDUCAUSE AI hub, AI
  Pedagogy Project, Russell Group principles, UNESCO guidance, Stanford AI
  Index, Leon Furze on AI detectors).
- **Courses.** The editor's own courses for now; others' later.
- **Licence.** CC BY 4.0 for everything authored for the site and everything
  contributed. Contributors are named as authors and confirm by email that they
  hold the rights to share. External readings are linked, not licensed.
- **Technology.** A static site generated from content files in this repo
  (Astro), deployed on Vercel. No database, no auth. Search runs in the
  browser over a prebuilt index (Pagefind). Supabase is retired.

## Site map

- **Home.** What the Commons is and who it is for. Three doors in: *Start here*
  (individual tutors), *Run a session with your team* (course leaders),
  *Courses*. Then a few featured resources and a short *Contribute* invitation.
- **Library.** One searchable, filterable collection. Facets:
  - Type: Guide · Activity · Framework · Discussion pack · Reading
  - Theme: assessment · academic integrity · course design · AI literacy ·
    ethics and values · research · policy · tools in practice
  - Audience: for me · for my team · for my students
- **Pathways.** Curated ordered sequences of library items with a short framing
  paragraph. The editorial heart of the site.
- **Courses and events.** Invitations with dates, format, who it is for, and a
  link to register. Past courses stay as an archive with materials.
- **About and Contribute.** Purpose, who is behind it, attribution and licence
  policy, and the email route for contributions with a template of what to
  include (title, description, file, preferred credit, licence consent).

## Resource page anatomy

Title · type badge · themes · audience · plain summary · "what you get" ·
how to use it · time and group size (activities) · contributor attribution ·
licence · download button per format · star rating · related items ·
last updated. Every resource has its own crawlable URL.

## Content model (files in the repo)

- `src/content/resources/<slug>.md` — frontmatter: title, type, themes[],
  audience[], field, contributor, licence, formats[] (file paths), time,
  groupSize, updated, related[]; body: summary, what you get, how to use.
- `src/content/pathways/<slug>.md` — title, framing, ordered list of resource
  slugs.
- `src/content/courses/<slug>.md` — title, dates, format, audience, register
  URL, status (upcoming / past), materials[].
- `src/content/readings/<slug>.md` — title, url, source, date, themes[],
  a one-paragraph note on why it is worth reading.
- `public/files/<slug>/…` — the downloadable PDF / DOCX / PPTX files.

## Contribution workflow

1. Contributor emails the contribution address using the template on the
   Contribute page.
2. Editor (or Claude in a session) adds the content file and any downloads,
   commits, and pushes.
3. Vercel deploys; the resource is live at its own URL.

## Proposed launch pathways (pick four or five)

1. First conversation with your team about AI — a 60–90 minute session plan.
2. Writing your centre's position on AI — principles to a usable statement.
3. Rethinking assessment in EAP — process evidence, in-class writing,
   portfolios, vivas, integrity without policing.
4. AI in the writing classroom — student-facing activities treating AI as a
   language tool to use critically.
5. Talking to students about AI — induction and AI literacy in the first weeks.
6. Your own practice, month one — an individual tutor's first month.
7. Planning a pre-sessional with AI in mind — policy, tutor briefing,
   induction, assessment in one sequence.

## Open decisions

- **Which pathways launch.** From the list above.
- **Ratings backend.** Recommended: a small Vercel serverless function with a
  key-value store (no auto-pause risk). Stopgap: keep the existing Supabase
  project for ratings only, reusing `submit_rating` and `rating_stats`; the
  free tier auto-pauses after a quiet week, which would silently break ratings.
- **Contribution email address.** A role address (e.g. contribute@) preferred.
- **First readings.** Whether to keep any of the real websites listed above.

## Build phases

1. Scaffold the Astro site, content collections, design tokens, light/dark
   theme, base layout and navigation.
2. Pages: home, library with search and facets, resource page, pathways,
   courses, about and contribute.
3. Ratings: backend function plus the star widget on resource pages.
4. Seed content: the editor's initial resources, pathways and courses.
5. Retire the old app: remove the SPA files, Supabase client, generated
   `r/` pages; regenerate sitemap; redirect old URLs.
