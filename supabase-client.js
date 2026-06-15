/* EAP AI Commons — Supabase client + small shared helpers.
   Loads after the supabase-js UMD bundle. The URL and publishable key are
   safe to ship in the browser; all privileged actions are gated by RLS. */

const SUPABASE_URL = 'https://yeqykdtclexxexzvzvlb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SfJzbr0fjvdy7Qk4lJ0h0w_BJ9K08Id';

const SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Stable per-browser id so a visitor can update their own rating and see
// which comments are theirs, without needing an account.
function visitorId() {
  let v = localStorage.getItem('eapaic:visitor');
  if (!v) {
    v = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('eapaic:visitor', v);
  }
  return v;
}

// Relative "added" label (2d / 1w / 3mo …) from a stored timestamp.
function relativeTime(ts) {
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 365) return Math.floor(d / 365) + 'y';
  if (d >= 30) return Math.floor(d / 30) + 'mo';
  if (d >= 7) return Math.floor(d / 7) + 'w';
  if (d >= 1) return d + 'd';
  if (h >= 1) return h + 'h';
  if (m >= 1) return m + 'm';
  return 'just now';
}

// Auth / admin helpers (moderated library: only admins publish artefacts).
const Auth = {
  async user() { const { data } = await SB.auth.getUser(); return data.user || null; },
  async isAdmin() {
    const { data: { session } } = await SB.auth.getSession();
    if (!session) return false;
    const { data, error } = await SB.rpc('is_admin');
    return !error && data === true;
  },
  signIn: (email, password) => SB.auth.signInWithPassword({ email, password }),
  signUp: (email, password) => SB.auth.signUp({ email, password }),
  signOut: () => SB.auth.signOut(),
  claimFirstAdmin: () => SB.rpc('claim_first_admin'),
  onChange: cb => SB.auth.onAuthStateChange(cb),
};

window.SB = SB;
window.visitorId = visitorId;
window.relativeTime = relativeTime;
window.Auth = Auth;
