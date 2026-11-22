// Same grind on both grinders: KINGrinder K6 clicks ↔ Comandante C40 clicks (stock), both counted
// from zero (burrs touching). Two straight parts that meet at K6 80 = C40 25:
//   fine,   K6 0–80: 3.2 K6 clicks per C40 click. Puts Comandante's espresso range (7–13) at K6 22–42,
//                    in line with K6 espresso settings published online (22–45).
//   coarse, K6 80+:  6 K6 clicks per C40 click, fitted to my taste notes (80 ≈ 25, 100 ≈ 28, 110 ≈ 30).
//                    Puts Comandante's French press range (26–37) at K6 86–152, matching published K6
//                    French press settings (82–154, KINGrinder: 150).
// A single ratio can't fit both: 3.2 misses the notes at 110 by 4 clicks, and 6 makes espresso far too coarse.
const BEND = { k6: 80, c40: 25 };
const K6_PER_C40 = { fine: 3.2, coarse: 6 };
// Burr travel per click (µm), from the spec sheets. For reference only: the burrs differ,
// so equal travel is NOT an equal grind.
const TRAVEL_UM = { k6: 16, stock: 30, redclix: 15 };

const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => +n.toFixed(1);
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
// Who can edit: on your computer (npm start) the local server saves. On the public site, only someone
// signed in with the GitHub key can, and visitors never see an edit button.
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

const sheet = $('#sheet');
const form = $('#brew-form');
let brews = [];

// ---------- Grinder maths ----------
const GRINDERS = { k6: 'K6', c40: 'Comandante' };
const c40Mode = () => $('[name=c40]:checked').value; // 'stock' | 'redclix'
const redClix = () => c40Mode() === 'redclix'; // Red Clix steps are half-size: twice the clicks

const scale = () => (redClix() ? 2 : 1);
const toC40 = (k6) =>
  (k6 <= BEND.k6 ? k6 / K6_PER_C40.fine : BEND.c40 + (k6 - BEND.k6) / K6_PER_C40.coarse) * scale();
function toK6(c40) {
  const c = c40 / scale();
  return c <= BEND.c40 ? c * K6_PER_C40.fine : BEND.k6 + (c - BEND.c40) * K6_PER_C40.coarse;
}
// K6 clicks per Comandante click at a given K6 setting: how much to turn when dialing in.
const stepAt = (k6) => (k6 < BEND.k6 ? K6_PER_C40.fine : K6_PER_C40.coarse) / scale();

// The same grind on the other grinder, rounded to a click you can actually set.
const equivalent = (clicks, grinder = 'k6') =>
  grinder === 'c40' ? `K6 ≈ ${Math.round(toK6(clicks))}` : `Comandante ≈ ${Math.round(toC40(clicks))}`;

const cv = { k6: $('#cv-k6'), c40: $('#cv-c40') };
function convert(from = 'k6') {
  const v = parseFloat(cv[from].value);
  if (from === 'k6') cv.c40.value = isNaN(v) ? '' : Math.round(toC40(v));
  else cv.k6.value = isNaN(v) ? '' : Math.round(toK6(v));
  const travel = (input, um) => (input.value === '' ? '' : `${input.value * um} µm burr travel`);
  $('#cv-k6-um').textContent = travel(cv.k6, TRAVEL_UM.k6);
  $('#cv-c40-um').textContent = travel(cv.c40, TRAVEL_UM[c40Mode()]);
  const k6 = parseFloat(cv.k6.value);
  $('#cv-step').textContent = isNaN(k6) ? ''
    : `Around here, 1 ${redClix() ? 'Red Clix' : 'Comandante'} click ≈ ${fmt(stepAt(k6))} K6 clicks.`;
}
for (const [key, input] of Object.entries(cv)) input.addEventListener('input', () => convert(key));

const savedC40 = $(`[name=c40][value="${localStorage.getItem('c40')}"]`);
if (savedC40) savedC40.checked = true;
document.querySelectorAll('[name=c40]').forEach((r) => r.addEventListener('change', () => {
  localStorage.setItem('c40', r.value);
  convert();
  render(); // cards show the Comandante equivalent too
}));

// ---------- Brew list ----------
function card(b) {
  const li = $('#brew-card').content.firstElementChild.cloneNode(true);
  $('.coffee', li).textContent = b.coffee;
  $('.roaster', li).textContent = b.roaster || '';
  const date = $('.date', li);
  date.dateTime = b.date;
  date.textContent = new Date(`${b.date}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  $('.method', li).textContent = [b.method, b.waterType].filter(Boolean).join(' · ');

  const stat = (name, main, sub) => {
    const dd = $(`.${name}`, li);
    if (!main) return dd.parentElement.remove();
    dd.textContent = main;
    if (sub) dd.append(Object.assign(document.createElement('small'), { textContent: sub }));
  };
  const grinder = b.grinder || 'k6'; // brews logged before the grinder choice existed were K6
  $('.grind-label', li).textContent = `Grind · ${GRINDERS[grinder]}`;
  stat('grind', b.grind != null && `${b.grind} clicks`, b.grind != null && equivalent(b.grind, grinder));
  stat('temp', b.temp != null && `${b.temp} °C`);
  stat('dose', [b.dose, b.water].filter((g) => g != null).map((g) => `${g} g`).join(' → '),
    b.dose && b.water && `1:${fmt(b.water / b.dose)}`);
  stat('time', b.time);
  $('.notes', li).textContent = b.notes || '';

  const edit = $('.edit', li);
  edit.hidden = !canEdit();
  edit.addEventListener('click', () => openSheet(b));
  return li;
}

// Newest date first. Same-day brews: the one logged last comes first.
const newestFirst = () => [...brews].reverse().sort((a, b) => b.date.localeCompare(a.date));

function render() {
  $('#brews').replaceChildren(...newestFirst().map(card));
  $('#empty').hidden = brews.length > 0;
  $('#empty').textContent = canEdit() ? 'No brews yet. Tap New brew to log your first one.' : 'No brews logged yet.';
  // Roasters you've used before show up as suggestions in the Roaster field.
  const roasters = [...new Set(brews.map((b) => b.roaster).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  $('#roasters').replaceChildren(...roasters.map((r) => new Option(r)));
}

// ---------- Owner sign-in (public site) ----------
// Saves go straight to GitHub using a fine-grained key that can only write to this repo. The key stays
// in this browser, and GitHub checks it on every save. There's no server here for bots to attack.
const FILE_API = 'https://api.github.com/repos/saifmandour/coffee-journal/contents/brews.json';
const KEY_STORE = 'coffee-journal:github-key';
let githubKey = LOCAL ? null : localStorage.getItem(KEY_STORE);
let fileSha = null; // GitHub's version id for brews.json. A save is refused if it changed elsewhere first.
const canEdit = () => LOCAL || !!githubKey;

const github = (key, options = {}) => fetch(FILE_API, {
  ...options,
  cache: 'no-store',
  headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
}).catch(() => null);
const toBase64 = (text) => {
  let bin = '';
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin);
};
const fromBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

// Signed in: read straight from GitHub, so you see your latest save before Pages republishes.
async function loadBrews() {
  if (githubKey) {
    const res = await github(githubKey);
    if (res?.ok) {
      const file = await res.json();
      fileSha = file.sha;
      return JSON.parse(fromBase64(file.content));
    }
    if (res?.status === 401) signOut(); // key expired or revoked
  }
  const res = await fetch('brews.json', { cache: 'no-store' }).catch(() => null);
  return res?.ok ? res.json() : [];
}

function applyEditMode() {
  $('#new-brew').hidden = !canEdit();
  $('#owner').hidden = !githubKey;
  render();
}
function signOut() {
  githubKey = null;
  fileSha = null;
  localStorage.removeItem(KEY_STORE);
  applyEditMode();
}

const signin = $('#signin');
const signinForm = $('#signin-form');
function openSignin() {
  signinForm.reset();
  $('#signin-error').hidden = true;
  signin.showModal();
}
signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fail = (message) => { $('#signin-error').textContent = message; $('#signin-error').hidden = false; };
  const key = signinForm.elements.key.value.trim();
  const res = await busy(signinForm, () => github(key));
  if (!res) return fail("Couldn't reach GitHub. Check your connection and try again.");
  if (!res.ok) return fail("That key didn't work. Check you copied all of it and that it has access to coffee-journal.");
  const file = await res.json();
  githubKey = key;
  localStorage.setItem(KEY_STORE, key);
  fileSha = file.sha;
  brews = JSON.parse(fromBase64(file.content));
  applyEditMode();
  signin.close();
});
// The installed phone app has no address bar for #signin, so: press and hold a page title for a second.
// Not shown anywhere, and it does nothing without your key.
document.querySelectorAll('.display').forEach((title) => {
  let hold;
  title.addEventListener('pointerdown', () => {
    hold = setTimeout(() => { if (!LOCAL && !githubKey) openSignin(); }, 800);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) title.addEventListener(type, () => clearTimeout(hold));
});
$('#signout').addEventListener('click', () => {
  if (confirm("Sign out on this device? You'll need your GitHub key to sign in again.")) signOut();
});

// Disable a form's Save button while it works, so a double-tap can't save twice.
async function busy(formEl, work) {
  const button = formEl.querySelector('[type=submit]');
  button.disabled = true;
  try { return await work(); } finally { button.disabled = false; }
}

// ---------- Add / edit sheet (owner only) ----------
function updateHints() {
  const { dose, water, grind, grinder } = form.elements;
  $('#ratio-hint').textContent = dose.value > 0 && water.value > 0 ? `Ratio 1:${fmt(water.value / dose.value)}` : '';
  $('#grind-hint').textContent = grind.value !== '' ? equivalent(+grind.value, grinder.value) : '';
}
form.addEventListener('input', updateHints);

function openSheet(brew) {
  for (const el of form.elements) if (el.name && el.type !== 'radio') el.value = brew[el.name] ?? '';
  form.elements.grinder.value = brew.grinder || 'k6';
  $('#sheet-title').textContent = brew.id ? 'Edit brew' : 'New brew';
  $('#delete').hidden = !brew.id;
  $('#form-error').hidden = true;
  updateHints();
  sheet.showModal();
}

async function saveLocal(next) {
  const res = await fetch('brews.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => null);
  return res?.ok ? '' : "Couldn't save. Is the local server running (npm start)?";
}

async function saveToGitHub(next, message) {
  const content = toBase64(JSON.stringify(next, null, 2) + '\n');
  const res = await github(githubKey, { method: 'PUT', body: JSON.stringify({ message, content, sha: fileSha }) });
  if (res?.ok) {
    fileSha = (await res.json()).content.sha;
    return '';
  }
  if (!res) return "Couldn't reach GitHub. Check your connection and try again.";
  if (res.status === 401) {
    signOut();
    return 'Your GitHub key has expired or was revoked. Sign in again with a new one.';
  }
  if (res.status === 409 || res.status === 422) { // changed on another device since this page loaded
    brews = await loadBrews();
    render();
    return 'The journal changed on another device. Reloaded the latest version, so press Save again.';
  }
  return "This key can't save to the journal. On GitHub, give it Contents: Read and write for coffee-journal.";
}

// Returns true when saved. On failure the sheet stays open with an explanation.
async function persist(next, message) {
  const error = LOCAL ? await saveLocal(next) : await saveToGitHub(next, message);
  if (error) {
    $('#form-error').textContent = error;
    $('#form-error').hidden = false;
    return false;
  }
  brews = next;
  render();
  return true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const brew = {};
  for (const [name, value] of new FormData(form)) {
    brew[name] = form.elements[name].type === 'number' ? (value === '' ? null : +value) : value.trim();
  }
  const message = `${brew.id ? 'Edit' : 'Log'} brew: ${brew.coffee}`;
  brew.id ||= crypto.randomUUID();
  const saved = await busy(form, () => persist([...brews.filter((b) => b.id !== brew.id), brew], message));
  if (saved) sheet.close();
});

$('#delete').addEventListener('click', async () => {
  if (!confirm("Delete this brew? This can't be undone.")) return;
  const { id, coffee } = form.elements;
  const saved = await busy(form, () => persist(brews.filter((b) => b.id !== id.value), `Delete brew: ${coffee.value}`));
  if (saved) sheet.close();
});

// New brews start from your latest recipe, since an experiment usually changes one thing.
$('#new-brew').addEventListener('click', () => {
  openSheet({ ...newestFirst()[0], id: '', date: today(), notes: '' });
});
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => {
  if (e.target === d) d.close(); // tap the dimmed area
}));

// ---------- Navigation & chrome ----------
function route() {
  if (location.hash === '#signin') { // the private sign-in address
    history.replaceState(null, '', location.pathname + location.search); // don't reopen on refresh
    if (!LOCAL && !githubKey) openSignin();
  }
  const view = location.hash === '#grinder' ? 'grinder' : 'brews';
  $('#view-brews').hidden = view !== 'brews';
  $('#view-grinder').hidden = view !== 'grinder';
  document.querySelectorAll('[data-view]').forEach((a) => {
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
addEventListener('hashchange', route);
addEventListener('scroll', () => $('.bar').classList.toggle('scrolled', scrollY > 0), { passive: true });

route();
convert();
applyEditMode();
loadBrews().then((data) => { brews = data; render(); });
