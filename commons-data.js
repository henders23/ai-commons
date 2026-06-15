/* EAP AI Commons — data access.
   Categories and artefacts now come from Supabase. LEVELS stays static (a fixed
   taxonomy used by filters). Call loadData() once per page before rendering;
   it populates CATEGORIES / CAT / ARTEFACTS / TOTAL and resolves a promise. */

const LEVELS = ['Pre-sessional', 'Foundation', 'Undergraduate', 'Postgraduate', 'Staff / CPD'];

let CATEGORIES = [];
let CAT = {};
let ARTEFACTS = [];
let TOTAL = 0;
let CONTRIBUTORS = 0;
let RECENT = [];

function _mapArtefact(row) {
  return {
    id: row.id,
    type: row.type,
    cat: row.cat,
    title: row.title,
    desc: row.description || '',
    howto: row.howto || '',
    tags: row.tags || [],
    level: row.level || '',
    author: row.author || '',
    format: row.format || '',
    link_url: row.link_url || null,
    file_path: row.file_path || null,
    created_at: row.created_at,
    added: relativeTime(row.created_at),
  };
}

let _loaded = null;
function loadData() {
  if (_loaded) return _loaded;
  _loaded = (async () => {
    const [catRes, artRes] = await Promise.all([
      SB.from('categories').select('*').order('sort_order', { ascending: true }),
      SB.from('artefacts').select('*').order('created_at', { ascending: false }),
    ]);
    if (catRes.error) throw catRes.error;
    if (artRes.error) throw artRes.error;

    CATEGORIES = (catRes.data || []).map(c => ({
      id: c.id, idx: c.idx, name: c.name, blurb: c.blurb, examples: c.examples, count: 0,
    }));
    CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

    ARTEFACTS = (artRes.data || []).map(_mapArtefact);
    ARTEFACTS.forEach(a => { if (CAT[a.cat]) CAT[a.cat].count++; });

    TOTAL = ARTEFACTS.length;
    CONTRIBUTORS = new Set(ARTEFACTS.map(a => a.author).filter(Boolean)).size;
    RECENT = ARTEFACTS.slice(0, 5).map(a => a.id);
    return { CATEGORIES, ARTEFACTS };
  })();
  return _loaded;
}

window.loadData = loadData;
