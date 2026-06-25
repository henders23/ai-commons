/* AI Commons for Education — the readings app.
   A faithful vanilla-JS port of the Library.dc.html prototype: a home screen and
   a two-pane community index of readings (vote, rate, discuss, tag, save, suggest).
   Loads after supabase-client.js + readings-data.js. Mount with EDUApp.mount(el). */

const EDUApp = (function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mono = "font-family:var(--mono);";

  const state = {
    theme: (function () { try { return localStorage.getItem('aice-theme') || 'dark'; } catch (e) { return 'dark'; } })(),
    screen: 'home', category: 'all', query: '', sort: 'top', view: 'list',
    groupByTag: false, activeTag: null,
    expanded: {}, drafts: {}, tagDrafts: {},
    showSuggest: false,
    suggest: { url: '', title: '', category: 'policy', type: 'article', tags: '', description: '', contributor: '' },
    user: null, isAdmin: false,
    showAuth: false, authMode: 'signin', authMsg: '', auth: { email: '', password: '' },
    toast: null, _toastT: null,
  };

  let root = null;

  function applyTheme() { document.documentElement.setAttribute('data-theme', state.theme); }
  function flash(msg) {
    state.toast = msg; render();
    clearTimeout(state._toastT);
    state._toastT = setTimeout(() => { state.toast = null; render(); }, 2600);
  }

  // ---- derived data ---------------------------------------------------------
  function counts() {
    const c = {};
    EDU.CATS.forEach(cat => { c[cat.key] = cat.key === 'all' ? EDU.ITEMS.length : EDU.ITEMS.filter(i => i.cat === cat.key).length; });
    return c;
  }
  function currentList() {
    const s = state;
    const inSaved = s.category === 'readlater';
    let list = inSaved ? EDU.ITEMS.filter(i => EDU.isSaved(i.id))
                       : EDU.ITEMS.filter(i => s.category === 'all' || i.cat === s.category);
    if (s.activeTag) list = list.filter(i => i.tags.includes(s.activeTag));
    const q = s.query.trim().toLowerCase();
    if (q) list = list.filter(i => (i.title + ' ' + i.domain + ' ' + i.description + ' ' + i.tags.join(' ')).toLowerCase().includes(q));
    const avg = it => EDU.ratingAvg(it);
    list = [...list].sort((a, b) => {
      if (s.sort === 'new') return b.added - a.added;
      if (s.sort === 'rated') return avg(b) - avg(a);
      return b.score - a.score;
    });
    return list;
  }

  // ---- small markup helpers -------------------------------------------------
  const themeGlyph = () => state.theme === 'dark' ? '☾' : '☀';
  const themeLabel = () => state.theme === 'dark' ? 'Dark' : 'Light';
  const themeTitle = () => state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  function themeToggleBtn(big) {
    const pad = big ? '8px 14px' : '7px 11px';
    return `<button data-action="toggle-theme" title="${esc(themeTitle())}" class="h-bd"
      style="display:inline-flex;align-items:center;gap:7px;padding:${pad};background:transparent;color:var(--t-muted);border:1px solid var(--line2);border-radius:${big ? 9 : 7}px;font-size:${big ? 13 : 12}px;cursor:pointer;${mono}"><span style="font-size:14px;line-height:1;">${themeGlyph()}</span> ${themeLabel()} mode</button>`;
  }

  // ---- HOME screen ----------------------------------------------------------
  // Two identical "access" bands (library + artefacts) keep the start page clean.
  function accessBand(o) {
    return `<div class="edu-band" style="position:relative;overflow:hidden;border:1px solid var(--line2);border-radius:18px;padding:clamp(26px,4vw,44px);background:radial-gradient(130% 130% at 100% 0%, color-mix(in srgb, var(--t-1) 5%, transparent), transparent 55%), var(--bg2);">
      <h2 style="margin:0;font-size:clamp(23px,3.2vw,31px);font-weight:700;letter-spacing:-0.02em;">${esc(o.title)}</h2>
      <p style="margin:14px 0 0;font-size:15.5px;line-height:1.6;color:var(--t-2);max-width:620px;">${esc(o.body)}</p>
      <div style="display:flex;align-items:center;gap:12px;margin-top:26px;flex-wrap:wrap;">${o.primary}${o.secondary || ''}</div>
    </div>`;
  }

  function homeHtml() {
    const lib = accessBand({
      title: 'The AI Commons Library',
      body: 'Access an open collection of readings, artefacts and activities to help educators navigate the challenges and opportunities of artificial intelligence in teaching, learning and course design.',
      primary: `<button data-action="enter" class="h-lift" style="display:inline-flex;align-items:center;gap:8px;padding:14px 24px;background:var(--t-1);color:var(--bg);border:none;border-radius:10px;font-size:14.5px;font-weight:600;cursor:pointer;">Browse the library →</button>`,
      secondary: `<button data-action="open-suggest" class="h-bd" style="padding:14px 22px;background:transparent;color:var(--t-1);border:1px solid var(--line3);border-radius:10px;font-size:14.5px;font-weight:500;cursor:pointer;">Suggest a link</button>`,
    });
    const art = accessBand({
      title: 'AI artefacts for use in EAP',
      body: 'Practical, classroom-ready resources for English for Academic Purposes — skills, prompts, frameworks and documents you can adapt and use in teaching, curated and moderated by practitioners.',
      primary: `<a href="EAP%20AI%20Commons.html" class="h-lift" style="display:inline-flex;align-items:center;gap:8px;padding:14px 24px;background:var(--t-1);color:var(--bg);border-radius:10px;font-size:14.5px;font-weight:600;text-decoration:none;">Open the artefacts library →</a>`,
    });

    return `<div class="edu-scroll" style="height:100vh;overflow-y:auto;">
      <div class="edu-container" style="max-width:1080px;margin:0 auto;padding:0 40px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:22px 0;border-bottom:1px solid var(--line);">
          <div style="${mono}font-size:11px;letter-spacing:0.2em;color:var(--t-eyebrow);text-transform:uppercase;">AI Commons · for Education</div>
          ${themeToggleBtn(true)}
        </div>

        <div style="padding:clamp(52px,9vw,92px) 0 clamp(38px,6vw,60px);max-width:860px;">
          <h1 style="margin:0;font-size:clamp(33px,6vw,56px);line-height:1.06;letter-spacing:-0.03em;font-weight:700;">AI-related readings, activities &amp; resources for higher educators.</h1>
          <div style="display:flex;align-items:center;gap:20px;margin-top:32px;${mono}font-size:12px;color:var(--t-muted);flex-wrap:wrap;">
            <span><span style="color:var(--t-1);font-weight:600;">${EDU.ITEMS.length}</span> readings</span>
            <span style="color:var(--sep);">/</span>
            <span><span style="color:var(--t-1);font-weight:600;">6</span> categories</span>
            <span style="color:var(--sep);">/</span>
            <span>open access · community-curated</span>
          </div>
        </div>

        <div class="edu-access" style="display:flex;flex-direction:column;gap:18px;padding:0 0 72px;">
          ${lib}
          ${art}
        </div>

        <div style="padding:26px 0 60px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;${mono}font-size:11px;color:var(--t-faint);letter-spacing:0.04em;">
          <span>AI Commons for Education</span>
          <span>Open access · CC BY 4.0</span>
        </div>
      </div>
    </div>`;
  }

  // ---- APP screen -----------------------------------------------------------
  function navHtml() {
    const cnt = counts();
    const inSaved = state.category === 'readlater';
    return EDU.CATS.map(c => {
      const active = !inSaved && state.category === c.key;
      return `<button data-action="browse-cat" data-cat="${c.key}"
        style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;margin-bottom:2px;background:${active ? 'var(--active)' : 'transparent'};border:none;border-left:2px solid ${active ? 'var(--t-1)' : 'transparent'};border-radius:0 7px 7px 0;cursor:pointer;text-align:left;">
        <span style="font-size:13.5px;color:${active ? 'var(--t-1)' : 'var(--t-label)'};font-weight:${active ? 600 : 400};">${esc(c.label)}</span>
        <span style="${mono}font-size:11px;color:${active ? 'var(--t-label)' : 'var(--t-dim)'};">${cnt[c.key] || 0}</span>
      </button>`;
    }).join('');
  }

  function rowHtml(it, i, header, headerCount, cards) {
    const s = state;
    const expanded = !!s.expanded[it.id];
    const avg = EDU.ratingAvg(it), rcount = EDU.ratingCount(it);
    const saved = EDU.isSaved(it.id);
    const cc = it.comments.length;
    const showRank = !cards && !header;
    const scoreColor = it.userVote !== 0 ? 'var(--t-1)' : 'var(--t-score)';
    const headerBlock = header ? `<div style="grid-column:1 / -1;display:flex;align-items:baseline;gap:10px;margin:18px 0 4px;padding-bottom:8px;border-bottom:1px solid var(--line);">
        <span style="${mono}font-size:13px;font-weight:600;color:var(--t-1);letter-spacing:0.02em;">${esc(header)}</span>
        <span style="${mono}font-size:11px;color:var(--t-faint);">${esc(headerCount)}</span>
      </div>` : '';

    const desc = `<p style="${(cards || expanded)
        ? 'margin:11px 0 0;font-size:13.5px;color:var(--t-2);line-height:1.6;max-width:640px;'
        : 'margin:9px 0 0;font-size:13px;color:var(--t-listdesc);line-height:1.5;max-width:640px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'}">${esc(it.description)}</p>`;

    const expandBlock = expanded ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid var(--line);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          <span style="${mono}font-size:11px;color:var(--t-muted);letter-spacing:0.06em;text-transform:uppercase;">Your rating</span>
          <div style="display:flex;gap:3px;">${[1, 2, 3, 4, 5].map(n =>
            `<span data-action="rate" data-id="${it.id}" data-star="${n}" style="font-size:18px;color:${n <= it.yourRating ? 'var(--t-1)' : 'var(--star-empty)'};cursor:pointer;line-height:1;">★</span>`).join('')}</div>
          <span style="${mono}font-size:11px;color:var(--t-faint);">${it.yourRating > 0 ? it.yourRating + '/5' : 'tap to rate'}</span>
        </div>
        <div style="${mono}font-size:10.5px;color:var(--t-muted);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px;">Tags</div>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:20px;">
          ${it.tags.map(t => `<button data-action="filter-tag" data-tag="${esc(t)}" class="h-bd" style="${mono}font-size:10.5px;color:var(--t-label);background:var(--field);border:1px solid var(--line2);border-radius:5px;padding:3px 8px;cursor:pointer;">#${esc(t)}</button>`).join('')}
          <input data-tagdraft="${it.id}" data-enter="add-tag" value="${esc(s.tagDrafts[it.id] || '')}" placeholder="add tag +" style="width:96px;background:transparent;border:1px dashed var(--line3);border-radius:5px;padding:3px 8px;color:var(--t-score);${mono}font-size:10.5px;outline:none;" />
        </div>
        <div style="${mono}font-size:10.5px;color:var(--t-muted);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px;">Discussion · ${cc}</div>
        ${it.comments.map(c => `<div style="display:flex;gap:11px;margin-bottom:15px;">
          <div style="flex:none;width:28px;height:28px;border-radius:50%;border:1px solid var(--line3);display:flex;align-items:center;justify-content:center;${mono}font-size:10px;color:var(--t-label);">${esc(initials(c.author))}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px;">
              <span style="font-size:12.5px;font-weight:600;color:var(--t-author);">${esc(c.author)}</span>
              <span style="${mono}font-size:10.5px;color:var(--t-faint);">${esc(c.when)}${c.mine ? ' · you' : ''}</span>
            </div>
            <div style="font-size:13px;color:var(--t-2);line-height:1.55;">${esc(c.text)}</div>
          </div>
        </div>`).join('')}
        <div style="display:flex;gap:11px;margin-top:16px;">
          <div style="flex:none;width:28px;height:28px;border-radius:50%;border:1px solid var(--line3);display:flex;align-items:center;justify-content:center;${mono}font-size:10px;color:var(--t-eyebrow);">YOU</div>
          <div style="flex:1;display:flex;gap:8px;">
            <input data-draft="${it.id}" data-enter="post-comment" value="${esc(s.drafts[it.id] || '')}" placeholder="Add to the discussion…" style="flex:1;min-width:0;background:var(--field);border:1px solid var(--line2);border-radius:8px;padding:9px 12px;color:var(--t-1);font-size:13px;outline:none;" />
            <button data-action="post-comment" data-id="${it.id}" style="flex:none;padding:9px 16px;background:var(--t-1);color:var(--bg);border:none;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;">Post</button>
          </div>
        </div>
      </div>` : '';

    const rowStyle = cards
      ? 'display:flex;gap:14px;padding:20px;background:var(--card);border:1px solid var(--line);border-radius:14px;'
      : 'display:flex;gap:16px;padding:20px 6px;border-bottom:1px solid var(--line);';

    return `${headerBlock}<article style="${rowStyle}">
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:none;padding-top:1px;width:34px;">
        <button data-action="vote-up" data-id="${it.id}" style="background:transparent;border:none;cursor:pointer;padding:1px;line-height:.7;font-size:15px;color:${it.userVote === 1 ? 'var(--t-1)' : 'var(--t-dim)'};">▲</button>
        <span style="${mono}font-size:13px;font-weight:600;color:${scoreColor};">${it.score}</span>
        <button data-action="vote-down" data-id="${it.id}" style="background:transparent;border:none;cursor:pointer;padding:1px;line-height:.7;font-size:15px;color:${it.userVote === -1 ? 'var(--t-1)' : 'var(--t-dim)'};">▼</button>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:baseline;gap:9px;">
          ${showRank ? `<span style="${mono}font-size:12px;color:var(--t-dim);flex:none;">${String(i + 1).padStart(2, '0')}</span>` : ''}
          <a href="${esc(it.url)}" target="_blank" rel="noopener" class="h-underline" style="font-size:15.5px;font-weight:600;color:var(--t-1);text-decoration:none;line-height:1.35;">${esc(it.title)}</a>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:7px;${mono}font-size:11.5px;color:var(--t-muted);">
          <span style="color:var(--t-label);letter-spacing:0.06em;">${it.type === 'article' ? 'ARTICLE' : 'WEBSITE'}</span>
          <span style="color:var(--sep);">·</span><span>${esc(it.domain)}</span>
          <span style="color:var(--sep);">·</span><span>${esc(it.date)}</span>
          <span style="color:var(--sep);">·</span><span style="color:var(--t-label);">★ ${avg > 0 ? avg.toFixed(1) : '—'}</span>
          <span style="color:var(--t-faint);">${avg > 0 ? '(' + rcount + ')' : ''}</span>
        </div>
        ${desc}
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px;${mono}font-size:11.5px;">
          <button data-action="save" data-id="${it.id}" style="display:flex;align-items:center;gap:6px;background:transparent;border:none;cursor:pointer;padding:0;${mono}font-size:11.5px;color:${saved ? 'var(--t-1)' : 'var(--t-muted)'};"><span style="font-size:12px;">${saved ? '✓' : '❏'}</span> ${saved ? 'Saved' : 'Read later'}</button>
          <button data-action="toggle-row" data-id="${it.id}" style="display:flex;align-items:center;gap:6px;background:transparent;border:none;cursor:pointer;padding:0;${mono}font-size:11.5px;color:${expanded ? 'var(--t-1)' : 'var(--t-muted)'};"><span style="font-size:12px;">❝</span> ${cc === 0 ? 'Discuss' : cc + (cc === 1 ? ' comment' : ' comments')} <span style="font-size:9px;">${expanded ? '▲' : '▼'}</span></button>
          <a href="${esc(it.url)}" target="_blank" rel="noopener" class="h-txt" style="${mono}font-size:11.5px;color:var(--t-muted);text-decoration:none;">Open ↗</a>
        </div>
        ${expandBlock}
      </div>
    </article>`;
  }

  function initials(name) { return (name || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'; }

  function resultsHtml() {
    const s = state;
    if (s.category === 'review') return reviewHtml();
    const inSaved = s.category === 'readlater';
    const list = currentList();
    const cards = s.view === 'cards';
    const grouping = s.groupByTag && !inSaved;

    if (!list.length) {
      const savedEmpty = inSaved;
      return `<div style="text-align:center;padding:90px 20px;color:var(--t-faint);">
        <div style="font-size:34px;margin-bottom:14px;">${savedEmpty ? '❏' : '⌕'}</div>
        <div style="font-size:15px;color:var(--t-3);">${savedEmpty ? 'Nothing saved yet' : 'No readings match'}</div>
        <div style="${mono}font-size:12px;margin-top:8px;">${savedEmpty ? 'Tap “Read later” on any reading to keep it here.' : 'Try a different category, tag, or search.'}</div>
      </div>`;
    }

    let rows;
    if (grouping) {
      const freq = {};
      list.forEach(it => it.tags.forEach(t => { freq[t] = (freq[t] || 0) + 1; }));
      const tags = Object.keys(freq).sort((a, b) => freq[b] - freq[a] || a.localeCompare(b));
      rows = '';
      tags.forEach(tag => {
        const its = list.filter(it => it.tags.includes(tag));
        its.forEach((it, i) => rows += rowHtml(it, i, i === 0 ? '#' + tag : null, i === 0 ? its.length + (its.length === 1 ? ' reading' : ' readings') : null, cards));
      });
    } else {
      rows = list.map((it, i) => rowHtml(it, i, null, null, cards)).join('');
    }
    const container = cards
      ? 'display:grid;grid-template-columns:repeat(2,1fr);gap:14px;align-items:start;'
      : 'display:flex;flex-direction:column;';
    return `<div style="${container}">${rows}</div>`;
  }

  // ---- moderation (admins only) ---------------------------------------------
  function reviewNavHtml() {
    const n = EDU.PENDING.length;
    const on = state.category === 'review';
    return `<button data-action="review" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;margin-bottom:10px;background:${on ? 'var(--active)' : 'transparent'};border:1px solid ${on ? 'var(--line-hover)' : 'var(--line)'};border-radius:8px;cursor:pointer;text-align:left;">
      <span style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:${on ? 'var(--t-1)' : 'var(--t-label)'};font-weight:${on || n ? 600 : 400};"><span style="font-size:12px;">⚑</span> Review queue</span>
      <span style="${mono}font-size:11px;color:${n ? 'var(--bg)' : 'var(--t-dim)'};background:${n ? 'var(--t-1)' : 'transparent'};border-radius:20px;padding:${n ? '1px 7px' : '0'};">${n}</span>
    </button>`;
  }

  function reviewHtml() {
    if (!state.isAdmin) return `<div style="text-align:center;padding:90px 20px;color:var(--t-faint);"><div style="font-size:15px;color:var(--t-3);">Editors only — sign in to review suggestions.</div></div>`;
    const list = EDU.PENDING;
    if (!list.length) return `<div style="text-align:center;padding:90px 20px;color:var(--t-faint);">
        <div style="font-size:34px;margin-bottom:14px;">✓</div>
        <div style="font-size:15px;color:var(--t-3);">Queue is clear</div>
        <div style="${mono}font-size:12px;margin-top:8px;">New community suggestions will appear here for review.</div>
      </div>`;
    const cardFor = it => {
      const cat = EDU.CATS.find(c => c.key === it.cat);
      return `<article style="display:flex;flex-direction:column;gap:12px;padding:22px;background:var(--card);border:1px solid var(--line2);border-radius:14px;margin-bottom:14px;">
        <div style="min-width:0;">
          <a href="${esc(it.url)}" target="_blank" rel="noopener" class="h-underline" style="font-size:16px;font-weight:600;color:var(--t-1);text-decoration:none;line-height:1.35;">${esc(it.title)}</a>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:7px;${mono}font-size:11.5px;color:var(--t-muted);">
            <span style="color:var(--t-label);letter-spacing:0.06em;">${it.type === 'article' ? 'ARTICLE' : 'WEBSITE'}</span>
            <span style="color:var(--sep);">·</span><span>${esc(it.domain)}</span>
            <span style="color:var(--sep);">·</span><span style="color:var(--t-label);">${esc(cat ? cat.label : it.cat)}</span>
            <span style="color:var(--sep);">·</span><span>by ${esc(it.contributor || 'Anonymous')}</span>
          </div>
        </div>
        ${it.description ? `<p style="margin:0;font-size:13.5px;color:var(--t-2);line-height:1.6;max-width:680px;">${esc(it.description)}</p>` : ''}
        ${it.tags.length ? `<div style="display:flex;gap:7px;flex-wrap:wrap;">${it.tags.map(t => `<span style="${mono}font-size:10.5px;color:var(--t-label);background:var(--field);border:1px solid var(--line2);border-radius:5px;padding:3px 8px;">#${esc(t)}</span>`).join('')}</div>` : ''}
        <div style="display:flex;align-items:center;gap:10px;margin-top:2px;">
          <button data-action="approve" data-id="${it.id}" class="h-accent" style="display:flex;align-items:center;gap:7px;padding:9px 16px;background:var(--t-1);color:var(--bg);border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">✓ Approve &amp; publish</button>
          <button data-action="reject" data-id="${it.id}" class="h-bd" style="display:flex;align-items:center;gap:7px;padding:9px 16px;background:transparent;color:var(--t-2);border:1px solid var(--line3);border-radius:8px;font-size:13px;cursor:pointer;">✕ Reject</button>
        </div>
      </article>`;
    };
    return `<div style="max-width:720px;">${list.map(cardFor).join('')}</div>`;
  }

  function appHtml() {
    const s = state;
    const inSaved = s.category === 'readlater';
    const inReview = s.category === 'review';
    const curCat = EDU.CATS.find(c => c.key === s.category) || EDU.CATS[0];
    const label = inReview ? 'Review queue' : inSaved ? 'Read later' : curCat.label;
    const blurb = inReview ? 'Community suggestions awaiting an editor’s decision — approve to publish, or reject to discard.'
      : inSaved ? 'Readings you saved to revisit. They stay here until you remove them.' : curCat.blurb;
    const saved = EDU.savedCount();
    const sortDefs = [['top', 'Top'], ['new', 'Newest'], ['rated', 'Rated']];
    const viewDefs = [['list', '☰', 'List'], ['cards', '▦', 'Cards']];

    const sortBtns = sortDefs.map(([k, l]) => {
      const on = s.sort === k;
      return `<button data-action="sort" data-sort="${k}" style="padding:6px 11px;background:${on ? 'var(--t-1)' : 'transparent'};color:${on ? 'var(--bg)' : 'var(--t-label)'};border:1px solid ${on ? 'var(--t-1)' : 'var(--line2)'};border-radius:7px;font-size:12px;cursor:pointer;${mono}">${l}</button>`;
    }).join('');
    const viewBtns = viewDefs.map(([k, ic, l]) => {
      const on = s.view === k;
      return `<button data-action="view" data-view="${k}" title="${l}" style="padding:6px 11px;background:${on ? 'var(--line)' : 'transparent'};color:${on ? 'var(--t-1)' : 'var(--t-muted)'};border:none;font-size:13px;cursor:pointer;">${ic}</button>`;
    }).join('');
    const grouping = s.groupByTag && !inSaved;

    return `<div class="edu-app" style="display:flex;height:100vh;width:100%;">
      <aside class="edu-sidebar" style="width:278px;flex:none;border-right:1px solid var(--line);display:flex;flex-direction:column;background:var(--bg2);">
        <div data-action="gohome" title="Back to home" style="padding:26px 22px 18px;cursor:pointer;">
          <div style="${mono}font-size:10.5px;letter-spacing:0.22em;color:var(--t-eyebrow);text-transform:uppercase;margin-bottom:12px;">← Home</div>
          <div style="font-size:21px;font-weight:700;letter-spacing:-0.01em;line-height:1.15;">AI Commons<br>for Education</div>
          <div style="font-size:12.5px;color:var(--t-3);line-height:1.5;margin-top:8px;">A community-curated index of readings — plus practical artefacts — on artificial intelligence in academia.</div>
        </div>
        <div style="padding:0 16px 12px;">
          <div style="display:flex;align-items:center;gap:8px;background:var(--field);border:1px solid var(--line2);border-radius:9px;padding:8px 11px;">
            <span style="color:var(--t-faint);font-size:13px;">⌕</span>
            <input id="edu-search" value="${esc(s.query)}" placeholder="Search readings…" style="flex:1;min-width:0;background:transparent;border:none;outline:none;color:var(--t-1);font-size:13px;" />
          </div>
        </div>
        <div style="padding:0 12px 8px;">
          <button data-action="readlater" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;background:${inSaved ? 'var(--active)' : 'transparent'};border:1px solid ${inSaved ? 'var(--line-hover)' : 'var(--line)'};border-radius:8px;cursor:pointer;text-align:left;">
            <span style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:${inSaved ? 'var(--t-1)' : 'var(--t-label)'};font-weight:${inSaved ? 600 : 400};"><span style="font-size:13px;">❏</span> Read later</span>
            <span style="${mono}font-size:11px;color:${inSaved ? 'var(--t-label)' : 'var(--t-dim)'};">${saved}</span>
          </button>
        </div>
        <div style="${mono}font-size:9.5px;letter-spacing:0.16em;color:var(--t-dim);text-transform:uppercase;padding:8px 22px 6px;">Categories</div>
        <nav class="edu-scroll edu-nav" style="flex:1;overflow-y:auto;padding:0 12px 4px;">${navHtml()}</nav>
        <div style="padding:16px;border-top:1px solid var(--line);">
          ${state.isAdmin ? reviewNavHtml() : ''}
          <button data-action="open-suggest" class="h-accent" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;background:var(--t-1);color:var(--bg);border:none;border-radius:9px;font-size:13.5px;font-weight:600;cursor:pointer;"><span style="font-size:15px;line-height:1;">＋</span> Suggest a link</button>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;${mono}font-size:10.5px;color:var(--t-faint);text-align:center;margin-top:12px;letter-spacing:0.04em;">
            <span>${EDU.ITEMS.length} links · ${saved} saved</span>
            <span style="color:var(--sep);">·</span>
            ${state.isAdmin
              ? `<button data-action="signout" class="h-txt" style="background:none;border:none;${mono}font-size:10.5px;color:var(--t-faint);cursor:pointer;padding:0;">Sign out</button>`
              : `<button data-action="open-auth" class="h-txt" style="background:none;border:none;${mono}font-size:10.5px;color:var(--t-faint);cursor:pointer;padding:0;">Editor sign-in</button>`}
          </div>
        </div>
      </aside>

      <main class="edu-main" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <header class="edu-appheader" style="padding:24px 34px 18px;border-bottom:1px solid var(--line);display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex:none;">
          <div style="min-width:0;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em;">${esc(label)}</h1>
              ${s.activeTag ? `<button data-action="clear-tag" style="display:flex;align-items:center;gap:6px;background:var(--field);border:1px solid var(--line3);border-radius:20px;padding:4px 11px;cursor:pointer;${mono}font-size:11.5px;color:var(--t-author);">#${esc(s.activeTag)} <span style="font-size:12px;color:var(--t-3);">✕</span></button>` : ''}
            </div>
            <p style="margin:6px 0 0;font-size:13px;color:var(--t-3);line-height:1.45;max-width:560px;">${esc(blurb)}</p>
          </div>
          <div class="edu-tools" style="display:flex;align-items:center;gap:14px;flex:none;">
            ${themeToggleBtn(false)}
            ${inReview ? '' : `<button data-action="toggle-group" title="Group by tag" style="display:flex;align-items:center;gap:7px;padding:6px 11px;background:${grouping ? 'var(--t-1)' : 'transparent'};color:${grouping ? 'var(--bg)' : 'var(--t-label)'};border:1px solid ${grouping ? 'var(--t-1)' : 'var(--line2)'};border-radius:7px;font-size:12px;cursor:pointer;${mono}"><span style="font-size:12px;">⊞</span> By tag</button>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="${mono}font-size:10.5px;color:var(--t-faint);letter-spacing:0.1em;text-transform:uppercase;margin-right:2px;">Sort</span>${sortBtns}
            </div>
            <div style="display:flex;border:1px solid var(--line2);border-radius:7px;overflow:hidden;">${viewBtns}</div>`}
          </div>
        </header>
        <div class="edu-scroll edu-results" style="flex:1;overflow-y:auto;padding:26px 34px 80px;">${resultsHtml()}</div>
      </main>
    </div>`;
  }

  // ---- suggest modal + toast ------------------------------------------------
  function modalHtml() {
    if (!state.showSuggest) return '';
    const sg = state.suggest;
    const cats = EDU.CATS.filter(c => c.key !== 'all').map(c => {
      const on = sg.category === c.key;
      return `<button data-action="suggest-cat" data-cat="${c.key}" style="padding:6px 10px;background:${on ? 'var(--t-1)' : 'var(--field)'};color:${on ? 'var(--bg)' : 'var(--t-label)'};border:1px solid ${on ? 'var(--t-1)' : 'var(--line2)'};border-radius:7px;font-size:11.5px;cursor:pointer;${mono}">${esc(c.label)}</button>`;
    }).join('');
    const types = [['article', 'Article'], ['website', 'Website']].map(([k, l]) => {
      const on = sg.type === k;
      return `<button data-action="suggest-type" data-type="${k}" style="padding:6px 14px;background:${on ? 'var(--t-1)' : 'var(--field)'};color:${on ? 'var(--bg)' : 'var(--t-label)'};border:1px solid ${on ? 'var(--t-1)' : 'var(--line2)'};border-radius:7px;font-size:11.5px;cursor:pointer;${mono}">${l}</button>`;
    }).join('');
    const lbl = 'display:block;' + mono + 'font-size:10.5px;color:var(--t-muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:7px;';
    const fld = 'width:100%;background:var(--field);border:1px solid var(--line2);border-radius:9px;padding:11px 13px;color:var(--t-1);font-size:13.5px;outline:none;';
    const ready = sg.title.trim() && sg.url.trim();

    return `<div id="edu-suggest-backdrop" style="position:fixed;inset:0;background:rgba(4,4,5,0.74);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:50;animation:ovIn .16s ease;">
      <div style="width:520px;max-width:92vw;max-height:88vh;overflow-y:auto;background:var(--modal);border:1px solid var(--line2);border-radius:16px;padding:30px;animation:modIn .2s cubic-bezier(.2,.8,.3,1);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:6px;">
          <h2 style="margin:0;font-size:19px;font-weight:700;letter-spacing:-0.01em;">Suggest a link</h2>
          <button data-action="close-suggest" style="background:transparent;border:none;color:var(--t-muted);font-size:20px;cursor:pointer;line-height:1;padding:0;">✕</button>
        </div>
        <p style="margin:0 0 22px;font-size:13px;color:var(--t-3);line-height:1.5;">Share an article or website on AI in higher education. Suggestions are reviewed by an editor before they appear in the index.</p>
        <label style="${lbl}">URL</label>
        <input data-sg="url" value="${esc(sg.url)}" placeholder="https://…" style="${fld}margin-bottom:18px;" />
        <label style="${lbl}">Title</label>
        <input data-sg="title" value="${esc(sg.title)}" placeholder="What is it called?" style="${fld}margin-bottom:18px;" />
        <label style="${lbl}">Category</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;">${cats}</div>
        <div style="margin-bottom:18px;">
          <label style="${lbl}">Type</label>
          <div style="display:flex;gap:6px;">${types}</div>
        </div>
        <label style="${lbl}">Tags <span style="color:var(--t-dim);text-transform:none;letter-spacing:0;">— comma separated</span></label>
        <input data-sg="tags" value="${esc(sg.tags)}" placeholder="policy, assessment, ethics" style="${fld}margin-bottom:18px;" />
        <label style="${lbl}">Your name <span style="color:var(--t-dim);text-transform:none;letter-spacing:0;">— optional</span></label>
        <input data-sg="contributor" value="${esc(sg.contributor)}" placeholder="e.g. J. Okafor" style="${fld}margin-bottom:18px;" />
        <label style="${lbl}">Why is it worth reading?</label>
        <textarea data-sg="description" placeholder="A sentence or two of context…" rows="3" style="${fld}resize:vertical;line-height:1.5;margin-bottom:24px;">${esc(sg.description)}</textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <span style="${mono}font-size:11px;color:var(--t-faint);">${ready ? 'Ready to submit' : 'Add a title and URL'}</span>
          <div style="display:flex;gap:10px;">
            <button data-action="close-suggest" style="padding:10px 18px;background:transparent;color:var(--t-2);border:1px solid var(--line3);border-radius:9px;font-size:13px;cursor:pointer;">Cancel</button>
            <button data-action="submit-suggest" style="padding:10px 20px;background:var(--t-1);color:var(--bg);border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;">Submit link</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function authModalHtml() {
    if (!state.showAuth) return '';
    const lbl = 'display:block;' + mono + 'font-size:10.5px;color:var(--t-muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:7px;';
    const fld = 'width:100%;background:var(--field);border:1px solid var(--line2);border-radius:9px;padding:11px 13px;color:var(--t-1);font-size:13.5px;outline:none;';
    const signedIn = !!state.user;
    const isSignup = state.authMode === 'signup';
    const msg = state.authMsg ? `<div style="${mono}font-size:11.5px;color:var(--t-3);margin:0 0 16px;">${esc(state.authMsg)}</div>` : '';

    let body;
    if (signedIn && state.isAdmin) {
      body = `<p style="margin:0 0 22px;font-size:13px;color:var(--t-3);line-height:1.5;">You're signed in as <b style="color:var(--t-2);">${esc(state.user.email || 'an editor')}</b> and can moderate. Open the <b style="color:var(--t-2);">Review queue</b> in the sidebar.</p>
        ${msg}
        <div style="display:flex;justify-content:flex-end;gap:10px;"><button data-action="signout" style="padding:10px 18px;background:transparent;color:var(--t-2);border:1px solid var(--line3);border-radius:9px;font-size:13px;cursor:pointer;">Sign out</button><button data-action="close-auth" style="padding:10px 20px;background:var(--t-1);color:var(--bg);border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;">Done</button></div>`;
    } else if (signedIn) {
      body = `<p style="margin:0 0 22px;font-size:13px;color:var(--t-3);line-height:1.5;">You're signed in as <b style="color:var(--t-2);">${esc(state.user.email || '')}</b> but not yet an editor. If this library has no editors yet, you can claim editor access.</p>
        ${msg}
        <div style="display:flex;justify-content:space-between;gap:10px;"><button data-action="signout" style="padding:10px 18px;background:transparent;color:var(--t-2);border:1px solid var(--line3);border-radius:9px;font-size:13px;cursor:pointer;">Sign out</button><button data-action="auth-claim" style="padding:10px 20px;background:var(--t-1);color:var(--bg);border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;">Become an editor</button></div>`;
    } else {
      body = `<label style="${lbl}">Email</label>
        <input data-au="email" type="email" autocomplete="username" value="${esc(state.auth.email)}" placeholder="you@university.edu" style="${fld}margin-bottom:18px;" />
        <label style="${lbl}">Password</label>
        <input data-au="password" data-enter="auth" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="••••••••" style="${fld}margin-bottom:18px;" />
        ${msg}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <button data-action="auth-toggle" class="h-txt" style="background:none;border:none;${mono}font-size:11.5px;color:var(--t-muted);cursor:pointer;padding:0;">${isSignup ? 'Have an account? Sign in' : 'Create an account'}</button>
          <div style="display:flex;gap:10px;">
            <button data-action="close-auth" style="padding:10px 18px;background:transparent;color:var(--t-2);border:1px solid var(--line3);border-radius:9px;font-size:13px;cursor:pointer;">Cancel</button>
            <button data-action="auth-submit" style="padding:10px 20px;background:var(--t-1);color:var(--bg);border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;">${isSignup ? 'Create account' : 'Sign in'}</button>
          </div>
        </div>`;
    }

    return `<div id="edu-auth-backdrop" style="position:fixed;inset:0;background:rgba(4,4,5,0.74);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:50;animation:ovIn .16s ease;">
      <div style="width:440px;max-width:92vw;max-height:88vh;overflow-y:auto;background:var(--modal);border:1px solid var(--line2);border-radius:16px;padding:30px;animation:modIn .2s cubic-bezier(.2,.8,.3,1);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:6px;">
          <h2 style="margin:0;font-size:19px;font-weight:700;letter-spacing:-0.01em;">Editor access</h2>
          <button data-action="close-auth" style="background:transparent;border:none;color:var(--t-muted);font-size:20px;cursor:pointer;line-height:1;padding:0;">✕</button>
        </div>
        ${signedIn ? '' : `<p style="margin:0 0 22px;font-size:13px;color:var(--t-3);line-height:1.5;">Moderating community suggestions is limited to approved editors. Browsing stays open to everyone.</p>`}
        ${body}
      </div>
    </div>`;
  }

  function toastHtml() {
    if (!state.toast) return '';
    return `<div style="position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--t-1);color:var(--bg);padding:11px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:60;animation:toastIn .24s cubic-bezier(.2,.8,.3,1);box-shadow:0 8px 30px rgba(0,0,0,0.5);">${esc(state.toast)}</div>`;
  }

  // ---- render + events ------------------------------------------------------
  function render(opts) {
    opts = opts || {};
    root.innerHTML = (state.screen === 'home' ? homeHtml() : appHtml()) + modalHtml() + authModalHtml() + toastHtml();
    if (opts.focus === 'search') {
      const el = root.querySelector('#edu-search');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }

  function open(id) { state.screen = 'app'; state.category = 'all'; state.sort = 'top'; state.activeTag = null; state.groupByTag = false; state.expanded[id] = true; render(); }

  function bind() {
    root.addEventListener('click', async e => {
      // clicking the dimmed backdrop (but not the sheet) closes the modal
      if (e.target.id === 'edu-suggest-backdrop') { state.showSuggest = false; render(); return; }
      if (e.target.id === 'edu-auth-backdrop') { state.showAuth = false; render(); return; }
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const a = t.dataset.action, id = t.dataset.id;
      switch (a) {
        case 'enter': state.screen = 'app'; state.category = 'all'; state.activeTag = null; state.groupByTag = false; render(); break;
        case 'gohome': state.screen = 'home'; render(); break;
        case 'toggle-theme':
          state.theme = state.theme === 'dark' ? 'light' : 'dark';
          try { localStorage.setItem('aice-theme', state.theme); } catch (x) {}
          applyTheme(); render(); break;
        case 'browse-cat': state.category = t.dataset.cat; state.activeTag = null; state.groupByTag = false; state.screen = 'app'; render(); break;
        case 'readlater': state.category = 'readlater'; state.activeTag = null; state.groupByTag = false; render(); break;
        case 'sort': state.sort = t.dataset.sort; render(); break;
        case 'view': state.view = t.dataset.view; render(); break;
        case 'toggle-group': state.groupByTag = !state.groupByTag; render(); break;
        case 'clear-tag': state.activeTag = null; render(); break;
        case 'filter-tag': state.activeTag = t.dataset.tag; state.category = 'all'; state.groupByTag = false; render(); break;
        case 'open-reading': open(id); break;
        case 'toggle-row': state.expanded[id] = !state.expanded[id]; render(); break;
        case 'vote-up': await EDU.vote(id, 1); render(); break;
        case 'vote-down': await EDU.vote(id, -1); render(); break;
        case 'save': { const willSave = EDU.toggleSaved(id); flash(willSave ? 'Saved to Read later' : 'Removed from Read later'); break; }
        case 'rate': await EDU.rate(id, +t.dataset.star); render(); break;
        case 'post-comment': await postComment(id); break;
        case 'open-suggest': state.showSuggest = true; render(); break;
        case 'close-suggest': state.showSuggest = false; render(); break;
        case 'suggest-cat': state.suggest.category = t.dataset.cat; render(); break;
        case 'suggest-type': state.suggest.type = t.dataset.type; render(); break;
        case 'submit-suggest': await submitSuggest(); break;
        case 'review': state.category = 'review'; state.activeTag = null; state.groupByTag = false; state.screen = 'app'; render(); break;
        case 'approve': await doModerate(id, 'approve'); break;
        case 'reject': await doModerate(id, 'reject'); break;
        case 'open-auth': state.showAuth = true; state.authMsg = ''; render(); break;
        case 'close-auth': state.showAuth = false; render(); break;
        case 'auth-toggle': state.authMode = state.authMode === 'signin' ? 'signup' : 'signin'; state.authMsg = ''; render(); break;
        case 'auth-submit': await doAuthSubmit(); break;
        case 'auth-claim': await doClaim(); break;
        case 'signout': await doSignOut(); break;
      }
    });

    root.addEventListener('input', e => {
      const el = e.target;
      if (el.id === 'edu-search') { state.query = el.value; render({ focus: 'search' }); return; }
      if (el.dataset.draft) { state.drafts[el.dataset.draft] = el.value; return; }
      if (el.dataset.tagdraft) { state.tagDrafts[el.dataset.tagdraft] = el.value; return; }
      if (el.dataset.sg) { state.suggest[el.dataset.sg] = el.value; return; }
      if (el.dataset.au) { state.auth[el.dataset.au] = el.value; return; }
    });

    root.addEventListener('keydown', async e => {
      if (e.key !== 'Enter') return;
      const el = e.target;
      if (el.dataset.enter === 'post-comment') { e.preventDefault(); await postComment(el.dataset.draft); }
      else if (el.dataset.enter === 'add-tag') { e.preventDefault(); await addTag(el.dataset.tagdraft); }
      else if (el.dataset.enter === 'auth') { e.preventDefault(); await doAuthSubmit(); }
    });
  }

  // ---- auth + moderation ----------------------------------------------------
  async function refreshAuth() {
    try {
      state.user = await Auth.user();
      state.isAdmin = state.user ? await Auth.isAdmin() : false;
    } catch (e) { state.user = null; state.isAdmin = false; }
  }
  async function afterAuthChange() {
    await refreshAuth();
    state.auth.password = '';
    await EDU.reload();            // re-fetch so an admin now sees the pending queue
    if (state.isAdmin) state.showAuth = false;
    render();
  }
  async function doAuthSubmit() {
    const email = state.auth.email.trim(), password = state.auth.password;
    if (!email || !password) { state.authMsg = 'Enter an email and password.'; render(); return; }
    state.authMsg = 'Working…'; render();
    const fn = state.authMode === 'signin' ? Auth.signIn : Auth.signUp;
    const { error } = await fn(email, password);
    if (error) { state.authMsg = error.message; render(); return; }
    if (state.authMode === 'signup') state.authMsg = 'Account created. If email confirmation is on, confirm then sign in.';
    await afterAuthChange();
  }
  async function doClaim() {
    const { data, error } = await Auth.claimFirstAdmin();
    if (error) { state.authMsg = error.message; render(); return; }
    state.authMsg = data ? 'You are now an editor.' : 'An editor already exists — ask them to add you.';
    await afterAuthChange();
  }
  async function doSignOut() {
    await Auth.signOut();
    await refreshAuth();
    if (state.category === 'review') state.category = 'all';
    state.showAuth = false;
    await EDU.reload();
    render();
  }
  async function doModerate(id, kind) {
    try {
      if (kind === 'approve') { await EDU.approve(id); flash('Approved & published'); }
      else { await EDU.reject(id); flash('Suggestion rejected'); }
    } catch (err) { flash(err.message || 'Action failed — are you signed in as an editor?'); }
  }

  async function postComment(id) {
    const text = (state.drafts[id] || '').trim();
    if (!text) return;
    const name = (function () { try { return localStorage.getItem('eapaic:name') || ''; } catch (e) { return ''; } })();
    await EDU.addComment(id, name, text);
    state.drafts[id] = '';
    render();
  }
  async function addTag(id) {
    const tag = (state.tagDrafts[id] || '').trim();
    if (!tag) return;
    await EDU.addTag(id, tag);
    state.tagDrafts[id] = '';
    render();
  }
  async function submitSuggest() {
    const sg = state.suggest;
    if (!sg.title.trim() || !sg.url.trim()) { flash('Add a title and URL first.'); return; }
    try {
      await EDU.suggest(sg);
      state.showSuggest = false;
      state.suggest = { url: '', title: '', category: 'policy', type: 'article', tags: '', description: '', contributor: '' };
      flash('Thanks! Your suggestion is queued for review.');
    } catch (err) {
      flash(err.message || 'Could not submit — please try again.');
    }
  }

  function deepLink() {
    const h = location.hash.replace(/^#/, '');
    const p = new URLSearchParams(h);
    if (p.has('cat')) { state.screen = 'app'; state.category = p.get('cat'); }
    else if (h === 'browse' || h === 'app') { state.screen = 'app'; }
  }

  async function mount(el) {
    root = el;
    applyTheme();
    bind();
    root.innerHTML = `<div style="height:100vh;display:grid;place-items:center;color:var(--t-faint);${mono}font-size:13px;">Loading the commons…</div>`;
    try {
      await Promise.all([EDU.load(), refreshAuth()]);
      deepLink();
      render();
    } catch (err) {
      console.error(err);
      root.innerHTML = `<div style="height:100vh;display:grid;place-items:center;color:var(--t-faint);${mono}font-size:13px;">Could not load readings. Check the console.</div>`;
    }
  }

  return { mount };
})();

window.EDUApp = EDUApp;
