/* Core: demo state, router, shared components and light animation helpers. */
(function () {
  const KEY = 'icon3233-demo-v1';
  let P = {};
  try { P = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { P = {}; }
  const blank = () => ({ reports: {}, projects: {}, pay: {}, clubs: {}, newClubs: [], desig: [], inits: [], visits: {}, tasks: {}, gcol: {}, weights: null, nudged: {}, extraNotifs: [], alloc: {}, reg: {}, members: [], posts: {}, theme: 'auto', accent: 'default' });
  P = Object.assign(blank(), P);
  if (!P.motion) P.motion = 'on';
  const OS_CALM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const calm = () => P.motion === 'off';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* storage blocked: demo still works for this visit */ } };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n).toLocaleString('en-IN');
  const inr = n => '₹' + num(n);
  const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  /* ---------- data access with demo overrides ---------- */
  const clubs = () => D.clubs.concat(P.newClubs);
  const club = id => clubs().find(c => c.id === Number(id));
  const stateOf = c => (P.clubs[c.id] && P.clubs[c.id].state) || c.state;
  const groupOf = c => (P.clubs[c.id] && P.clubs[c.id].group) || c.group;
  const activeClubs = () => clubs().filter(c => stateOf(c) === 'Active');
  const report = (c, mi) => {
    const base = c.isNew ? { status: 'none', late: false } : D.baseReport(c, mi);
    const r = Object.assign({}, base, P.reports[c.id + '|' + mi] || {});
    if (r.status === 'president') r.status = 'grs'; // one sign-off is enough now: president or secretary sends it straight to the GRS
    return r;
  };
  const setReport = (c, mi, patch, note) => {
    const k = c.id + '|' + mi;
    const cur = P.reports[k] || {};
    const hist = (cur.hist || []).concat(note ? [{ t: note, at: 'Today' }] : []);
    P.reports[k] = Object.assign(cur, patch, { hist });
    save();
  };
  const projects = (c, mi) => (c.isNew ? [] : D.projectsFor(c, mi)).concat(P.projects[c.id + '|' + mi] || []);
  /* Seats: the district allots a pool to each group, the GRR or GRS spreads it over the group's clubs. */
  // Scanning at the door is only for the big events and every DRC meeting. Everything else is counted from the club's paid list.
  const scanEvents = () => D.EVENTS.filter(e => e.scan && e.status !== 'Done');
  const seatEvents = () => D.EVENTS.filter(e => e.quota && e.status !== 'Done');
  const seatsOf = (e, c) => { const a = P.alloc[e.id]; return a && a.club[c.id] != null ? a.club[c.id] : e.quota || 0; };
  const poolOf = (e, g) => { const a = P.alloc[e.id]; return a && a.pool[g] != null ? a.pool[g] : activeClubs().filter(c => groupOf(c) === g).reduce((n, c) => n + (e.quota || 0), 0); };
  const spent = (e, g) => activeClubs().filter(c => groupOf(c) === g).reduce((n, c) => n + seatsOf(e, c), 0);
  // What a club owes for an event follows who paid it: members pay the club, the club ticks them, and that count is the bill.
  const regOf = (e, c) => P.reg && P.reg[e.id] && P.reg[e.id][c.id];
  const FEE_OF = { asm: 'assembly', ryla: 'ryla', conf: 'conf' };
  const wallet = c => D.walletFor(c).map(it => {
    const ev = FEE_OF[it.id.split('-').pop()] && D.EVENTS.find(e => e.id === FEE_OF[it.id.split('-').pop()]);
    const rg = ev && regOf(ev, c), n = rg ? Object.values(rg).filter(x => x.paid).length : ev ? seatsOf(ev, c) : 0;
    const base = ev && ev.fee ? Object.assign({}, it, { amount: n * ev.fee, detail: n + (n === 1 ? (rg ? ' member paid, at ' : ' seat at ') : (rg ? ' members paid, at ' : ' seats at ')) + inr(ev.fee), skip: !!rg && n === 0 }) : it;
    return Object.assign({}, base, P.pay[it.id] || {});
  }).filter(it => !it.skip);
  const gcolor = g => 'var(--sw' + (P.gcol[g] || g) + ')';

  const RS = {
    none: ['Not started', 'bad'], draft: ['Draft', 'warn'], president: ['With GRS', 'neutral'],
    grs: ['With GRS', 'neutral'], drs: ['With DRS', 'neutral'], accepted: ['Accepted', 'ok'], returned: ['Returned', 'bad']
  };
  const PAY = { verified: ['Paid', 'ok'], pending: ['Checking payment', 'neutral'], due: ['Due', 'warn'], overdue: ['Overdue', 'bad'] };
  const pill = (t, k) => `<span class="pill ${k}">${esc(t)}</span>`;
  const rpill = s => pill(RS[s][0], RS[s][1]);
  const ppill = s => pill(PAY[s][0], PAY[s][1]);
  const gpill = g => `<span class="gp" style="--g:${gcolor(g)}">Group ${g}</span>`;

  /* ---------- roles ---------- */
  const ROLES = {
    drr: { label: 'DRR', full: 'District Rotaract Representative', who: 'District', icon: 'gear', nav: ['home', 'reports', 'clubs', 'events', 'finance', 'groups', 'seats', 'drc', 'mom', 'review', 'initiatives', 'awards', 'designations', 'people', 'visits', 'season'] },
    drs: { label: 'DRS', full: 'District Rotaract Secretary', who: 'District', icon: 'doc', nav: ['home', 'clubs', 'groups', 'people', 'drc', 'mom', 'review', 'events', 'visits'] },
    dt: { label: 'District Treasurer', full: 'District Treasurer', who: 'District', icon: 'rupee', nav: ['home', 'clubs', 'events'] },
    gco: { label: 'Group Coordinator', full: 'Group Coordinator, all seven groups', who: 'All groups', icon: 'layers', nav: ['home', 'groups', 'reports', 'clubs', 'seats', 'drc', 'mom', 'events', 'people', 'initiatives'] },
    grr: { label: 'GRR', full: 'Group Rotaract Representative', who: 'Your group', icon: 'layers', nav: ['home', 'reports', 'clubs', 'seats', 'drc', 'mom', 'events', 'people', 'initiatives'] },
    grs: { label: 'GRS', full: 'Group Rotaract Secretary', who: 'Your group', icon: 'doc', nav: ['home', 'reports', 'clubs', 'seats', 'drc', 'mom', 'events', 'people'] },
    dir: { label: 'Director', full: 'Chairperson, Blood Donation', who: 'Every drop counts', icon: 'spark', nav: ['home', 'initiatives', 'drc', 'events', 'clubs'] },
    chair: { label: 'RYLA Chair', full: 'RYLA Chairman', who: 'RYLA 2026', icon: 'flag', nav: ['home', 'events', 'drc', 'clubs'] },
    pres: { label: 'Club President', full: 'President, Rotaract Club of Madras Cosmos', who: 'Madras Cosmos', icon: 'user', nav: ['home', 'monthly', 'collect', 'wallet', 'drc', 'mom', 'visits', 'events', 'initiatives', 'people', 'pass'] },
    vp: { label: 'Club Vice President', full: 'Vice President, Rotaract Club of Madras Cosmos', who: 'Madras Cosmos', icon: 'user', nav: ['home', 'monthly', 'collect', 'events', 'initiatives', 'people', 'pass'] },
    sec: { label: 'Club Secretary', full: 'Secretary, Rotaract Club of Madras Cosmos', who: 'Madras Cosmos', icon: 'pen', nav: ['home', 'log', 'monthly', 'collect', 'drc', 'mom', 'events', 'people', 'pass'] },
    jsec: { label: 'Joint Secretary', full: 'Joint Secretary, Rotaract Club of Madras Cosmos', who: 'Madras Cosmos', icon: 'pen', nav: ['home', 'log', 'monthly', 'events', 'people', 'pass'] },
    trs: { label: 'Club Treasurer', full: 'Treasurer, Rotaract Club of Madras Cosmos', who: 'Madras Cosmos', icon: 'rupee', nav: ['home', 'collect', 'events', 'people', 'pass'] },
    adsgt: { label: 'Associate District Sergeant-at-Arms', full: 'Associate District Sergeant-at-Arms', who: 'District events', icon: 'badge', nav: ['home', 'drc', 'review', 'events'] },
    dsgt: { label: 'District Sergeant-at-Arms', full: 'Chief Sergeant-at-Arms, District', who: 'District events', icon: 'badge', nav: ['home', 'drc', 'review', 'events'] },
    mem: { label: 'Member', full: 'Member, Rotaract Club of Madras Cosmos', who: 'Madras Cosmos', icon: 'id', nav: ['home', 'events', 'initiatives', 'awards'] }
  };
  const NAV = {
    home: ['Home', 'home'], reports: ['Reports', 'doc'], clubs: ['Clubs', 'building'], groups: ['Groups', 'layers'], events: ['Events', 'flag'],
    finance: ['Finance', 'rupee'], initiatives: ['Initiatives', 'spark'], awards: ['Scorecard', 'trophy'], designations: ['Designations', 'badge'],
    people: ['People', 'users'], visits: ['DRR visits', 'calendar'], season: ['Season', 'sun'], log: ['Log project', 'plus'],
    monthly: ['Monthly report', 'doc'], wallet: ['Club wallet', 'rupee'], pass: ['My pass', 'id'], seats: ['Seat allotment', 'id'], drc: ['DRC', 'calendar'], mom: ['Minutes', 'doc'], review: ['Attendance review', 'badge'], collect: ['Event fees', 'rupee']
  };
  const HOME_NAME = { drr: 'Command centre', drs: 'Reports desk', dt: 'District finance', gco: 'Group desk', grr: 'My group', grs: 'My group', dir: 'My initiative', chair: 'RYLA workspace', pres: 'Club home', vp: 'Club home', sec: 'Club home', jsec: 'Club home', trs: 'Club wallet', dsgt: 'Scan at the door', adsgt: 'Scan at the door', mem: 'My pass' };
  // The pass sits right after Home for everyone: it is the thing people need first at a door.
  Object.values(ROLES).forEach(r => { if (r.nav.includes('home') && !(r === ROLES.mem)) { r.nav = r.nav.filter(x => x !== 'pass'); r.nav.splice(1, 0, 'pass'); } });
  const role = () => P.role;

  /* ---------- who sees what ---------- */
  // district: every club and person. group: the clubs and people of one group. portfolio: clubs and events, no member lists.
  // club: that club only. Search, the people list, the clubs list and every club page follow this one rule.
  const SCOPE = { drr: 'district', drs: 'district', dt: 'district', gco: 'district', grr: 'group', grs: 'group', dir: 'portfolio', chair: 'portfolio', pres: 'club', vp: 'club', sec: 'club', jsec: 'club', trs: 'club', mem: 'club', dsgt: 'portfolio', adsgt: 'portfolio' };
  // A GRR or GRS belongs to one group, and that comes from their login. The demo lets you pick which one to try.
  const myGroup = () => P.myGroup || 6;
  const level = () => SCOPE[P.role] || 'none';
  const COLLEGE_DEMO = D.clubs.find(c => c.type === 'College' && c.name !== 'Senthamizh University' && c.state === 'Active');
  const demoClubs = () => [D.cosmos, COLLEGE_DEMO];
  const myClub = () => demoClubs().find(c => c.id === P.myClub) || D.cosmos;
  const canSeeClub = c => { const l = level(); return l === 'district' || l === 'portfolio' || (l === 'group' ? groupOf(c) === myGroup() : l === 'club' && c.id === myClub().id); };
  const canSeePerson = m => { const l = level(); return l === 'district' || (l === 'group' ? groupOf(m.club) === myGroup() : l === 'club' && m.club.id === myClub().id); };
  const visibleClubs = () => clubs().filter(canSeeClub);
  const roleInfo = id => {
    const r = ROLES[id] || ROLES.drr, n = myClub().name, g = D.GROUPS[myGroup() - 1];
    const o = Object.assign({}, r, { who: r.who.replace('Madras Cosmos', n), full: r.full.replace('Madras Cosmos', n) });
    if (SCOPE[id] === 'group') Object.assign(o, { label: `${r.label}, Group ${g.id}`, full: `${r.full}, Group ${g.id} ${g.area}`, who: `Group ${g.id}` });
    return o;
  };
  const R = () => roleInfo(P.role);
  const can = {
    sendReport: () => ['pres', 'sec', 'jsec'].includes(P.role),
    roster: () => ['pres', 'sec'].includes(P.role),
    pay: () => ['trs', 'pres'].includes(P.role),
    seats: () => ['drr', 'gco', 'grr', 'grs'].includes(P.role),
    exportAll: () => ['drr', 'drs', 'gco', 'dt'].includes(P.role)
  };

  /* ---------- files ---------- */
  function download(name, rows) {
    const csv = rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  /* ---------- router ---------- */
  const views = {};
  let cur = { view: 'home', arg: null };
  const view = (name, fn) => { views[name] = fn; };
  function go(v, arg, opts = {}) {
    cur = { view: v, arg: arg == null ? null : arg };
    try { history.replaceState(null, '', '#' + v + (arg != null ? '-' + arg : '')); } catch (e) { /* frame may refuse */ }
    render(opts);
  }
  function render(opts = {}) {
    const run = () => {
      paintShell();
      const fn = views[cur.view] || views.home;
      const out = $('#view');
      out.innerHTML = fn(cur.arg);
      if (!opts.keepScroll) window.scrollTo(0, 0);
      after(out, opts);
    };
    if (document.startViewTransition && !calm() && !opts.instant) document.startViewTransition(run); else run();
  }

  /* ---------- shell ---------- */
  function navItems() { return R().nav; }
  function paintShell() {
    const app = $('#app');
    if (!P.role || cur.view === 'roles') { app.className = 'bare'; return; }
    app.className = '';
    const r = R();
    const items = navItems();
    const link = (id, cls) => {
      const [label, icon] = NAV[id];
      const on = cur.view === id || (id === 'home' && cur.view === 'home');
      return `<a href="#${id}" class="${cls}${on ? ' on' : ''}" data-go="${id}" ${on ? 'aria-current="page"' : ''}>${ic(icon)}<span>${id === 'home' ? HOME_NAME[P.role] : label}</span></a>`;
    };
    $('#side').innerHTML = `<div class="side-in">
      <div class="side-role"><span class="avatar">${ic(r.icon)}</span><div><b>${esc(r.label)}</b><small>${esc(r.who)}</small></div></div>
      <nav aria-label="Main">${items.map(i => link(i, 'nl')).join('')}</nav>
      <button class="nl switch" data-act="roles">${ic('swap')}<span>Switch role</span></button>
    </div>`;
    const tabs = items.slice(0, 4);
    $('#tabbar').innerHTML = tabs.map(i => link(i, 'tl')).join('') + `<button class="tl" data-act="more">${ic('menu')}<span>More</span></button>`;
    $('#who').innerHTML = `${ic(r.icon)}<span>${esc(r.label)}</span>${ic('chev')}`;
    const n = notifs().filter(x => x.unread).length;
    $('#bell').innerHTML = ic('bell') + (n ? `<b class="badge">${n}</b>` : '');
    $('#seasonName').textContent = P.season === 'vibe' ? 'VIBE' : 'ICON';
    $('#seasonYear').textContent = P.season === 'vibe' ? '2026-27' : '2027-28';
  }

  /* ---------- notifications ---------- */
  function notifs() {
    const base = {
      drr: [['Bookings are in for the DRC on 7 Dec. Set the running order.', 'drc'], ['16 clubs have not started their October report.', 'reports'], ['Chennai Kolathur asked to become Inactive.', 'clubs'], ['2 new clubs are waiting for charter approval.', 'clubs']],
      drs: [['9 October reports are waiting for you.', 'home'], ['Madras Cosmos sent its October report to GRS.', 'reports']],
      dt: [['14 payments are waiting to be checked.', 'home'], ['RYLA seat fees close on 30 Nov.', 'events']],
      grr: [[`3 clubs in Group ${myGroup()} have not started October.`, 'home'], ['Madras Cosmos report is waiting for your check.', 'reports']],
      dsgt: [['Bookings are in for the DRC on 7 Dec. Arrange the running order.', 'drc']],
      adsgt: [['Bookings are in for the DRC on 7 Dec. Arrange the running order.', 'drc']],
      dir: [['The DRC on 7 Dec is open. Book your slot.', 'drc'], ['Chennai Velachery logged 42 units.', 'home'], ['Every drop counts crossed 1,400 units.', 'home']],
      chair: [['The DRC on 7 Dec is open. Book the RYLA team a slot.', 'drc'], ['Backstage committee has 3 open tasks.', 'home'], ['117 of 180 RYLA seats are filled.', 'home']],
      pres: [['Collect the RYLA fee from your members and tick who paid.', 'collect'], ['Book your club\'s slot for the DRC on 7 Dec.', 'drc'], ['October report is late. You or your secretary can send it.', 'monthly'], ['Book your DRR official visit before 20 Dec.', 'visits'], ['RYLA seat fee of ₹3,600 is due on 30 Nov.', 'wallet']],
      sec: [['October report is late. You or your president can send it.', 'monthly'], ['November: 2 projects logged, 3 steps left.', 'monthly'], ['Report for November is due on 5 Dec.', 'monthly']],
      trs: [['RYLA seat fee of ₹3,600 is due on 30 Nov.', 'home'], ['Conference delegate fee opens on 1 Dec.', 'home']],
      gco: [['Group 3 has 2 clubs without a GRS check this week.', 'groups'], ['RYLA seat pools are open for the GRRs to spread.', 'seats']],
      grs: [['Madras Cosmos report is waiting for your check.', 'reports'], ['RYLA seats for your group are ready to assign.', 'seats']],
      vp: [['October report is late. The president or secretary can send it.', 'monthly']],
      jsec: [['November: 2 projects logged, 3 steps left.', 'monthly']],
      mem: [['You earned 50 points at the Blood Donation Megacamp.', 'home'], ['RYLA registration is open.', 'events']]
    }[P.role] || [];
    return P.extraNotifs.filter(n => n.role === P.role).map(n => ({ t: n.t, go: n.go, unread: true })).concat(base.map((b, i) => ({ t: b[0], go: b[1], unread: i < 2 })));
  }

  /* ---------- overlays ---------- */
  let lastFocus = null;
  function sheet(html, opts = {}) {
    lastFocus = document.activeElement;
    const s = $('#sheet');
    $('#sheetBody').innerHTML = html;
    s.classList.toggle('wide', !!opts.wide);
    s.hidden = false;
    requestAnimationFrame(() => { s.classList.add('open'); const f = $('#sheetBody [autofocus], #sheetBody button, #sheetBody input'); if (f) f.focus(); });
    after($('#sheetBody'));
  }
  function closeSheet() {
    const s = $('#sheet');
    s.classList.remove('open');
    setTimeout(() => { s.hidden = true; $('#sheetBody').innerHTML = ''; }, calm() ? 0 : 220);
    if (lastFocus) lastFocus.focus();
  }
  let toastT;
  function toast(msg, kind = 'ok') {
    const t = $('#toast');
    t.className = 'toast ' + kind;
    t.innerHTML = ic(kind === 'ok' ? 'check' : 'info') + `<span>${esc(msg)}</span>`;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 250); }, 2600);
  }

  /* Small confetti burst in Rotaract colours. One canvas, about 1 second. */
  function confetti(x, y) {
    if (calm()) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    document.body.appendChild(c);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const cols = ['--accent', '--gold', '--sw3', '--sw6', '--ink'].map(v => css.getPropertyValue(v).trim());
    const ps = Array.from({ length: 70 }, () => ({ x, y, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3, r: Math.random() * 6 + 3, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * cols.length)] }));
    const t0 = performance.now();
    (function f(t) {
      const k = (t - t0) / 1100;
      g.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.32; p.a += p.va; g.save(); g.globalAlpha = Math.max(0, 1 - k); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); });
      if (k < 1) requestAnimationFrame(f); else c.remove();
    })(t0);
  }

  /* Count numbers up once when they first come into view. */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    countUp(e.target);
  }), { rootMargin: '0px 0px -10% 0px' }) : null;
  function countUp(el) {
    const to = Number(el.dataset.count), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    if (calm() || !to) { el.textContent = pre + num(to) + suf; return; }
    const t0 = performance.now(), d = 700;
    (function f(t) {
      const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + num(Math.round(to * e)) + suf;
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }
  /* Pause looping animations that are off screen. */
  const loopIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting))) : null;

  function after(root, opts = {}) {
    $$('[data-count]', root).forEach(el => { if (io) io.observe(el); else countUp(el); });
    $$('[data-loop]', root).forEach(el => loopIO && loopIO.observe(el));
    $$('[data-rk]', root).forEach(el => {
      const p = el.dataset.rk;
      if (calm()) { el.style.setProperty('--p', p); return; }
      el.style.setProperty('--p', 0);
      requestAnimationFrame(() => requestAnimationFrame(() => el.style.setProperty('--p', p)));
    });
    if (window.onAfter) window.onAfter(root, opts);
  }

  /* ---------- drawn components ---------- */
  // Small cog path, used for the auto's wheels. The logo itself is the Rotary wheel (src/wheel.js).
  function gearPath(n = 18, ro = 47, rr = 40, cx = 50, cy = 50) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const s = (Math.PI * 2) / n, a = i * s;
      const pts = [[rr, a], [ro, a + s * 0.12], [ro, a + s * 0.42], [rr, a + s * 0.54]];
      pts.forEach(([r, t], j) => { d += (i === 0 && j === 0 ? 'M' : 'L') + (cx + r * Math.cos(t)).toFixed(2) + ' ' + (cy + r * Math.sin(t)).toFixed(2); });
    }
    return d + 'Z';
  }
  const GEAR = gearPath();
  const KOLAM = 'M50 33c9 0 17 8 17 17s-8 17-17 17-17-8-17-17 8-17 17-17zM33 50c0-6 5-11 11-11M67 50c0 6-5 11-11 11M50 33c-6 0-11 5-11 11M50 67c6 0 11-5 11-11';
  function gear(cls = '') { return WHEEL.svg(cls); }

  // A small yellow auto, side view, with district gears for wheels.
  const COG = gearPath(10, 6.2, 4.6, 0, 0);
  function auto(cls = '') {
    return `<svg class="auto ${cls}" viewBox="-2 -10 74 56" aria-hidden="true">
      <rect class="a-board" x="24" y="-8" width="22" height="8" rx="1.5"/><text class="a-btxt" x="35" y="-1.6">3233</text>
      <path class="a-top" d="M12 21Q13 3 28 2H50Q58 2 61 12L63 21Z"/>
      <path class="a-glass" d="M51 6Q56 6 58 12L60 19H51Z"/>
      <path class="a-body" d="M5 36V25Q5 20 10 20H55L66 30V36Z"/>
      <path class="a-door" d="M17 21H41V31H17Z"/>
      <path class="a-stripe" d="M5 33H66"/>
      <g transform="translate(16 37)"><g class="a-wh"><path d="${COG}"/><circle r="2"/></g></g>
      <g transform="translate(57 37)"><g class="a-wh"><path d="${COG}"/><circle r="2"/></g></g>
    </svg>`;
  }

  // Chennai as layered flat shapes: the district gear rises as the sun behind
  // the Kapaleeshwarar gopuram, Central Station and the Marina lighthouse.
  // Morning palette in light mode, dusk palette in dark mode.
  let sceneN = 0;
  function scene(cls = '') {
    const n = ++sceneN, sunW = WHEEL.paths(600, 168, 58);
    let arches = '', upper = '', lanes = '', ledges = '';
    for (let x = 290; x < 494; x += 22) if (x < 366 || x > 410) arches += `M${x} 247V226q8-11 16 0V247Z`;
    for (let x = 292; x < 494; x += 22) if (x < 366 || x > 410) upper += `M${x} 196h10v12h-10Z`;
    for (let x = 0; x < 1600; x += 46) lanes += `M${x} 283h22`;
    [[96, 164, 210], [104, 156, 185], [110, 150, 160], [115, 145, 138], [120, 140, 118]].forEach(([l, r, y]) => { ledges += `M${l - 2} ${y}H${r + 2}`; });
    const palm = (x, y, s) => `<g class="palm" transform="translate(${x} ${y}) scale(${s})"><g class="sway" style="--d:${(x % 7) / 10}s"><path class="p-trunk" d="M0 0Q4 -30 -2 -62"/><path class="p-leaf" d="M-2 -62q-18 -6 -30 6q14 -10 30 -6zM-2 -62q16 -10 30 0q-14 -6 -30 0zM-2 -62q-6 -16 -22 -18q14 4 22 18zM-2 -62q10 -14 26 -12q-16 0 -26 12zM-2 -62q2 18 -10 30q8 -16 10 -30z"/></g></g>`;
    return `<svg class="scene ${cls}" viewBox="0 0 800 300" preserveAspectRatio="xMaxYMax slice" role="img" aria-label="Chennai at ${'sunrise'}: the district gear rising behind the Kapaleeshwarar gopuram, Chennai Central and the Marina lighthouse">
      <defs>
        <linearGradient id="skyG${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-sky1"/><stop offset="1" class="s-sky2"/></linearGradient>
        <radialGradient id="sunG${n}"><stop offset="0" class="s-sun1"/><stop offset="1" class="s-sun2"/></radialGradient>
        <linearGradient id="beamG${n}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" class="s-beam1"/><stop offset="1" class="s-beam2"/></linearGradient>
      </defs>
      <rect class="sky" width="800" height="300" fill="url(#skyG${n})"/>
      <g class="stars" data-loop>${[[60, 30], [180, 60], [250, 24], [420, 40], [520, 18], [640, 52], [760, 30], [330, 70]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.4" style="--i:${i}"/>`).join('')}</g>
      <g class="clouds" data-depth="0.18">${[[60, 52, 1, 70], [300, 30, 0.8, 95], [560, 64, 1.15, 80]].map(([x, y, k, d]) => `<g transform="translate(${x} ${y}) scale(${k})"><g class="cloud" style="--t:${d}s"><path d="M0 22q0-13 15-13q5-12 19-8q11-11 24 2q13 0 13 13q0 6-6 6H6q-6 0-6-0z"/></g></g>`).join('')}</g>
      <g class="birds" transform="translate(150 70)"><g class="flock">${[[0, 0], [22, -8], [40, 4], [-18, 10]].map(([x, y], i) => `<path class="bird" style="--i:${i}" d="M${x} ${y}q5-5 10 0q5-5 10 0"/>`).join('')}</g></g>
      <g class="ly ly-sun" data-depth="0.12"><g class="sun-rise"><g class="sun-spin" data-loop><circle cx="600" cy="168" r="72" class="sun-halo"/><path d="${sunW.rim}" fill="url(#sunG${n})" fill-rule="evenodd"/><path d="${sunW.hub}" fill="url(#sunG${n})" fill-rule="evenodd"/><path d="${sunW.spokes}" fill="url(#sunG${n})"/></g></g></g>
      <g class="ly ly-sea" data-depth="0.3"><rect class="sea" x="0" y="226" width="800" height="40"/><g transform="translate(470 238)"><g class="boat" style="--d:0s"><path class="b-hull" d="M0 6h30l-5 5H5z"/><path class="b-sail" d="M14 6V-14L26 4z"/></g></g><g transform="translate(610 244)"><g class="boat" style="--d:-1.4s"><path class="b-hull" d="M0 5h24l-4 4H4z"/><path class="b-sail" d="M11 5V-10L21 3z"/></g></g><g class="shimmer" data-loop><path d="M560 236h40M630 244h24M520 250h30M680 238h30M600 256h36M720 252h22"/></g></g>
      <g class="ly ly-far" data-depth="0.4">
        <g class="via"><rect x="0" y="205" width="800" height="5"/><rect x="10" y="210" width="5" height="18"/><rect x="74" y="210" width="5" height="18"/><rect x="138" y="210" width="5" height="18"/><rect x="202" y="210" width="5" height="18"/><rect x="266" y="210" width="5" height="18"/><rect x="330" y="210" width="5" height="18"/><rect x="394" y="210" width="5" height="18"/><rect x="458" y="210" width="5" height="18"/><rect x="522" y="210" width="5" height="18"/><rect x="586" y="210" width="5" height="18"/><rect x="650" y="210" width="5" height="18"/><rect x="714" y="210" width="5" height="18"/><rect x="778" y="210" width="5" height="18"/></g>
        <g class="metro"><g class="train"><rect class="t-car" x="0" y="191" width="54" height="14" rx="4"/><rect class="t-car" x="57" y="191" width="54" height="14" rx="2"/><rect class="t-car" x="114" y="191" width="54" height="14" rx="2"/><path class="t-win" d="M6 195h42v4H6zM63 195h42v4H63zM120 195h42v4h-42z"/><path class="t-stripe" d="M0 202h168"/></g></g>
        <path class="beam" data-loop d="M703 139L548 112L548 170Z" fill="url(#beamG${n})"/>
        <path class="lh-body" d="M688 242L694 150H712L718 242Z"/><path class="lh-band" d="M689.6 216L690.7 199H715.3L716.4 216ZM691.9 182L692.8 167H713.2L714.1 182Z"/>
        <rect class="lh-dark" x="689" y="146" width="28" height="5"/><rect class="lh-lamp" x="696" y="133" width="14" height="13"/><path class="lh-cap" d="M692 133L703 122L714 133Z"/>
        <path class="far-city" d="M520 226V206h14v-8h10v28M556 226V196h18v30M590 226v-14h16v14M620 226v-20h12v20M735 226V210h20v16M760 226v-26h14v26"/>
      </g>
      <g class="ly ly-mid" data-depth="0.7">
        <g class="gopuram"><path class="g-body" d="M90 250V210H170V250ZM96 210L100 185H160L164 210ZM104 185L108 160H152L156 185ZM110 160L113 138H147L150 160ZM115 138L118 118H142L145 138ZM120 118L122 100H138L140 118Z"/><path class="g-top" d="M117 100Q130 82 143 100Z"/><circle class="g-kal" cx="124" cy="90" r="2.4"/><circle class="g-kal" cx="130" cy="86" r="2.6"/><circle class="g-kal" cx="136" cy="90" r="2.4"/><path class="g-ledge" d="${ledges}"/><path class="g-door" d="M121 250V229Q130 216 139 229V250Z"/></g>
        <g class="central">
          <path class="c-shade" d="M486 250V176H500V250Z"/>
          <rect class="c-brick" x="280" y="176" width="206" height="74"/>
          <rect class="c-trim" x="276" y="168" width="228" height="9"/>
          <path class="c-win" d="${arches}${upper}"/>
          <path class="c-brick" d="M284 176V138H306V176ZM474 176V138H496V176Z"/>
          <path class="c-trim" d="M280 138L295 114L310 138ZM470 138L485 114L500 138Z"/>
          <rect class="c-brick" x="370" y="96" width="40" height="154"/><rect class="c-shade" x="400" y="96" width="10" height="154"/>
          <path class="c-trim" d="M365 96L390 60L415 96Z"/><rect class="c-trim" x="387" y="48" width="6" height="13"/>
          <circle class="c-clock" cx="390" cy="118" r="10"/><path class="c-hand" d="M390 118V111M390 118L395 121"/>
          <path class="c-win" d="M379 250V214q11-14 22 0V250ZM380 160V142q5-7 10 0V160ZM391 160V142q5-7 10 0V160Z"/>
        </g>
        ${palm(40, 252, 1)}${palm(232, 252, 0.85)}${palm(548, 252, 0.95)}${palm(778, 252, 0.8)}
      </g>
      <g class="ly ly-front" data-depth="1"><rect class="prom" x="0" y="250" width="800" height="16"/><rect class="road" x="0" y="266" width="800" height="34"/><g class="lanes"><path d="${lanes}"/></g>
        <g class="drive2"><g transform="translate(820 246) scale(-0.55 0.55)">${auto().replace('<svg', '<svg x="0" y="0" width="74" height="56"')}</g></g>
        <g class="drive" data-loop><g transform="translate(0 232) scale(0.7)">${auto().replace('<svg', '<svg x="0" y="0" width="74" height="56"')}</g></g>
      </g>
    </svg>`;
  }
  function skyline(cls = '') { return scene(cls); }

  // Filter coffee, poured from tumbler to davara, for the moment a report is sent.
  function coffee() {
    return `<svg class="coffee" viewBox="0 0 120 120" aria-hidden="true">
      <g class="cf-steam" data-loop><path d="M50 52q-6 -10 0 -18t0 -18"/><path d="M62 54q-6 -10 0 -18t0 -18"/><path d="M74 52q-6 -10 0 -18t0 -18"/></g>
      <g class="cf-cup"><path class="cf-metal" d="M30 72H90L86 80H34Z"/><path class="cf-metal" d="M40 60H80L76 104H44Z"/><path class="cf-shine" d="M46 64L48 100"/><ellipse class="cf-foam" cx="60" cy="60" rx="20" ry="4"/></g>
      <path class="cf-plate" d="M18 104H102L96 110H24Z"/>
    </svg>`;
  }
  // Stylised Chennai map: coast, Cooum and Adyar rivers, Buckingham Canal,
  // the seven group zones and a dot for every club.
  const ZONES = {
    1: 'M140 0H356C352 60 352 100 348 140L260 150L150 120Z',
    2: 'M0 0H140L150 120L160 200L40 220L0 210Z',
    3: 'M150 120L260 150L348 140C344 170 342 190 340 215L220 240L160 200Z',
    4: 'M220 240L340 215C336 250 336 270 338 300C342 320 344 335 346 345L240 340Z',
    5: 'M0 210L40 220L160 200L220 240L240 340L120 360L0 350Z',
    6: 'M0 350L120 360L240 340L250 520H0Z',
    7: 'M240 340L346 345C356 390 366 440 374 480C378 500 380 510 382 520H250Z'
  };
  const ZLABEL = { 1: [250, 40], 2: [60, 60], 3: [232, 168], 4: [286, 262], 5: [70, 262], 6: [70, 490], 7: [290, 500] };
  function mapSVG(opts = {}) {
    const only = opts.group;
    const dotCls = opts.dotClass || (c => { const s = report(c, 3).status; return s === 'accepted' ? 'ok' : (s === 'none' || s === 'returned') ? 'bad' : 'warn'; });
    const list = clubs().filter(c => stateOf(c) !== 'Terminated' && (opts.plain || canSeeClub(c)));
    let waves = '';
    for (let y = 30; y < 520; y += 46) waves += `M372 ${y}q8-4 16 0t16 0`;
    return `<svg class="map" viewBox="0 0 420 520" role="img" aria-label="Map of Chennai showing the seven groups and ${list.length} clubs">
      <rect class="m-sea" x="0" y="0" width="420" height="520"/>
      <g class="m-waves" data-loop><path d="${waves}"/></g>
      <path class="m-land" d="M0 0H356C350 60 352 120 344 170C338 205 336 240 340 280C346 330 356 380 366 430C372 470 378 500 382 520H0Z"/>
      ${Object.keys(ZONES).map(g => `<path class="m-zone${only && only != g ? ' dim' : ''}" style="--g:${gcolor(g)}" d="${ZONES[g]}" ${opts.plain ? '' : `data-go="group" data-arg="${g}"`}><title>Group ${g}</title></path>`).join('')}
      <path class="m-river" d="M40 230C100 220 150 200 200 205S300 195 343 190"/>
      <path class="m-river" d="M60 330C120 320 180 300 240 300S320 290 339 287"/>
      <path class="m-canal" d="M344 30C338 110 330 200 326 260C324 320 340 400 352 470"/>
      ${Object.keys(ZLABEL).map(g => `<text class="m-zl" x="${ZLABEL[g][0]}" y="${ZLABEL[g][1]}">Group ${g}</text>`).join('')}
      <text class="m-water" x="186" y="214">Cooum</text><text class="m-water" x="196" y="296">Adyar</text><text class="m-water bay" x="392" y="260" transform="rotate(90 392 260)">Bay of Bengal</text>
      <g class="m-lm"><path d="M335 236l2-12h4l2 12z"/><text x="328" y="250">Lighthouse</text></g>
      <g class="m-lm"><path d="M310 168h12v-8h-4v-5h-4v5h-4z"/><text x="276" y="160">Central</text></g>
      <g class="m-lm"><path d="M312 268l3-10h4l3 10z"/><text x="276" y="272">Mylapore</text></g>
      <g class="m-dots">${list.map((c, i) => {
        const g = groupOf(c);
        if (only && only != g) return '';
        const cls = dotCls(c);
        const r = c.members > 1000 ? 7 : c.members > 50 ? 4.6 : 3.6;
        return `<circle class="m-dot ${cls}${c.name === 'Madras Cosmos' ? ' me' : ''}" style="--i:${i % 24}" cx="${c.x}" cy="${c.y}" r="${r}" ${opts.plain ? '' : `data-go="club" data-arg="${c.id}"`} tabindex="-1"><title>${esc(c.name)}${opts.plain ? ', ' + c.type.toLowerCase() + ' club' : ': ' + RS[report(c, 3).status][0]}</title></circle>`;
      }).join('')}</g>
    </svg>`;
  }

  function ring(v, label, size = 112, cls = '') {
    return `<div class="ring ${cls}" style="--s:${size}px"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="r-bg" cx="18" cy="18" r="15.9"/><circle class="r-fg" cx="18" cy="18" r="15.9" pathLength="100" style="--v:${v}"/></svg><div class="r-in"><b class="fig" data-count="${v}" data-suf="%">${v}%</b>${label ? `<small>${esc(label)}</small>` : ''}</div></div>`;
  }
  function spark(data, h = 120) {
    const w = 320, max = Math.max(...data.map(d => d.v)) * 1.15, step = w / (data.length - 1);
    const pts = data.map((d, i) => [Math.round(i * step), Math.round(h - 20 - (d.v / max) * (h - 34))]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="-8 0 ${w + 16} ${h}" role="img" aria-label="Monthly check-ins: ${data.map(d => d.m + ' ' + d.v).join(', ')}">
      ${[0.33, 0.66].map(f => `<line class="sp-grid" x1="0" x2="${w}" y1="${(h - 20) * f + 6}" y2="${(h - 20) * f + 6}"/>`).join('')}
      <path class="sp-area" d="${line}L${w} ${h - 20}L0 ${h - 20}Z"/><path class="sp-line" pathLength="1" d="${line}"/>
      ${pts.map((p, i) => `<text class="sp-x" x="${p[0]}" y="${h - 4}">${data[i].m}</text><text class="sp-v" x="${p[0]}" y="${p[1] - 8}">${data[i].v}</text>`).join('')}
      <circle class="sp-end" cx="${last[0]}" cy="${last[1]}" r="4"/>
    </svg>`;
  }
  function bar(label, v, max, right, color) {
    const w = max ? Math.max(0.02, v / max) : 0;
    return `<div class="bar-row"><span class="bl">${label}</span><span class="bt"><i style="--w:${w.toFixed(3)}${color ? ';--c:' + color : ''}"></i></span><span class="bv fig">${right}</span></div>`;
  }
  const STEPS = ['Club', 'GRS', 'DRS'];
  function tracker(status) {
    status = status === 'president' ? 'grs' : status;
    const idx = { none: 0, draft: 0, returned: 0, grs: 1, drs: 2, accepted: 3 }[status];
    const p = Math.min(idx, 2) / 2 * 100;
    return `<div class="trk" role="img" aria-label="Report route: ${RS[status][0]}">
      <div class="trk-road"><i style="--w:${(Math.min(idx, 2) / 2).toFixed(3)}"></i></div>
      <div class="trk-move" data-rk="${p}">${auto('trk-auto')}</div>
      <ol class="trk-stops">${STEPS.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'here' : ''}"><span class="dot"></span>${s}</li>`).join('')}</ol>
    </div>`;
  }
  function qr(seed) {
    const r = D.mulberry32(seed);
    const n = 21; let cells = '';
    const finder = (x, y) => `<rect class="q" x="${x}" y="${y}" width="7" height="7"/><rect class="q-bg" x="${x + 1}" y="${y + 1}" width="5" height="5"/><rect class="q" x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
      if (r() > 0.52) cells += `<rect class="q" x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return `<svg class="qr" viewBox="-1 -1 23 23" role="img" aria-label="Sample identity code, not scannable"><rect class="q-bg" x="-1" y="-1" width="23" height="23"/>${cells}${finder(0, 0)}${finder(14, 0)}${finder(0, 14)}</svg>`;
  }
  function pager(total, page, per, act) {
    const pages = Math.max(1, Math.ceil(total / per));
    const from = total ? (page - 1) * per + 1 : 0, to = Math.min(total, page * per);
    const btn = (p, label, dis, on) => `<button class="pg${on ? ' on' : ''}" data-act="${act}" data-page="${p}" ${dis ? 'disabled' : ''} ${on ? 'aria-current="page"' : ''}>${label}</button>`;
    let nums = [];
    const add = p => { if (!nums.includes(p) && p >= 1 && p <= pages) nums.push(p); };
    [1, page - 1, page, page + 1, pages].forEach(add);
    nums.sort((a, b) => a - b);
    let html = '', prev = 0;
    nums.forEach(p => { if (p - prev > 1) html += '<span class="pg-gap">…</span>'; html += btn(p, p, false, p === page); prev = p; });
    return `<div class="pager"><span class="pg-info fig">${num(from)}–${num(to)} of ${num(total)}</span><div class="pg-btns">${btn(page - 1, ic('left') + '<span class="sr">Previous page</span>', page <= 1)}${html}${btn(page + 1, ic('right') + '<span class="sr">Next page</span>', page >= pages)}</div></div>`;
  }
  const skeletonRows = (n, cols) => Array.from({ length: n }, () => `<tr class="sk-row">${Array.from({ length: cols }, () => '<td><span class="sk"></span></td>').join('')}</tr>`).join('');
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  window.UI = { gearPath, P, save, blank, KEY, calm, OS_CALM, SCOPE, level, myClub, get MY_GROUP() { return myGroup(); }, demoClubs, canSeeClub, canSeePerson, visibleClubs, roleInfo, can, download, seatEvents, scanEvents, seatsOf, regOf, poolOf, spent, get RM() { return calm(); }, $, $$, esc, num, inr, ic, pct, clubs, club, stateOf, groupOf, activeClubs, report, setReport, projects, wallet, gcolor, RS, PAY, pill, rpill, ppill, gpill, ROLES, NAV, HOME_NAME, role, R, view, go, render, cur: () => cur, setCur: c => { cur = c; }, notifs, sheet, closeSheet, toast, confetti, after, gear, skyline, scene, auto, coffee, mapSVG, ring, spark, bar, tracker, qr, pager, skeletonRows, debounce };
})();
