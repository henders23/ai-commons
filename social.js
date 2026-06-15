/* EAP AI Commons — ratings + comments.
   Seed activity lives in SEED_SOCIAL (commons-data.js); the current visitor's
   own rating and comments are stored in localStorage and overlaid on top, so
   they persist across reloads. Loads after commons-data.js + commons.js. */

const SOCIAL = (function () {
  const LS = {
    name: 'eapaic:name',
    rating: id => `eapaic:rating:${id}`,
    comments: id => `eapaic:comments:${id}`,
  };
  const getName = () => localStorage.getItem(LS.name) || '';
  const setName = v => { try { localStorage.setItem(LS.name, v); } catch (e) {} };
  const myRating = id => { const v = +localStorage.getItem(LS.rating(id)); return v >= 1 && v <= 5 ? v : 0; };
  const setMyRating = (id, v) => { try { localStorage.setItem(LS.rating(id), String(v)); } catch (e) {} };
  const myComments = id => { try { return JSON.parse(localStorage.getItem(LS.comments(id))) || []; } catch (e) { return []; } };
  const addMyComment = (id, c) => { const arr = myComments(id); arr.unshift(c); try { localStorage.setItem(LS.comments(id), JSON.stringify(arr)); } catch (e) {} };

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

  function aggregate(id) {
    const seed = (SEED_SOCIAL[id] && SEED_SOCIAL[id].ratings) ? SEED_SOCIAL[id].ratings.slice() : [];
    const mine = myRating(id);
    const all = mine ? seed.concat(mine) : seed;
    const dist = [0, 0, 0, 0, 0];
    all.forEach(r => { if (r >= 1 && r <= 5) dist[r - 1]++; });
    const n = all.length;
    const avg = n ? all.reduce((a, b) => a + b, 0) / n : 0;
    return { dist, n, avg, mine };
  }

  function allComments(id) {
    const seed = (SEED_SOCIAL[id] && SEED_SOCIAL[id].comments) ? SEED_SOCIAL[id].comments : [];
    return myComments(id).concat(seed);
  }

  const initials = name => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function commentHtml(c) {
    return `<div class="comment${c.mine ? ' mine' : ''}">
      <div class="av">${initials(c.name)}</div>
      <div class="cbody">
        <div class="chead">
          <span class="cname">${esc(c.name)}</span>
          ${c.mine ? '<span class="you-pill">YOU</span>' : ''}
          ${starsSvg(c.stars, { size: 13 })}
          <span class="cwhen">${c.when}</span>
        </div>
        <div class="ctext">${esc(c.text)}</div>
      </div>
    </div>`;
  }

  function render(id, el) {
    const ag = aggregate(id);
    const comments = allComments(id);
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

    // your overall rating (persists immediately)
    const yrNode = el.querySelector('#starinput');
    bindStarInput(yrNode, () => myRating(id), v => {
      setMyRating(id, v);
      render(id, el); // re-render to fold the new rating into the average + bars
    });

    // stars attached to the comment being composed
    let pendingStars = myRating(id) || 5;
    const csNode = el.querySelector('#c-stars');
    bindStarInput(csNode, () => pendingStars, v => { pendingStars = v; paintStarInput(csNode, pendingStars); });

    // post a comment
    el.querySelector('#c-submit').addEventListener('click', () => {
      const name = el.querySelector('#c-name').value.trim() || 'Anonymous';
      const text = el.querySelector('#c-text').value.trim();
      if (!text) { el.querySelector('#c-text').focus(); return; }
      setName(name);
      if (!myRating(id)) setMyRating(id, pendingStars);
      addMyComment(id, { name, when: 'just now', stars: pendingStars, text, mine: true });
      render(id, el);
    });
  }

  return { render, aggregate, starsSvg };
})();
