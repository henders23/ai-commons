/* Site-wide configuration and the content taxonomies.
   Everything an editor is likely to change lives here. */

export const site = {
  /* "The AI Commons" is the wordmark; the qualifier is what broadens later. */
  name: 'The AI Commons',
  qualifier: 'for EAP',
  get fullName() { return `${this.name} ${this.qualifier}`; },
  tagline: 'Documents, activities and guides to help EAP educators engage well with AI.',
  description:
    'A curated commons for English for Academic Purposes practitioners: position papers, guides, activities and frameworks on AI in teaching, assessment and professional practice. Free to download, CC BY 4.0.',
  url: 'https://ai-commons-for-eap.vercel.app',
  /* Who edits the Commons. Used for attribution on site-authored resources. */
  editor: { name: 'Paul Hendrie', role: 'Editor' },
  /* Where contributions are sent. Replace with a real (ideally role) address. */
  contributeEmail: 'contribute@example.org',
  licence: { label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  /* The field this commons serves. Every resource carries this tag so a later
     broadening to other fields is a matter of adding a second value. */
  field: 'eap',
} as const;

export type ResourceType = keyof typeof types;
export const types = {
  guide: { label: 'Guide', plural: 'Guides', blurb: 'Practical, step-by-step material you can follow on your own.' },
  paper: { label: 'Paper', plural: 'Papers', blurb: 'Longer thinking pieces: position papers, reviews, arguments to test your own views against.' },
  activity: { label: 'Activities', plural: 'Activities', blurb: 'Ready-to-run tasks for classrooms and team sessions.' },
  framework: { label: 'Framework', plural: 'Frameworks', blurb: 'Structures and templates: policies, scales, decision aids.' },
  'discussion-pack': { label: 'Discussion pack', plural: 'Discussion packs', blurb: 'Prompts, readings and a running order for a team conversation.' },
  reading: { label: 'Reading', plural: 'Readings', blurb: 'Something worth reading elsewhere, with a note on why.' },
} as const;

export type ThemeKey = keyof typeof themes;
export const themes = {
  assessment: { label: 'Assessment' },
  'academic-integrity': { label: 'Academic integrity' },
  'course-design': { label: 'Course design' },
  'ai-literacy': { label: 'AI literacy' },
  ethics: { label: 'Ethics and values' },
  research: { label: 'Research' },
  policy: { label: 'Policy' },
  tools: { label: 'Tools in practice' },
} as const;

export type AudienceKey = keyof typeof audiences;
export const audiences = {
  me: { label: 'For me', long: 'For your own thinking and practice' },
  team: { label: 'For my team', long: 'For course leaders running a session with colleagues' },
  students: { label: 'For my students', long: 'Student-facing material for the classroom' },
} as const;

export const nav = [
  { href: '/library', label: 'Library' },
  { href: '/pathways', label: 'Pathways' },
  { href: '/courses', label: 'Courses' },
  { href: '/about', label: 'About' },
  { href: '/contribute', label: 'Contribute' },
];
