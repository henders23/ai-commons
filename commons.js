/* EAP AI Commons — shared behavior. Loads after commons-data.js.
   Injects the upload modal, wires nav search (⌘K) + the modal, and exposes
   small render helpers used by Browse / Artefact pages. */

const ICON = {
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};
const qs  = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
// read a route param from the URL hash (#id=foo&cat=bar) first, then ?query as a fallback
const param = k => {
  const fromHash = new URLSearchParams(location.hash.replace(/^#/, '')).get(k);
  return fromHash !== null ? fromHash : new URLSearchParams(location.search).get(k);
};
const catById = id => CAT[id] || {};
const artById = id => ARTEFACTS.find(a => a.id === id);
const typeLabel = t => (t === 'link' ? 'LINK' : 'DOC');

// artefact card markup (anchors to the detail page)
function artCard(a) {
  return `<a class="art" href="Artefact.html#id=${a.id}">
    <div class="art-top"><span class="type">${typeLabel(a.type)}</span><span class="art-cat">${catById(a.cat).name}</span></div>
    <h3>${a.title}</h3>
    <p class="art-desc">${a.desc}</p>
    <div class="art-foot"><span class="lvl">${a.level}</span><span>${a.added}</span></div>
  </a>`;
}

// ---- upload modal (single source, injected into every page) ----
function mountModal() {
  const cats = CATEGORIES.map(c => `<option>${c.name}</option>`).join('');
  const lvls = ['Any level', ...LEVELS].map(l => `<option>${l}</option>`).join('');
  const el = document.createElement('div');
  el.className = 'overlay'; el.id = 'upload';
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="upl-title">
      <div class="modal-h">
        <div><h2 id="upl-title">Upload an artefact</h2><p>Share a document or a link with the EAP community.</p></div>
        <button class="x" data-close aria-label="Close"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </div>
      <div class="modal-b">
        <div class="seg" id="kindseg"><button class="on" data-kind="file">Upload a file</button><button data-kind="link">Paste a link</button></div>
        <div class="fl" id="filefield">
          <label>File</label>
          <div class="drop" id="drop">
            <div class="di"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg></div>
            <div class="dm" id="dropmain">Drag a PDF or Word file here</div>
            <div class="ds" id="dropsub">or click to browse · max 25 MB</div>
          </div>
          <input type="file" id="fileinput" class="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" />
        </div>
        <div class="fl hidden" id="linkfield"><label>Link URL</label><input class="inp" type="url" placeholder="https://" /></div>
        <div class="fl"><label>Title</label><input class="inp" type="text" placeholder="e.g. Prompting for paraphrase practice" /></div>
        <div class="fl"><label>Description</label><textarea class="inp" placeholder="One or two sentences on what it is and why it's useful…"></textarea></div>
        <div class="row2">
          <div class="fl"><label>Category</label><select class="sel">${cats}</select></div>
          <div class="fl"><label>Who it's for <span class="opt">(optional)</span></label><select class="sel">${lvls}</select></div>
        </div>
        <div class="fl"><label>Your name <span class="opt">(contributor)</span></label><input class="inp" type="text" placeholder="e.g. J. Okafor" /></div>
        <div class="modal-f"><button class="btn" data-close>Cancel</button><button class="btn btn-primary">Publish to library</button></div>
      </div>
    </div>`;
  document.body.appendChild(el);

  const open = () => { el.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { el.classList.remove('open'); document.body.style.overflow = ''; };
  qsa('[data-open-upload]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
  qsa('[data-close]', el).forEach(b => b.addEventListener('click', close));
  el.addEventListener('click', e => { if (e.target === el) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); qs('#search')?.focus(); }
  });

  const seg = qs('#kindseg', el), fileField = qs('#filefield', el), linkField = qs('#linkfield', el);
  seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...seg.children].forEach(c => c.classList.toggle('on', c === b));
    const file = b.dataset.kind === 'file';
    fileField.classList.toggle('hidden', !file);
    linkField.classList.toggle('hidden', file);
  });
  const drop = qs('#drop', el), input = qs('#fileinput', el), main = qs('#dropmain', el), sub = qs('#dropsub', el);
  const showFile = f => { if (!f) return; drop.classList.add('has'); main.textContent = f.name; sub.textContent = (f.size/1024/1024).toFixed(2) + ' MB · click to replace'; };
  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => showFile(input.files[0]));
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => showFile(e.dataTransfer.files[0]));
}

// ---- shared search: score artefacts against a query ----
function searchArtefacts(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return ARTEFACTS.map(a => {
    const hay = {
      title: a.title.toLowerCase(),
      tags: a.tags.join(' ').toLowerCase(),
      desc: (a.desc + ' ' + a.howto).toLowerCase(),
      cat: catById(a.cat).name.toLowerCase(),
      level: a.level.toLowerCase(),
    };
    let score = 0;
    for (const t of terms) {
      if (hay.title.includes(t)) score += 6;
      if (hay.tags.includes(t)) score += 4;
      if (hay.cat.includes(t)) score += 3;
      if (hay.level.includes(t)) score += 2;
      if (hay.desc.includes(t)) score += 1;
    }
    return { a, score };
  }).filter(r => r.score > 0).sort((x, y) => y.score - x.score).map(r => r.a);
}

// ---- wire the nav search box on every page (Enter → Search.html) ----
function wireNavSearch() {
  const box = qs('#search');
  if (!box) return;
  const here = location.pathname.split('/').pop();
  if (here === 'Search.html') box.value = param('q') || '';
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = box.value.trim();
      if (q) location.href = 'Search.html#q=' + encodeURIComponent(q);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => { mountModal(); wireNavSearch(); });
