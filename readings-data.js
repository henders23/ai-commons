/* AI Commons for Education — readings data access.
   Loads after supabase-client.js (provides SB, visitorId, relativeTime).
   Readings, their categories, the visitor's votes/ratings and all reading
   comments come from Supabase; read-later lives in localStorage. */

const EDU = (function () {
  const RL_KEY = 'aice:readlater';

  let CATS = [];     // [{ key, label, blurb }] — 'all' first
  let ITEMS = [];    // approved reading rows
  let PENDING = [];  // pending suggestions (admins only; moderation queue)
  let _loaded = null;

  // read-later set (per browser) -------------------------------------------
  function readLaterSet() {
    try { return new Set(JSON.parse(localStorage.getItem(RL_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function saveReadLater(set) {
    try { localStorage.setItem(RL_KEY, JSON.stringify([...set])); } catch (e) {}
  }
  function isSaved(id) { return readLaterSet().has(id); }
  function toggleSaved(id) {
    const set = readLaterSet();
    const willSave = !set.has(id);
    willSave ? set.add(id) : set.delete(id);
    saveReadLater(set);
    return willSave;
  }
  function savedCount() {
    const ids = new Set(ITEMS.map(i => i.id));
    return [...readLaterSet()].filter(id => ids.has(id)).length;
  }

  // combined rating = seed aggregate folded together with live ratings
  function ratingAvg(it) {
    const n = it.base_count + it.live_n;
    if (!n) return 0;
    return (it.base_avg * it.base_count + it.live_avg * it.live_n) / n;
  }
  function ratingCount(it) { return it.base_count + it.live_n; }

  function mapCard(c, votes, mine, commentsBy) {
    return {
      id: c.id, cat: c.cat, type: c.type, title: c.title, url: c.url,
      domain: c.domain, date: c.published_label, description: c.description,
      tags: c.tags || [],
      base_score: c.base_score, base_avg: Number(c.base_avg), base_count: c.base_count,
      live_n: c.live_n, live_avg: Number(c.live_avg),
      score: c.score, userVote: votes[c.id] || 0, yourRating: mine[c.id] || 0,
      contributor: c.contributor || '', status: c.status,
      created_at: c.created_at, added: new Date(c.created_at).getTime(),
      comments: commentsBy[c.id] || [],
    };
  }

  function load() {
    if (_loaded) return _loaded;
    _loaded = (async () => {
      const vid = visitorId();
      const [catRes, cardRes, voteRes, mineRes, comRes] = await Promise.all([
        SB.from('reading_categories').select('*').order('sort_order', { ascending: true }),
        SB.from('reading_cards').select('*'),
        SB.from('reading_votes').select('reading_id,value').eq('visitor_id', vid),
        SB.from('ratings').select('target_id,stars').eq('target_type', 'reading').eq('visitor_id', vid),
        SB.from('comments').select('*').eq('target_type', 'reading').order('created_at', { ascending: true }),
      ]);
      if (catRes.error) throw catRes.error;
      if (cardRes.error) throw cardRes.error;

      const votes = {}; (voteRes.data || []).forEach(v => { votes[v.reading_id] = v.value; });
      const mine = {}; (mineRes.data || []).forEach(r => { mine[r.target_id] = r.stars; });
      const commentsBy = {};
      (comRes.data || []).forEach(c => {
        (commentsBy[c.target_id] = commentsBy[c.target_id] || []).push({
          author: c.name, text: c.body, when: relativeTime(c.created_at),
          mine: c.visitor_id === vid,
        });
      });

      CATS = [{ key: 'all', label: 'All readings', blurb: 'Everything in the library, ranked by the community.' }]
        .concat((catRes.data || []).map(c => ({ key: c.key, label: c.label, blurb: c.blurb })));
      const all = (cardRes.data || []).map(c => mapCard(c, votes, mine, commentsBy));
      // Anon only ever receives approved rows (RLS); admins also get pending ones,
      // which we route to a separate moderation queue rather than the public lists.
      ITEMS = all.filter(i => i.status === 'approved');
      PENDING = all.filter(i => i.status === 'pending').sort((a, b) => b.added - a.added);
      return { CATS, ITEMS, PENDING };
    })();
    return _loaded;
  }

  function reload() { _loaded = null; return load(); }

  // moderation (admin-only; the readings UPDATE RLS policy enforces is_admin())
  async function moderate(id, status) {
    const { error } = await SB.from('readings').update({ status }).eq('id', id);
    if (error) throw error;
    const it = PENDING.find(x => x.id === id);
    PENDING = PENDING.filter(x => x.id !== id);
    if (status === 'approved' && it) { it.status = 'approved'; ITEMS.push(it); }
  }
  const approve = id => moderate(id, 'approved');
  const reject = id => moderate(id, 'rejected');

  // refresh one reading's live vote/rating aggregates after a write
  async function refreshOne(id) {
    const { data } = await SB.from('reading_cards').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    const it = ITEMS.find(x => x.id === id);
    if (!it) return;
    it.score = data.score; it.live_n = data.live_n; it.live_avg = Number(data.live_avg);
  }

  async function vote(id, dir) {
    const it = ITEMS.find(x => x.id === id);
    if (!it) return;
    const value = it.userVote === dir ? 0 : dir;       // toggle off if same
    const { data, error } = await SB.rpc('vote_reading', { p_reading: id, p_visitor: visitorId(), p_value: value });
    if (error) {
      if ((error.message || '').includes('rate_limited')) return 'rate_limited';
      console.error(error); return;
    }
    it.userVote = value;
    if (typeof data === 'number') it.score = data;
  }

  async function rate(id, stars) {
    const it = ITEMS.find(x => x.id === id);
    if (!it) return;
    const next = it.yourRating === stars ? 0 : stars;   // tap same star to clear
    if (next === 0) {
      await SB.from('ratings').delete().eq('target_type', 'reading').eq('target_id', id).eq('visitor_id', visitorId());
    } else {
      const { error } = await SB.rpc('submit_rating', {
        p_target_type: 'reading', p_target_id: id, p_visitor: visitorId(), p_stars: next,
      });
      if (error) {
        if ((error.message || '').includes('rate_limited')) return 'rate_limited';
        console.error(error); return;
      }
    }
    it.yourRating = next;
    await refreshOne(id);
  }

  async function addComment(id, name, text) {
    const it = ITEMS.find(x => x.id === id);
    if (!it || !text.trim()) return;
    const { error } = await SB.from('comments').insert({
      target_type: 'reading', target_id: id, visitor_id: visitorId(),
      name: name.trim() || 'Anonymous', body: text.trim(),
    });
    if (error) { console.error(error); return; }
    it.comments.push({ author: name.trim() || 'Anonymous', text: text.trim(), when: 'just now', mine: true });
  }

  async function addTag(id, tag) {
    const it = ITEMS.find(x => x.id === id);
    if (!it) return;
    const { data, error } = await SB.rpc('add_reading_tag', { p_reading: id, p_tag: tag });
    if (error) { console.error(error); return; }
    if (Array.isArray(data)) it.tags = data;
  }

  // community suggestion -> moderation queue
  async function suggest(s) {
    const tags = (s.tags || '').split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
    const { error } = await SB.rpc('suggest_reading', {
      p_title: s.title, p_url: s.url, p_cat: s.category, p_type: s.type,
      p_tags: tags, p_description: s.description, p_contributor: s.contributor || '',
    });
    if (error) throw error;
  }

  return {
    load, reload, vote, rate, addComment, addTag, suggest, refreshOne,
    approve, reject,
    isSaved, toggleSaved, savedCount,
    ratingAvg, ratingCount,
    get CATS() { return CATS; },
    get ITEMS() { return ITEMS; },
    get PENDING() { return PENDING; },
  };
})();

window.EDU = EDU;
