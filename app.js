// Burr travel per click (µm). KINGrinder K6 is fixed; the Comandante C40 value comes from the
// Grinder page toggle: 30 µm stock, 15 µm with Red Clix.
const K6_UM = 16;

const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => +n.toFixed(1);
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
// Only the local server (npm start) can save. The public site is read-only.
const editable = ['localhost', '127.0.0.1'].includes(location.hostname);

const sheet = $('#sheet');
const form = $('#brew-form');
let brews = [];

// ---------- Grinder maths ----------
const c40Um = () => +$('[name=c40]:checked').value;
const grindText = (k6, sep = ' · ') => `${fmt(k6 * K6_UM)} µm${sep}Comandante ≈ ${fmt((k6 * K6_UM) / c40Um())}`;

const cv = { k6: $('#cv-k6'), um: $('#cv-um'), c40: $('#cv-c40') };
function convert(from = 'k6') {
  const v = parseFloat(cv[from].value);
  const um = from === 'k6' ? v * K6_UM : from === 'um' ? v : v * c40Um();
  if (from !== 'k6') cv.k6.value = isNaN(um) ? '' : fmt(um / K6_UM);
  if (from !== 'um') cv.um.value = isNaN(um) ? '' : fmt(um);
  if (from !== 'c40') cv.c40.value = isNaN(um) ? '' : fmt(um / c40Um());
  $('#cv-ratio').textContent = `1 K6 click ≈ ${(K6_UM / c40Um()).toFixed(2)} Comandante clicks.`;
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
  stat('grind', b.grind != null && `${b.grind} clicks`, b.grind != null && grindText(b.grind, '\n'));
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

function render() {
  const sorted = [...brews].sort((a, b) => b.date.localeCompare(a.date));
  $('#brews').replaceChildren(...sorted.map(card));
  $('#empty').hidden = brews.length > 0;
  $('#empty').textContent = editable ? 'No brews yet. Tap New brew to log your first one.' : 'No brews logged yet.';
}

// ---------- Add / edit sheet (local only) ----------
function updateHints() {
  const { dose, water, grind } = form.elements;
  $('#ratio-hint').textContent = dose.value > 0 && water.value > 0 ? `Ratio 1:${fmt(water.value / dose.value)}` : '';
  $('#grind-hint').textContent = grind.value !== '' ? grindText(+grind.value) : '';
}
form.addEventListener('input', updateHints);

function openSheet(brew) {
  for (const el of form.elements) if (el.name) el.value = brew[el.name] ?? '';
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
  for (const el of form.elements) {
    if (!el.name) continue;
    brew[el.name] = el.type === 'number' ? (el.value === '' ? null : +el.value) : el.value.trim();
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
  const latest = [...brews].sort((a, b) => b.date.localeCompare(a.date))[0];
  openSheet({ ...latest, id: '', date: today(), notes: '' });
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
