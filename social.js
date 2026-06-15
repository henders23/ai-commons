/* EAP AI Commons — ratings + comments, backed by Supabase.
   Ratings and comments live in the database and are public to read and post.
   A per-browser visitorId() lets a person update their own rating and see which
   comments are theirs. Loads after supabase-client.js + commons.js. */

const SOCIAL = (function () {
  const NAME_KEY = 'eapaic:name';
  const getName = () => localStorage.getItem(NAME_KEY) || '';
  const setName = v => { try { localStorage.setItem(NAME_KEY, v); } catch (e) {} };

  // a 1..5 star row, `filled` may be fractional for the average display
  function starsSvg(filled, opt = {}) {
    const total = 5, size = opt.size || 16;
    let out = `<span class="stars" style="--star:${size}px">`;
    for (let i = 1; i <= total; i++) {
      const on = i <= Math.round(filled);
      out += `<svg viewBox="0 0 24 24" class="${on ? 'star-on' : 'star-off'}" stroke-width="1.5"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.98 6.2 21.07l1.1-6.47L2.6 10.02l6.5-.95z"/></svg>`;
    }
    return out + '</span>';
  }

  async function aggregate(id) {
    const vid = visitorId();
    const [statRes, mineRes] = await Promise.all([
      SB.from('artefact_rating_stats').select('*').eq('artefact_id', id).maybeSingle(),
      SB.from('ratings').select('stars').eq('artefact_id', id).eq('visitor_id', vid).maybeSingle(),
    ]);
    const s = statRes.data || {};
    const dist = [s.s1 || 0, s.s2 || 0, s.s3 || 0, s.s4 || 0, s.s5 || 0];
    const n = Number(s.n || 0);
    const avg = Number(s.avg || 0);
    const mine = mineRes.data ? mineRes.data.stars : 0;
    return { dist, n, avg, mine };
  }

  async function allComments(id) {
    const vid = visitorId();
    const { data } = await SB.from('comments').select('*').eq('artefact_id', id).order('created_at', { ascending: false });
    return (data || []).map(c => ({
      name: c.name, stars: c.stars, text: c.body,
      when: relativeTime(c.created_at), mine: c.visitor_id === vid,
    }));
  }

  const initials = name => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function commentHtml(c) {
    return `<div class="comment${c.mine ? ' mine' : ''}">
      <div class="av">${initials(c.name)}</div>
      <div class="cbody">
        <div class="chead">
          <span class="cname">${esc(c.name)}</span>
          ${c.mine ? '<span class="you-pill">YOU</span>' : ''}
          ${c.stars ? starsSvg(c.stars, { size: 13 }) : ''}
          <span class="cwhen">${c.when}</span>
        </div>
        <div class="ctext">${esc(c.text)}</div>
      </div>
    </div>`;
  }

  async function render(id, el) {
    const [ag, comments] = await Promise.all([aggregate(id), allComments(id)]);
    const maxBar = Math.max(1, ...ag.dist);

    const bars = [5, 4, 3, 2, 1].map(s => {
      const cnt = ag.dist[s - 1];
      const pct = ag.n ? Math.round((cnt / ag.n) * 100) : 0;
      return `<div class="rbar"><span class="lab">${s}</span>
        <span class="track"><span class="fill" style="width:${ag.n ? (cnt / maxBar) * 100 : 0}%"></span></span>
        <span class="pc">${pct}%</span></div>`;
    }).join('');

    el.innerHTML = `
      <div class="section-head"><h2>Ratings &amp; comments</h2>
        <span class="muted-note">${comments.length} comment${comments.length === 1 ? '' : 's'}</span></div>

      <div class="rate-summary">
        <div class="rate-meta">
          <div class="rate-big"><span class="n">${ag.avg ? ag.avg.toFixed(1) : '—'}</span><span class="d">/ 5</span></div>
          ${starsSvg(ag.avg, { size: 18 })}
          <span class="cnt">${ag.n} rating${ag.n === 1 ? '' : 's'}</span>
        </div>
        <div class="rate-bars">${bars}</div>
      </div>

      <div class="yourrate">
        <span class="yr-lab" id="yr-lab">${ag.mine ? 'Your rating' : 'Rate this artefact'}</span>
        <span class="starinput" id="starinput" role="radiogroup" aria-label="Your rating"></span>
        <span class="yr-hint" id="yr-hint">${ag.mine ? 'Tap to change' : 'Tap a star'}</span>
      </div>

      <div class="composer">
        <div class="crow">
          <input class="inp" id="c-name" type="text" placeholder="Your name" value="${esc(getName())}" />
          <input class="inp" id="c-text" type="text" placeholder="Share how you used it, or what to watch for…" />
        </div>
        <div class="cfoot">
          <span class="pickstars"><span class="pl">Your stars</span><span class="starinput" id="c-stars" style="--star:20px"></span></span>
          <button class="btn btn-primary btn-sm" id="c-submit">Post comment</button>
        </div>
      </div>

      <div class="comments" id="comments">${comments.map(commentHtml).join('')}</div>
    `;

    // interactive star inputs --------------------------------------------
    function paintStarInput(node, value, hoverVal) {
      const v = hoverVal != null ? hoverVal : value;
      node.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const on = i <= v;
        node.insertAdjacentHTML('beforeend',
          `<svg viewBox="0 0 24 24" data-v="${i}" class="${on ? 'star-on' : 'star-off'}" stroke-width="1.5"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.98 6.2 21.07l1.1-6.47L2.6 10.02l6.5-.95z"/></svg>`);
      }
    }
    function bindStarInput(node, getVal, onPick) {
      paintStarInput(node, getVal());
      node.addEventListener('mousemove', e => { const s = e.target.closest('svg'); if (s) paintStarInput(node, getVal(), +s.dataset.v); });
      node.addEventListener('mouseleave', () => paintStarInput(node, getVal()));
      node.addEventListener('click', e => { const s = e.target.closest('svg'); if (!s) return; onPick(+s.dataset.v); });
    }

    // your overall rating (persists to the DB, then re-renders to fold in)
    let myStars = ag.mine;
    const yrNode = el.querySelector('#starinput');
    bindStarInput(yrNode, () => myStars, async v => {
      myStars = v;
      const { error } = await SB.rpc('submit_rating', { p_artefact: id, p_visitor: visitorId(), p_stars: v });
      if (error) { console.error(error); return; }
      render(id, el);
    });

    // stars attached to the comment being composed
    let pendingStars = ag.mine || 5;
    const csNode = el.querySelector('#c-stars');
    bindStarInput(csNode, () => pendingStars, v => { pendingStars = v; paintStarInput(csNode, pendingStars); });

    // post a comment
    el.querySelector('#c-submit').addEventListener('click', async () => {
      const name = el.querySelector('#c-name').value.trim() || 'Anonymous';
      const text = el.querySelector('#c-text').value.trim();
      if (!text) { el.querySelector('#c-text').focus(); return; }
      setName(name);
      const btn = el.querySelector('#c-submit');
      btn.disabled = true;
      // fold in the picked stars as the visitor's rating too (best-effort)
      await SB.rpc('submit_rating', { p_artefact: id, p_visitor: visitorId(), p_stars: pendingStars });
      const { error } = await SB.from('comments').insert({
        artefact_id: id, visitor_id: visitorId(), name, stars: pendingStars, body: text,
      });
      btn.disabled = false;
      if (error) { console.error(error); return; }
      render(id, el);
    });
  }

  return { render, aggregate, starsSvg };
})();
