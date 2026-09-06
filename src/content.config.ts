import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { types, themes, audiences } from './site';

const typeKeys = Object.keys(types) as [string, ...string[]];
const themeKeys = Object.keys(themes) as [string, ...string[]];
const audienceKeys = Object.keys(audiences) as [string, ...string[]];

const contributor = z.object({
  name: z.string(),
  role: z.string().optional(),
  url: z.string().url().optional(),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    type: z.enum(typeKeys),
    summary: z.string(),
    themes: z.array(z.enum(themeKeys)).min(1),
    audience: z.array(z.enum(audienceKeys)).min(1),
    field: z.string().default('eap'),
    contributor,
    licence: z.string().default('CC BY 4.0'),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    version: z.string().optional(),
    /* Downloadable formats. Paths are relative to /public. */
    formats: z.array(z.object({
      label: z.string(),
      path: z.string(),
      size: z.string().optional(),
    })).default([]),
    /* For readings: where the thing lives. */
    url: z.string().url().optional(),
    source: z.string().optional(),
    /* For activities and packs. */
    time: z.string().optional(),
    groupSize: z.string().optional(),
    related: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const pathways = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pathways' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    forWhom: z.string(),
    duration: z.string().optional(),
    order: z.number().default(99),
    steps: z.array(z.object({
      /* Either a resource slug, or a title for a step not yet backed by a resource. */
      resource: z.string().optional(),
      title: z.string().optional(),
      note: z.string(),
    })).min(1),
    draft: z.boolean().default(false),
  }),
});

const courses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/courses' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    starts: z.coerce.date(),
    ends: z.coerce.date().optional(),
    format: z.string(),
    audience: z.string(),
    registerUrl: z.string().url().optional(),
    place: z.string().optional(),
    materials: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { resources, pathways, courses };
