/* EAP AI Commons — shared content. Sample data; AI-for-EAP framing. */

const CATEGORIES = [
  { id:'skills',     idx:'01', name:'Skills',     count:14,
    blurb:'Teachable academic abilities and the AI practices that support them.',
    examples:'Prompting · Fact-checking · Revision' },
  { id:'artefacts',  idx:'02', name:'Artefacts',  count:9,
    blurb:'Worked examples, annotated AI-assisted texts and model answers.',
    examples:'Annotated essays · Before/after · Transcripts' },
  { id:'frameworks', idx:'03', name:'Frameworks', count:8,
    blurb:'Models and rubrics for using, disclosing and assessing AI work.',
    examples:'Disclosure model · Feedback rubric · CRAAP' },
  { id:'docs',       idx:'04', name:'Docs',        count:11,
    blurb:'Policies, guidance, prompts and reusable templates.',
    examples:'AI-use policy · Prompt sets · Cover sheets' },
  { id:'links',      idx:'05', name:'Links',       count:7,
    blurb:'Curated external sites, tools and AI-literacy resources.',
    examples:'Phrasebank · Corpora · AI literacy' },
  { id:'other',      idx:'06', name:'Other',       count:2,
    blurb:"Anything that doesn't fit neatly into the five above — yet.",
    examples:'CPD · Submissions · Drafts' },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const LEVELS = ['Pre-sessional','Foundation','Undergraduate','Postgraduate','Staff / CPD'];

const ARTEFACTS = [
  { id:'prompt-paraphrase', type:'doc', cat:'skills', title:'Prompting for paraphrase practice',
    tags:['prompting','paraphrasing','integrity'], level:'Pre-sessional', author:'J. Okafor', added:'2d',
    format:'PDF · 240 KB',
    desc:'A guided set of prompts that turn a chatbot into a paraphrase-practice partner — without doing the work for the student.',
    howto:'Hand out as a workshop sheet. Students paste each prompt, then compare the AI version with their own and mark the differences.' },
  { id:'factcheck-ai', type:'doc', cat:'skills', title:'Teaching students to fact-check AI output',
    tags:['AI literacy','sources','critical reading'], level:'Undergraduate', author:'EAP team', added:'5d',
    format:'PDF · 310 KB',
    desc:'A short routine for spotting confident-but-wrong AI claims and tracing them back to real sources.',
    howto:'Run as a 30-minute seminar activity using a deliberately flawed AI answer you supply.' },
  { id:'revision-with-ai', type:'doc', cat:'skills', title:'Using AI to revise, not rewrite',
    tags:['revision','drafting','feedback'], level:'Undergraduate', author:'R. Haddad', added:'1w',
    format:'PDF · 280 KB',
    desc:'How to ask an AI tutor for revision questions rather than rewritten text, so the student keeps ownership.',
    howto:'Best after students have a complete first draft; pair with the AI-feedback rubric.' },

  { id:'annotated-essay', type:'doc', cat:'artefacts', title:'Annotated AI-assisted essay',
    tags:['model answer','disclosure','annotation'], level:'Postgraduate', author:'M. Lindqvist', added:'4d',
    format:'PDF · 1.2 MB',
    desc:'A real student essay produced with disclosed AI help, annotated by a tutor to show what assistance looks like done well.',
    howto:'Reveal the annotations after students attempt to spot the AI-assisted moves themselves.' },
  { id:'before-after', type:'doc', cat:'artefacts', title:'Before / after: AI-supported revision',
    tags:['revision','examples'], level:'Foundation', author:'R. Haddad', added:'2w',
    format:'PDF · 640 KB',
    desc:'Two versions of the same paragraph — before and after an AI-supported revision round — with the prompts used.',
    howto:'Use to make "good" AI assistance concrete and discussable.' },

  { id:'disclosure-model', type:'doc', cat:'frameworks', title:'A framework for disclosing AI use',
    tags:['disclosure','integrity','policy'], level:'Staff / CPD', author:'Quality office', added:'6d',
    format:'PDF · 190 KB',
    desc:'A simple three-tier model — assisted, generated, declared — students and staff can share a language around.',
    howto:'Adopt the tiers across modules so disclosure means the same thing everywhere.' },
  { id:'ai-feedback-rubric', type:'doc', cat:'frameworks', title:'AI-feedback rubric for draft essays',
    tags:['rubric','feedback','drafting'], level:'Undergraduate', author:'R. Haddad', added:'1w',
    format:'PDF · 220 KB',
    desc:'A rubric students use to structure the feedback they request from an AI tutor — and to judge what comes back.',
    howto:'Collect completed rubrics to spot common weaknesses across a cohort.' },
  { id:'craap-ai', type:'doc', cat:'frameworks', title:'CRAAP test for evaluating AI sources',
    tags:['sources','critical reading'], level:'Undergraduate', author:'EAP team', added:'3w',
    format:'PDF · 150 KB',
    desc:'The classic CRAAP test, adapted to interrogate sources an AI tool cites (or invents).',
    howto:'Project on screen and evaluate one AI-cited source together before independent practice.' },

  { id:'ai-use-policy', type:'link', cat:'docs', title:'Department AI-use policy & statement',
    tags:['policy','integrity','AI'], level:'Staff / CPD', author:'Quality office', added:'6d',
    format:'External link',
    desc:'The departmental position on acceptable AI use, with examples of disclosed and undisclosed help.',
    howto:'Link from every module handbook and review with students in week one.' },
  { id:'reflection-prompts', type:'doc', cat:'docs', title:'Reflective-writing prompts for AI feedback',
    tags:['prompts','reflection','feedback'], level:'Postgraduate', author:'S. Nakamura', added:'5d',
    format:'DOCX · 90 KB',
    desc:'Prompts students paste into a chatbot to interrogate their own reflective writing.',
    howto:'Give the prompts verbatim; remind students to check claims against their notes.' },
  { id:'cover-sheet', type:'doc', cat:'docs', title:'Cover sheet: declaring AI assistance',
    tags:['template','disclosure'], level:'Undergraduate', author:'EAP team', added:'2w',
    format:'DOCX · 60 KB',
    desc:'A one-page declaration students attach to submissions, stating what AI help they used and how.',
    howto:'Make it a required attachment; pairs with the disclosure framework.' },

  { id:'phrasebank', type:'link', cat:'links', title:'Academic Phrasebank',
    tags:['phrases','reference'], level:'Foundation', author:'Curated', added:'5w',
    format:'External link',
    desc:'External reference of sentence stems organised by rhetorical function.',
    howto:'Point students here when they say "I don\'t know how to start".' },
  { id:'corpus-tools', type:'link', cat:'links', title:'Corpus tools for academic vocabulary',
    tags:['vocabulary','corpus'], level:'Undergraduate', author:'EAP team', added:'2w',
    format:'External link',
    desc:'A shortlist of corpora and concordancers for exploring how academic words really behave.',
    howto:'Demo one search live, then set a vocabulary-in-context hunt as homework.' },
  { id:'ai-literacy', type:'link', cat:'links', title:'AI literacy resources for students',
    tags:['AI literacy','self-access'], level:'Undergraduate', author:'Curated', added:'3w',
    format:'External link',
    desc:'A curated starting point for students building a working understanding of how generative AI behaves.',
    howto:'Share at induction; revisit when assignments involving AI come up.' },

  { id:'cpd-tutors', type:'doc', cat:'other', title:'Staff CPD: experimenting with AI tutors',
    tags:['CPD','practice'], level:'Staff / CPD', author:'S. Nakamura', added:'2mo',
    format:'PDF · 420 KB',
    desc:'Notes and a session plan from a staff workshop trialling AI tutors in EAP teaching.',
    howto:'Read before a course-design meeting; the appendix has the week-by-week plan.' },
];

const TOTAL = CATEGORIES.reduce((s,c) => s + c.count, 0);
const RECENT = ['prompt-paraphrase','annotated-essay','disclosure-model','reflection-prompts','factcheck-ai'];

/* Seed ratings + comments per artefact (sample community activity).
   social.js overlays the current user's own rating/comments from localStorage. */
const SEED_SOCIAL = {
  'prompt-paraphrase': {
    ratings:[5,5,4,5,4,5,5,4,5,3],
    comments:[
      { name:'H. Mwangi', when:'1w', stars:5, text:'Used this with a pre-sessional group — the compare-your-own step is what makes it work. They actually noticed their over-copying.' },
      { name:'D. Roberts', when:'4d', stars:4, text:'Solid. I trimmed it to three prompts for a 40-minute slot and it still landed.' },
    ],
  },
  'factcheck-ai': {
    ratings:[5,4,5,5,4,5],
    comments:[
      { name:'A. Petrova', when:'3d', stars:5, text:'The deliberately-flawed answer is gold. Students were genuinely surprised how confident the wrong citations looked.' },
    ],
  },
  'annotated-essay': {
    ratings:[5,5,5,4,5,5,4],
    comments:[
      { name:'L. Chen', when:'2d', stars:5, text:'Best example I have found of disclosed AI use done well. The annotations make the invisible visible.' },
      { name:'M. Okonkwo', when:'1d', stars:4, text:'Would love a second example at undergraduate level, but this is excellent for PG.' },
    ],
  },
  'disclosure-model': {
    ratings:[5,4,4,5,3,4],
    comments:[
      { name:'S. Ahmed', when:'5d', stars:4, text:'We adopted the three tiers across the department. Shared language has cut a lot of confusion.' },
    ],
  },
  'ai-feedback-rubric': {
    ratings:[4,5,4,4,5],
    comments:[
      { name:'J. Okafor', when:'6d', stars:5, text:'Pairs perfectly with the reflective-writing prompts. Collecting the rubrics surfaced a clear cohort-wide gap.' },
    ],
  },
  'ai-use-policy': {
    ratings:[5,5,4],
    comments:[],
  },
};

