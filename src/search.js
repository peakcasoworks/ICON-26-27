// District-wide search: pages, clubs, 5,839 people, events, initiatives and posts.
// Opens with the top-bar field, Cmd or Ctrl+K, or "/". Arrow keys move, Enter opens.
import { gsap } from './motion.js';

const UI = () => window.UI;
let index = null, open = false, sel = 0, results = [];

function buildIndex() {
  const U = UI();
  const people = [];
  for (let i = 0; i < D.memberCount; i++) { const m = D.member(i); people.push({ k: (m.name + ' ' + m.id + ' ' + m.club.name).toLowerCase(), m }); }
  index = { people };
}

const norm = s => s.toLowerCase().trim();
function find(q) {
  const U = UI(), out = [];
  if (!index) buildIndex();
  const has = s => s.toLowerCase().includes(q);
  const pages = U.R().nav.concat(['notifs']).map(id => ({ id, label: id === 'home' ? U.HOME_NAME[U.role()] : id === 'notifs' ? 'Notifications' : U.NAV[id][0], icon: id === 'notifs' ? 'bell' : U.NAV[id][1] }));
  pages.filter(p => !q || has(p.label)).slice(0, q ? 4 : 6).forEach(p => out.push({ g: 'Pages', icon: p.icon, t: p.label, s: 'Go to page', go: [p.id] }));
  if (!q) return out;
  U.clubs().filter(c => has(c.name) || has(c.place)).slice(0, 6).forEach(c => out.push({ g: 'Clubs', icon: 'building', t: c.name, s: `Group ${U.groupOf(c)}, ${c.type}, ${c.members} members`, go: ['club', c.id] }));
  D.EVENTS.filter(e => has(e.name) || has(e.full || '') || has(e.kind)).slice(0, 4).forEach(e => out.push({ g: 'Events', icon: 'flag', t: e.name, s: `${e.date}, ${e.status}`, go: ['event', e.id] }));
  D.INITIATIVES.concat(U.P.inits).filter(x => has(x.name) || has(x.type)).slice(0, 4).forEach(x => out.push({ g: 'Initiatives', icon: 'spark', t: x.name, s: `${x.type}, ${x.now} of ${x.goal} ${x.unit}`, go: ['initiative', x.id] }));
  D.designations.concat(U.P.desig).filter(d => has(d.title) || has(d.holder)).slice(0, 4).forEach(d => out.push({ g: 'Posts', icon: 'badge', t: d.title, s: `${d.holder}, ${d.scope}`, go: ['designations'] }));
  let n = 0;
  for (const p of index.people) { if (p.k.includes(q)) { out.push({ g: 'People', icon: 'user', t: p.m.name, s: `${p.m.role}, ${p.m.club.name}, ${p.m.id}`, person: p.m }); if (++n >= 6) break; } }
  return out;
}

const mark = (t, q) => {
  const U = UI(), i = q ? t.toLowerCase().indexOf(q) : -1;
  if (i < 0) return U.esc(t);
  return U.esc(t.slice(0, i)) + '<mark>' + U.esc(t.slice(i, i + q.length)) + '</mark>' + U.esc(t.slice(i + q.length));
};

function paint(q) {
  const U = UI();
  results = find(q); sel = 0;
  const list = document.getElementById('srList');
  if (!results.length) { list.innerHTML = `<div class="empty sm">${U.ic('search')}<b>Nothing found for “${U.esc(q)}”</b><span>Try a club, an area like Velachery, a name, or an ID like R3233040.</span></div>`; return; }
  let html = '', g = '';
  results.forEach((r, i) => {
    if (r.g !== g) { g = r.g; html += `<div class="sr-g">${g}</div>`; }
    html += `<button class="sr-item${i === 0 ? ' on' : ''}" data-i="${i}" role="option" aria-selected="${i === 0}">${U.ic(r.icon)}<span class="sr-t"><b>${mark(r.t, q)}</b><small>${U.esc(r.s)}</small></span>${U.ic('right', 'sr-go')}</button>`;
  });
  list.innerHTML = html;
  if (!U.calm()) gsap.from(list.querySelectorAll('.sr-item'), { y: 8, autoAlpha: 0, duration: 0.25, stagger: 0.02, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
}

function choose(i) {
  const U = UI(), r = results[i];
  if (!r) return;
  close();
  if (r.person) {
    const m = r.person;
    U.sheet(`<div class="person"><span class="pp big">${U.esc(m.name.split(' ').map(x => x[0]).join(''))}</span><h2 class="sh-h">${U.esc(m.name)}</h2><p class="note">${U.esc(m.role)}, Rotaract Club of ${U.esc(m.club.name)}</p>
      <ul class="kv"><li><span>Member ID</span><b class="fig">${m.id}</b></li><li><span>Joined</span><b class="fig">${m.joined}</b></li><li><span>Points this year</span><b class="fig">${m.points}</b></li><li><span>Phone and email</span><span class="muted">${U.ic('lock')} District officials only</span></li></ul>
      <button class="btn ink full" data-go="club" data-arg="${m.club.id}">Open ${U.esc(m.club.name)}</button></div>`);
    return;
  }
  U.go(r.go[0], r.go[1]);
}

function move(d) {
  const items = document.querySelectorAll('.sr-item');
  if (!items.length) return;
  items[sel].classList.remove('on'); items[sel].setAttribute('aria-selected', 'false');
  sel = (sel + d + items.length) % items.length;
  items[sel].classList.add('on'); items[sel].setAttribute('aria-selected', 'true');
  items[sel].scrollIntoView({ block: 'nearest' });
}

export function openSearch(prefill = '') {
  const U = UI();
  if (open) return;
  open = true;
  const el = document.getElementById('search');
  el.hidden = false;
  const input = document.getElementById('srInput');
  input.value = prefill;
  paint(norm(prefill));
  if (!U.calm()) {
    gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
    gsap.fromTo('.sr-panel', { y: -14, scale: 0.97 }, { y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.6)' });
  }
  requestAnimationFrame(() => input.focus());
}
function close() {
  if (!open) return;
  open = false;
  const el = document.getElementById('search');
  if (UI().calm()) { el.hidden = true; return; }
  gsap.to(el, { autoAlpha: 0, duration: 0.15, onComplete: () => { el.hidden = true; gsap.set(el, { clearProps: 'transform,opacity,visibility' }); } });
}

export function initSearch() {
  const el = document.createElement('div');
  el.id = 'search'; el.className = 'search-ov'; el.hidden = true;
  el.innerHTML = `<div class="sr-panel" role="dialog" aria-modal="true" aria-label="Search the district">
    <label class="sr-field"><svg class="ic" aria-hidden="true"><use href="#i-search"></use></svg><span class="sr">Search</span><input id="srInput" type="search" placeholder="Search clubs, people, events, posts" autocomplete="off" role="combobox" aria-controls="srList" aria-expanded="true"><kbd>esc</kbd></label>
    <div id="srList" class="sr-list" role="listbox"></div>
    <div class="sr-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>enter</kbd> open</span><span>5,839 people, 72 clubs, every event</span></div></div>`;
  document.body.appendChild(el);
  let t;
  el.addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => paint(norm(e.target.value)), 70); });
  el.addEventListener('click', e => { if (e.target === el) close(); const it = e.target.closest('.sr-item'); if (it) choose(Number(it.dataset.i)); });
  el.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? close() : openSearch(); }
    else if (e.key === '/' && !open && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  // Build the people index when the browser is idle, so the first search is instant.
  (window.requestIdleCallback || (f => setTimeout(f, 800)))(() => { if (!index) buildIndex(); });
}
