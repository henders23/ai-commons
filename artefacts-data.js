/* AI Commons for Education — artefacts data access (for the unified app).
   Artefacts are admin-published documents or links across the six teaching
   categories. They reuse the polymorphic ratings/comments engine (target_type
   'artefact'). Loads after supabase-client.js. Exposes window.ART. */

const ART = (function () {
  const LEVELS = ['Pre-sessional', 'Foundation', 'Undergraduate', 'Postgraduate', 'Staff / CPD'];
  let CATS = [];   // [{ id, name, blurb, examples }]
  let ITEMS = [];  // artefact rows
  let _loaded = null;

  function fileUrl(path) {
    return path ? SB.storage.from('artefacts').getPublicUrl(path).data.publicUrl : null;
  }

  function map(row, stats, mine, commentsBy) {
    const s = stats[row.id] || {};
    return {
      id: row.id, type: row.type, cat: row.cat, title: row.title,
      desc: row.description || '', howto: row.howto || '', tags: row.tags || [],
      level: row.level || '', author: row.author || '', format: row.format || '',
      link_url: row.link_url || null, file_path: row.file_path || null,
      fileHref: row.file_path ? fileUrl(row.file_path) : null,
      created_at: row.created_at, added: relativeTime(row.created_at),
      n: Number(s.n || 0), avg: Number(s.avg || 0), yourRating: mine[row.id] || 0,
      comments: commentsBy[row.id] || [],
    };
  }

  function load() {
    if (_loaded) return _loaded;
    _loaded = (async () => {
      const vid = visitorId();
      const [catRes, artRes, statRes, mineRes, comRes] = await Promise.all([
        SB.from('categories').select('*').order('sort_order', { ascending: true }),
        SB.from('artefacts').select('*').order('created_at', { ascending: false }),
        SB.from('rating_stats').select('*').eq('target_type', 'artefact'),
        SB.from('ratings').select('target_id,stars').eq('target_type', 'artefact').eq('visitor_id', vid),
        SB.from('comments').select('*').eq('target_type', 'artefact').order('created_at', { ascending: true }),
      ]);
      if (catRes.error) throw catRes.error;
      if (artRes.error) throw artRes.error;
      const stats = {}; (statRes.data || []).forEach(s => { stats[s.target_id] = s; });
      const mine = {}; (mineRes.data || []).forEach(r => { mine[r.target_id] = r.stars; });
      const commentsBy = {};
      (comRes.data || []).forEach(c => {
        (commentsBy[c.target_id] = commentsBy[c.target_id] || []).push({
          author: c.name, text: c.body, when: relativeTime(c.created_at), mine: c.visitor_id === vid,
        });
      });
      CATS = (catRes.data || []).map(c => ({ id: c.id, name: c.name, blurb: c.blurb, examples: c.examples }));
      ITEMS = (artRes.data || []).map(r => map(r, stats, mine, commentsBy));
      return { CATS, ITEMS };
    })();
    return _loaded;
  }

  function reload() { _loaded = null; return load(); }

  async function refreshOne(id) {
    const [{ data: s }, { data: m }] = await Promise.all([
      SB.from('rating_stats').select('*').eq('target_type', 'artefact').eq('target_id', id).maybeSingle(),
      SB.from('ratings').select('stars').eq('target_type', 'artefact').eq('target_id', id).eq('visitor_id', visitorId()).maybeSingle(),
    ]);
    const it = ITEMS.find(x => x.id === id);
    if (!it) return;
    it.n = Number((s && s.n) || 0); it.avg = Number((s && s.avg) || 0);
    it.yourRating = m ? m.stars : 0;
  }

  async function rate(id, stars) {
    const it = ITEMS.find(x => x.id === id);
    if (!it) return;
    const next = it.yourRating === stars ? 0 : stars;
    if (next === 0) {
      await SB.from('ratings').delete().eq('target_type', 'artefact').eq('target_id', id).eq('visitor_id', visitorId());
    } else {
      const { error } = await SB.rpc('submit_rating', {
        p_target_type: 'artefact', p_target_id: id, p_visitor: visitorId(), p_stars: next,
      });
      if (error) { if ((error.message || '').includes('rate_limited')) return 'rate_limited'; console.error(error); return; }
    }
    it.yourRating = next;
    await refreshOne(id);
  }

  async function addComment(id, name, text) {
    const it = ITEMS.find(x => x.id === id);
    if (!it || !text.trim()) return;
    const { error } = await SB.from('comments').insert({
      target_type: 'artefact', target_id: id, visitor_id: visitorId(),
      name: name.trim() || 'Anonymous', body: text.trim(),
    });
    if (error) { console.error(error); return; }
    it.comments.push({ author: name.trim() || 'Anonymous', text: text.trim(), when: 'just now', mine: true });
  }

  const slugify = s => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artefact';
  const fmtSize = b => { const mb = b / 1024 / 1024; return mb >= 1 ? mb.toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };

  // admin publish (RLS also enforces is_admin server-side)
  async function publish(p) {
    const id = slugify(p.title) + '-' + Math.random().toString(36).slice(2, 6);
    let type = 'link', file_path = null, link_url = null, format = 'External link';
    if (p.kind === 'file') {
      if (!p.file) throw new Error('Choose a file, or switch to a link.');
      const ext = (p.file.name.split('.').pop() || 'file').toUpperCase();
      const path = `${id}/${p.file.name}`;
      const up = await SB.storage.from('artefacts').upload(path, p.file, { upsert: false });
      if (up.error) throw up.error;
      type = 'doc'; file_path = path; format = `${ext} · ${fmtSize(p.file.size)}`;
    } else {
      link_url = (p.link_url || '').trim();
      if (!link_url) throw new Error('Enter a link URL, or switch to a file.');
      if (!/^https?:/.test(link_url)) link_url = 'https://' + link_url.replace(/^\/+/, '');
    }
    const cat = (CATS.find(c => c.name === p.catName || c.id === p.catName) || CATS[0] || {}).id;
    const { error } = await SB.from('artefacts').insert({
      id, type, cat, title: p.title.trim(), description: (p.desc || '').trim(), howto: (p.howto || '').trim(),
      tags: (p.tags || []), level: p.level || '', author: (p.author || '').trim() || 'Anonymous', format, link_url, file_path,
    });
    if (error) throw error;
    return id;
  }

  return {
    load, reload, rate, addComment, publish, refreshOne, fileUrl,
    LEVELS,
    get CATS() { return CATS; },
    get ITEMS() { return ITEMS; },
  };
})();

window.ART = ART;
