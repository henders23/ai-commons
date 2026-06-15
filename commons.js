/* EAP AI Commons — shared behavior. Loads after supabase-client.js + commons-data.js.
   Injects the (admin-gated) upload modal, wires nav search (⌘K), and exposes
   small render helpers used by the Browse / Artefact / Search pages. */

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
const slugify = s => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artefact';

// public URL for an uploaded artefact file in the `artefacts` storage bucket
function fileUrl(path) {
  return path ? SB.storage.from('artefacts').getPublicUrl(path).data.publicUrl : null;
}

// artefact card markup (anchors to the detail page)
function artCard(a) {
  return `<a class="art" href="Artefact.html#id=${a.id}">
    <div class="art-top"><span class="type">${typeLabel(a.type)}</span><span class="art-cat">${catById(a.cat).name}</span></div>
    <h3>${a.title}</h3>
    <p class="art-desc">${a.desc}</p>
    <div class="art-foot"><span class="lvl">${a.level}</span><span>${a.added}</span></div>
  </a>`;
}

// ---- upload modal (single source, injected into every page; admin-gated) ----
function mountModal() {
  const cats = CATEGORIES.map(c => `<option>${c.name}</option>`).join('');
  const lvls = ['Any level', ...LEVELS].map(l => `<option>${l}</option>`).join('');
  const el = document.createElement('div');
  el.className = 'overlay'; el.id = 'upload';
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="upl-title">
      <div class="modal-h">
        <div><h2 id="upl-title">Upload an artefact</h2><p id="upl-sub">Share a document or a link with the EAP community.</p></div>
        <button class="x" data-close aria-label="Close"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </div>

      <!-- signed-out / non-admin: this is a moderated library -->
      <div class="modal-b" id="auth-pane">
        <p class="auth-note">Publishing is limited to approved editors. Sign in to contribute, or browse the open library freely.</p>
        <div class="fl"><label>Email</label><input class="inp" id="au-email" type="email" placeholder="you@university.edu" autocomplete="username" /></div>
        <div class="fl"><label>Password</label><input class="inp" id="au-pass" type="password" placeholder="••••••••" autocomplete="current-password" /></div>
        <div class="auth-msg" id="au-msg"></div>
        <div class="modal-f" style="justify-content:space-between;">
          <button class="btn btn-sm" id="au-toggle" type="button">Create an account</button>
          <div style="display:flex;gap:10px;">
            <button class="btn" data-close type="button">Cancel</button>
            <button class="btn btn-primary" id="au-submit" type="button">Sign in</button>
          </div>
        </div>
        <div class="auth-claim hidden" id="au-claim">
          <p class="auth-note">You're signed in but not yet an editor. If this is a new library, you can claim editor access.</p>
          <div class="modal-f" style="justify-content:flex-start;">
            <button class="btn" id="au-claimbtn" type="button">Become an editor</button>
            <button class="btn btn-sm" id="au-signout" type="button">Sign out</button>
          </div>
        </div>
      </div>

      <!-- admin: the real contribute form -->
      <div class="modal-b hidden" id="form-pane">
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
        <div class="fl hidden" id="linkfield"><label>Link URL</label><input class="inp" id="f-url" type="url" placeholder="https://" /></div>
        <div class="fl"><label>Title</label><input class="inp" id="f-title" type="text" placeholder="e.g. Prompting for paraphrase practice" /></div>
        <div class="fl"><label>Description</label><textarea class="inp" id="f-desc" placeholder="One or two sentences on what it is and why it's useful…"></textarea></div>
        <div class="fl"><label>How to use it <span class="opt">(optional)</span></label><textarea class="inp" id="f-howto" placeholder="A note on how to use it in teaching or study…"></textarea></div>
        <div class="row2">
          <div class="fl"><label>Category</label><select class="sel" id="f-cat">${cats}</select></div>
          <div class="fl"><label>Who it's for <span class="opt">(optional)</span></label><select class="sel" id="f-level">${lvls}</select></div>
        </div>
        <div class="fl"><label>Tags <span class="opt">(comma-separated)</span></label><input class="inp" id="f-tags" type="text" placeholder="prompting, integrity" /></div>
        <div class="fl"><label>Your name <span class="opt">(contributor)</span></label><input class="inp" id="f-author" type="text" placeholder="e.g. J. Okafor" /></div>
        <div class="auth-msg" id="f-msg"></div>
        <div class="modal-f">
          <button class="btn btn-sm" id="f-signout" type="button" style="margin-right:auto;">Sign out</button>
          <button class="btn" data-close type="button">Cancel</button>
          <button class="btn btn-primary" id="f-publish" type="button">Publish to library</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);

  const open = async () => { el.classList.add('open'); document.body.style.overflow = 'hidden'; await syncMode(); };
  const close = () => { el.classList.remove('open'); document.body.style.overflow = ''; };
  qsa('[data-open-upload]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
  qsa('[data-close]', el).forEach(b => b.addEventListener('click', close));
  el.addEventListener('click', e => { if (e.target === el) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); qs('#search')?.focus(); }
  });

  const authPane = qs('#auth-pane', el), formPane = qs('#form-pane', el);
  const sub = qs('#upl-sub', el), claim = qs('#au-claim', el), auMsg = qs('#au-msg', el);

  // toggle the modal between sign-in and the admin form based on auth/admin state
  async function syncMode() {
    auMsg.textContent = ''; qs('#f-msg', el).textContent = '';
    const user = await Auth.user();
    const admin = user ? await Auth.isAdmin() : false;
    formPane.classList.toggle('hidden', !admin);
    authPane.classList.toggle('hidden', admin);
    claim.classList.toggle('hidden', !(user && !admin));
    sub.textContent = admin
      ? 'Share a document or a link with the EAP community.'
      : 'Editors can publish to the library. Browsing stays open to everyone.';
  }

  // ---- sign-in / sign-up ----
  let mode = 'signin';
  const toggle = qs('#au-toggle', el), auSubmit = qs('#au-submit', el);
  toggle.addEventListener('click', () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
    auSubmit.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    toggle.textContent = mode === 'signin' ? 'Create an account' : 'Have an account? Sign in';
    qs('#au-pass', el).autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
  });
  auSubmit.addEventListener('click', async () => {
    const email = qs('#au-email', el).value.trim();
    const pass = qs('#au-pass', el).value;
    if (!email || !pass) { auMsg.textContent = 'Enter an email and password.'; return; }
    auMsg.textContent = 'Working…';
    const fn = mode === 'signin' ? Auth.signIn : Auth.signUp;
    const { error } = await fn(email, pass);
    if (error) { auMsg.textContent = error.message; return; }
    if (mode === 'signup') { auMsg.textContent = 'Account created. If email confirmation is on, confirm then sign in.'; }
    await syncMode();
  });
  qs('#au-claimbtn', el).addEventListener('click', async () => {
    const { data, error } = await Auth.claimFirstAdmin();
    if (error) { auMsg.textContent = error.message; return; }
    auMsg.textContent = data ? 'You are now an editor.' : 'An editor already exists — ask them to add you.';
    await syncMode();
  });
  qs('#au-signout', el).addEventListener('click', async () => { await Auth.signOut(); await syncMode(); });
  qs('#f-signout', el).addEventListener('click', async () => { await Auth.signOut(); await syncMode(); });

  // ---- file/link toggle + drop zone ----
  const seg = qs('#kindseg', el), fileField = qs('#filefield', el), linkField = qs('#linkfield', el);
  let kind = 'file';
  seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...seg.children].forEach(c => c.classList.toggle('on', c === b));
    kind = b.dataset.kind;
    fileField.classList.toggle('hidden', kind !== 'file');
    linkField.classList.toggle('hidden', kind === 'file');
  });
  const drop = qs('#drop', el), input = qs('#fileinput', el), main = qs('#dropmain', el), dsub = qs('#dropsub', el);
  let chosenFile = null;
  const showFile = f => { if (!f) return; chosenFile = f; drop.classList.add('has'); main.textContent = f.name; dsub.textContent = (f.size/1024/1024).toFixed(2) + ' MB · click to replace'; };
  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => showFile(input.files[0]));
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => showFile(e.dataTransfer.files[0]));

  // ---- publish (admin only; RLS also enforces this server-side) ----
  const fMsg = qs('#f-msg', el);
  function fmtSize(bytes) { const mb = bytes / 1024 / 1024; return mb >= 1 ? mb.toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'; }
  qs('#f-publish', el).addEventListener('click', async () => {
    const title = qs('#f-title', el).value.trim();
    const desc = qs('#f-desc', el).value.trim();
    if (!title) { fMsg.textContent = 'A title is required.'; return; }

    const catName = qs('#f-cat', el).value;
    const cat = (CATEGORIES.find(c => c.name === catName) || CATEGORIES[0]).id;
    const levelSel = qs('#f-level', el).value;
    const level = levelSel === 'Any level' ? '' : levelSel;
    const tags = qs('#f-tags', el).value.split(',').map(t => t.trim()).filter(Boolean);
    const author = qs('#f-author', el).value.trim() || 'Anonymous';
    const id = slugify(title) + '-' + Math.random().toString(36).slice(2, 6);

    let type = 'link', file_path = null, link_url = null, format = 'External link';
    fMsg.textContent = 'Publishing…';

    try {
      if (kind === 'file') {
        if (!chosenFile) { fMsg.textContent = 'Choose a file, or switch to "Paste a link".'; return; }
        const ext = (chosenFile.name.split('.').pop() || 'file').toUpperCase();
        const path = `${id}/${chosenFile.name}`;
        const up = await SB.storage.from('artefacts').upload(path, chosenFile, { upsert: false });
        if (up.error) throw up.error;
        type = 'doc'; file_path = path; format = `${ext} · ${fmtSize(chosenFile.size)}`;
      } else {
        link_url = qs('#f-url', el).value.trim();
        if (!link_url) { fMsg.textContent = 'Enter a link URL, or switch to "Upload a file".'; return; }
      }

      const { error } = await SB.from('artefacts').insert({
        id, type, cat, title, description: desc, howto: qs('#f-howto', el).value.trim(),
        tags, level, author, format, link_url, file_path,
      });
      if (error) throw error;

      fMsg.textContent = 'Published.';
      _loaded = null;            // bust the cached data load
      await loadData();
      if (typeof window.onLibraryChanged === 'function') window.onLibraryChanged();
      setTimeout(close, 500);
    } catch (err) {
      fMsg.textContent = err.message || 'Could not publish — are you signed in as an editor?';
    }
  });
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

// Chrome that needs data (modal category list) waits for loadData; the nav
// search box is wired immediately so ⌘K / Enter work even before data lands.
document.addEventListener('DOMContentLoaded', () => {
  wireNavSearch();
  loadData().then(mountModal).catch(err => console.error('Failed to load library data', err));
});
