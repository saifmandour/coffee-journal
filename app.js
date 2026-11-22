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
// Only the local server (npm start) can save. The public site is read-only.
const editable = ['localhost', '127.0.0.1'].includes(location.hostname);

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
  edit.hidden = !editable;
  edit.addEventListener('click', () => openSheet(b));
  return li;
}

// Newest date first. Same-day brews: the one logged last comes first.
const newestFirst = () => [...brews].reverse().sort((a, b) => b.date.localeCompare(a.date));

function render() {
  $('#brews').replaceChildren(...newestFirst().map(card));
  $('#empty').hidden = brews.length > 0;
  $('#empty').textContent = editable ? 'No brews yet. Tap New brew to log your first one.' : 'No brews logged yet.';
  // Roasters you've used before show up as suggestions in the Roaster field.
  const roasters = [...new Set(brews.map((b) => b.roaster).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  $('#roasters').replaceChildren(...roasters.map((r) => new Option(r)));
}

// ---------- Add / edit sheet (local only) ----------
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

async function persist(next) {
  const res = await fetch('brews.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => null);
  if (!res?.ok) {
    $('#form-error').textContent = "Couldn't save. Is the local server running (npm start)?";
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
  brew.id ||= crypto.randomUUID();
  if (await persist([...brews.filter((b) => b.id !== brew.id), brew])) sheet.close();
});

$('#delete').addEventListener('click', async () => {
  if (!confirm("Delete this brew? This can't be undone.")) return;
  if (await persist(brews.filter((b) => b.id !== form.elements.id.value))) sheet.close();
});

// New brews start from your latest recipe, since an experiment usually changes one thing.
$('#new-brew').addEventListener('click', () => {
  openSheet({ ...newestFirst()[0], id: '', date: today(), notes: '' });
});
$('[data-close]').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // tap the dimmed area

// ---------- Navigation & chrome ----------
function route() {
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

$('#new-brew').hidden = !editable;
route();
convert();
fetch('brews.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => [])
  .then((data) => { brews = data; render(); });
