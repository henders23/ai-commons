# The AI Commons for EAP

Documents, activities and guides to help English for Academic Purposes
educators engage well with AI. A curated, editorially owned static site:
nobody uploads, contributions arrive by email and are added with attribution.

Live at <https://ai-commons-for-eap.vercel.app>. See `PLAN.md` for the brief.

## How it is built

- **[Astro](https://astro.build)** generates a static site from Markdown
  content in `src/content/`. No database, no accounts.
- **[Pagefind](https://pagefind.app)** builds a browser-side search index after
  each build (`npm run build` runs both).
- **Ratings** are the one dynamic feature: `api/ratings.js` is a Vercel
  serverless function backed by an Upstash Redis REST store. Everything else
  works without it.
- Deployed on **Vercel**. `vercel.json` carries redirects from the old site's
  URLs and clean-URL settings.

```
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/ plus the Pagefind index
npm run preview
```

## Adding content

Everything an editor changes is a file.

| What | Where | Notes |
| --- | --- | --- |
| A resource (guide, paper, activity, framework, discussion pack, reading) | `src/content/resources/<slug>.md` | Frontmatter fields are validated by `src/content.config.ts`. Body is Markdown: "What you get", "How to use it". |
| Its downloadable files | `public/files/<slug>/` | Reference them in the resource's `formats` list. |
| A pathway | `src/content/pathways/<slug>.md` | Ordered `steps`, each either a `resource` slug or a `title` for one not yet published. |
| A course | `src/content/courses/<slug>.md` | Copy `example-course.md` and set `draft: false`. Past courses move to the archive automatically. |
| Site name, editor, contribution email, licence, taxonomies | `src/site.ts` | Types, themes and audiences are defined here and enforced on content. |

A contribution that arrives by email becomes: one Markdown file, the file(s) in
`public/files/<slug>/`, a commit, a push. Vercel deploys.

## Ratings setup

The ratings widget needs a Redis REST store. On Vercel: Storage → Marketplace →
Upstash Redis, connect it to the project, and the `KV_REST_API_URL` /
`KV_REST_API_TOKEN` variables are set for you. Any Upstash database works too
(`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Without them the API
answers 503 and the site shows "Ratings are unavailable right now".

Data model: one hash per resource, `rating:<slug>`, mapping a browser-generated
visitor id to a 1–5 score. One rating per browser; changing it overwrites.

## Broadening beyond EAP

The wordmark is "The AI Commons"; "for EAP" is the qualifier in `src/site.ts`.
Every resource carries `field: eap`, and URLs are field-neutral, so adding a
second field later is a matter of a second value and a filter, not a move.
