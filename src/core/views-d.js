/* Views: events, event shell, chair workspace, DRR visits, initiatives, scorecard. */
(function () {
  const U = UI, { esc, num, inr, ic, pct, P } = U;
  const head = (...a) => U.head(...a);
  const MON = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const NOW_M = 4;

  /* ---------- events ---------- */
  const EF = { f: 'all' };
  U.EF = EF;
  U.view('events', () => {
    const list = D.EVENTS.filter(e => EF.f === 'all' || (EF.f === 'up' ? e.status !== 'Done' : EF.f === 'done' ? e.status === 'Done' : e.kind === 'Flagship'));
    const chip = (v, l) => `<button class="chip${EF.f === v ? ' on' : ''}" data-act="ev-f" data-v="${v}" aria-pressed="${EF.f === v}">${l}</button>`;
    return `${head('Events', 'The district year at a glance. Each event keeps its record here, even when the chair runs registration on their own website.', U.role() === 'drr' ? `<button class="btn ink" data-act="new-event">${ic('plus')}New event</button>` : '')}
    <section class="card year">
      <div class="yr" role="list">${MON.map((m, i) => `<div class="yr-m${i === NOW_M ? ' now' : ''}${i < NOW_M ? ' past' : ''}" role="listitem"><span class="yr-l">${m}</span><div class="yr-e">${D.EVENTS.filter(e => e.m === i).map(e => `<button class="yr-dot ${e.kind.toLowerCase()}" data-go="event" data-arg="${e.id}" title="${esc(e.name)}"><span class="sr">${esc(e.name)}</span></button>`).join('')}</div></div>`).join('')}</div>
      <p class="muted yr-key"><span><i class="yr-dot flagship"></i>Flagship</span><span><i class="yr-dot training"></i>Training</span><span><i class="yr-dot service"></i>Service and campaigns</span><span><i class="yr-dot awards"></i>Awards</span></p>
    </section>
    <div class="chips">${chip('all', 'All')}${chip('up', 'Upcoming')}${chip('done', 'Done')}${chip('flag', 'Flagship')}</div>
    <div class="ev-grid">${list.map((e, i) => `<button class="ev-card" data-go="event" data-arg="${e.id}" style="--i:${Math.min(i, 8)}">
      <span class="ev-top"><span class="ev-kind">${esc(e.kind)}</span>${U.pill(e.status, e.status === 'Done' ? 'ok' : e.status === 'Planning' ? 'neutral' : 'warn')}</span>
      <b class="ev-name">${esc(e.name)}</b><span class="ev-when">${esc(e.date)}</span>
      ${e.status === 'Done' ? `<span class="ev-res fig">${num(e.attendance)} attended</span>` : `<span class="ev-h"><span class="bt"><i style="--w:${(U.health(e) / 100).toFixed(2)}"></i></span><small class="fig">${U.health(e)}% ready</small></span>`}
      <span class="ev-chair">Chair ${esc(e.chair)}</span></button>`).join('')}</div>`;
  });

  /* ---------- event shell ---------- */
  U.view('event', arg => {
    const e = D.EVENTS.find(x => x.id === arg) || D.EVENTS[6];
    const rl = U.role();
    const isClub = ['pres', 'sec', 'trs', 'vp', 'jsec', 'sgt'].includes(rl);
    const mine = U.myClub(), seats = e.quota ? U.seatsOf(e, mine) : 0;
    const site = (P.site && P.site[e.id]) || e.site;
    const done = e.status === 'Done';
    return `${head(esc(e.name), `${e.full ? esc(e.full) + '. ' : ''}${esc(e.date)}. Chair ${esc(e.chair)}.`, `<button class="btn" data-act="back">${ic('left')}Back</button>${(rl === 'drr' || rl === 'chair') && COMMITTEE_IDS.includes(e.id) ? `<button class="btn ink" data-go="workspace" data-arg="${e.id}">Open workspace</button>` : ''}`)}
    <div class="stats">
      <div class="stat"><span class="st-l">Status</span><b class="st-v">${U.pill(e.status, done ? 'ok' : e.status === 'Planning' ? 'neutral' : 'warn')}</b></div>
      ${done ? U.fig(e.attendance, 'Attended') : U.fig(U.health(e), 'Ready', 'From committee tasks', '', '%')}
      ${e.quota ? (isClub ? U.fig(seats, 'Seats for your club', 'Set by your GRR or GRS') : U.fig(e.quota, 'Seats per club to start', 'Group leads can change it')) : U.fig(U.activeClubs().length, 'Clubs invited')}
      ${e.fee ? U.fig(e.fee, 'Fee per seat', 'Added to each club wallet', '₹') : `<div class="stat"><span class="st-l">Fee</span><b class="st-v">Free</b></div>`}
    </div>
    <div class="grid-2">
      <section class="card">
        <div class="card-h"><h2>Registration</h2></div>
        <div class="site-opt">
          <div class="${site === 'own' ? 'on' : ''}"><b>Chair's own website</b><p class="note">The chair designs the event site and runs sign-ups there. After the event the attendance list comes back here for points and certificates.</p></div>
          <div class="${site === 'quick' ? 'on' : ''}"><b>Quick event page</b><p class="note">A ready page in the season's style: schedule, venue, register button and FAQ. Ready in ten minutes.</p></div>
        </div>
        ${site === 'own' ? `<p class="linkline">${ic('link')}<span>Event website link, added by the chair</span></p>` : `<button class="btn" data-act="quickpage" data-id="${e.id}">${ic('eye')}Preview quick page</button>`}
      </section>
      <section class="card">
        ${done ? `<div class="card-h"><h2>Results</h2></div><ul class="kv"><li><span>Attended</span><b class="fig">${num(e.attendance)}</b></li><li><span>Clubs present</span><b class="fig">${Math.min(70, Math.round(e.attendance / 18))}</b></li><li><span>Certificates issued</span><b class="fig">${num(e.attendance)}</b></li><li><span>Points awarded</span><b class="fig">${num(e.attendance * 45)}</b></li></ul>`
          : isClub ? `<div class="card-h"><h2>For ${esc(mine.name)}</h2></div><p class="note">${e.quota ? `Your group lead gave your club ${seats} seat${seats === 1 ? '' : 's'}.` : 'Every club is invited.'} ${e.fee ? `${inr(e.fee * (e.quota ? seats : 1))} is in your club wallet. Pay it with your other dues in one go.` : ''}</p>${['pres', 'sec', 'jsec'].includes(rl) ? `<button class="btn ink" data-act="confirm-seats" data-id="${e.id}">${ic('check')}Confirm our seats</button>` : ''}`
          : `<div class="card-h"><h2>Seats</h2>${e.quota && U.can.seats() ? `<button class="btn sm ink" data-go="seats" data-arg="${e.id}">Assign seats</button>` : ''}</div>${e.seats ? `<div class="prog"><span class="bt"><i style="--w:${(e.filled / e.seats).toFixed(2)}"></i></span><span class="fig">${e.filled} of ${e.seats}</span></div>` : ''}<p class="note">${e.quota ? 'The district gives each group a pool of seats. The GRR or GRS spreads it over the clubs, and the fee lands in each club wallet.' : 'Clubs confirm their seats here. Fees post to each club wallet automatically.'}</p>`}
      </section>
    </div>`;
  });

  /* ---------- chair workspace ---------- */
  const COMMITTEE_IDS = ['ryla'];
  const comms = id => (D.COMMITTEES[id] || []).concat((P.comms && P.comms[id]) || []);
  const taskDone = (id, ci, ti, def) => { const k = id + '|' + ci + '|' + ti; return P.tasks[k] != null ? P.tasks[k] : ti < def; };
  U.health = e => e.id === 'ryla' ? U.readiness('ryla') : e.health;
  U.readiness = id => { let t = 0, d = 0; comms(id).forEach((c, ci) => c.tasks.forEach((_, ti) => { t++; if (taskDone(id, ci, ti, c.done)) d++; })); return pct(d, t); };
  U.views_workspace = (id = 'ryla') => {
    const e = D.EVENTS.find(x => x.id === id);
    const cs = comms(id);
    const ready = U.readiness(id);
    return `${head(`${esc(e.name)} workspace`, `${esc(e.date)}. Every committee, its head and its tasks in one place. The DRR sees the same board.`, `<button class="btn" data-act="add-comm" data-id="${id}">${ic('plus')}Add committee</button>`)}
    <div class="stats">
      <div class="stat ring-stat">${U.ring(ready, 'ready', 96, 'accent')}</div>
      ${U.fig(33, 'Days to go', 'Starts 19 December')}
      ${U.fig(e.filled, 'Seats filled', `of ${e.seats}`)}
      ${U.fig(cs.length, 'Committees')}
    </div>
    <div class="board">${cs.map((c, ci) => {
      const d = c.tasks.filter((_, ti) => taskDone(id, ci, ti, c.done)).length;
      return `<section class="card comm" style="--i:${Math.min(ci, 8)}"><div class="card-h"><h2>${esc(c.name)}</h2><span class="fig muted">${d}/${c.tasks.length}</span></div>
        <small class="sub">Head ${esc(c.head)}</small>
        <span class="bt thin"><i style="--w:${(d / c.tasks.length || 0).toFixed(2)}"></i></span>
        <ul class="tasks">${c.tasks.map((t, ti) => { const on = taskDone(id, ci, ti, c.done); const tid = `t-${ci}-${ti}`; return `<li><input type="checkbox" id="${tid}" ${on ? 'checked' : ''} data-on="task" data-k="${id}|${ci}|${ti}"><label for="${tid}">${esc(t)}</label></li>`; }).join('')}</ul></section>`;
    }).join('')}</div>`;
  };
  U.view('workspace', arg => U.views_workspace(arg || 'ryla'));

  /* ---------- DRR official visits ---------- */
  U.view('visits', () => {
    const rl = U.role(), c = U.myClub();
    const booked = v => P.visits[v.id] != null ? P.visits[v.id] : v.club;
    const mine = D.visits.find(v => booked(v) === c.id);
    const taken = D.visits.filter(v => booked(v)).length;
    const days = {};
    D.visits.forEach(v => { const k = v.day + ' ' + v.mon; (days[k] = days[k] || []).push(v); });
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${head('DRR official visits', rl === 'drr' ? `${taken} of ${D.visits.length} slots booked. Clubs pick their own slot, so no back-and-forth on WhatsApp.` : 'Pick one slot for the DRR to visit your club. You can move it once.')}
    ${mine && rl !== 'drr' ? `<section class="card callout ok">${ic('check')}<p>Booked for <b>${mine.day} ${mine.mon}, ${mine.time}</b>. Prepare your board, a 5-minute club story and project photos.</p><button class="btn sm" data-act="unbook" data-id="${mine.id}">Move</button></section>` : ''}
    <div class="slots">${Object.entries(days).map(([k, vs]) => `<section class="slot-day"><h3><span class="fig">${k.split(' ')[0]}</span> ${k.split(' ')[1]}<small>${DOW[vs[0].dow]}</small></h3>${vs.map(v => {
      const b = booked(v), bc = b ? U.club(b) : null;
      const isMine = b === c.id;
      return `<div class="slot ${b ? 'taken' : ''} ${isMine ? 'mine' : ''}"><span class="fig">${v.time}</span>${b ? `<small>${rl === 'drr' || isMine ? esc(bc ? bc.name : '') : 'Taken'}</small>` : (['pres', 'sec', 'jsec'].includes(rl) && !mine ? `<button class="btn sm ink" data-act="book" data-id="${v.id}">Book</button>` : '<small>Open</small>')}</div>`;
    }).join('')}</section>`).join('')}</div>`;
  });

  /* ---------- initiatives ---------- */
  const inits = () => D.INITIATIVES.concat(P.inits);
  U.views_initCards = (n) => inits().slice(0, n || 99).map((x, i) => `<button class="init${x.isNew ? ' fresh' : ''}" style="--g:var(--sw${x.sw});--i:${Math.min(i, 8)}" data-go="initiative" data-arg="${x.id}">
      <span class="in-top"><span class="in-type">${esc(x.type)}</span><span class="in-sw"></span></span>
      <b>${esc(x.name)}</b><small>${esc(x.owner)}</small>
      <span class="in-fig"><b class="fig" data-count="${x.now}">${num(x.now)}</b><small>of ${num(x.goal)} ${esc(x.unit)}</small></span>
      <span class="bt"><i style="--w:${Math.min(1, x.now / x.goal).toFixed(3)};--c:var(--sw${x.sw})"></i></span>
      <small class="in-clubs">${x.clubs} clubs taking part</small></button>`).join('');
  U.view('initiatives', () => `${head('Initiatives', 'Campaigns, directories and challenges the district runs this year. Add a new one any time. It shows up for every club at once.', ['drr', 'dir'].includes(U.role()) ? `<button class="btn ink" data-act="new-initiative">${ic('plus')}New initiative</button>` : '')}
    <div class="init-grid" id="initGrid">${U.views_initCards()}</div>`);
  U.views_initiative = (id, isHome) => {
    const x = inits().find(i => i.id === id) || inits()[0];
    const r = D.mulberry32(id.length * 31);
    const rows = U.activeClubs().slice().sort((a, b) => b.activity - a.activity).slice(0, x.clubs || 5).map(c => ({ c, v: Math.max(1, Math.round(x.now / (x.clubs || 5) * (0.4 + r() * 1.2))) })).sort((a, b) => b.v - a.v);
    const canLog = ['pres', 'sec', 'jsec'].includes(U.role());
    return `${head(esc(x.name), `${esc(x.type)} run by ${esc(x.owner)}. Clubs log what they did, and the district total updates live.`, `${isHome ? '' : `<button class="btn" data-act="back">${ic('left')}Back</button>`}${canLog ? `<button class="btn ink" data-act="contrib" data-id="${x.id}">${ic('plus')}Log for our club</button>` : ''}`)}
    <section class="card in-hero" style="--g:var(--sw${x.sw})">
      <div><span class="muted">District total</span><b class="in-big fig" data-count="${x.now}">${num(x.now)}</b><span>of ${num(x.goal)} ${esc(x.unit)}</span></div>
      ${U.ring(Math.min(100, pct(x.now, x.goal)), 'of goal', 120)}
    </section>
    <section class="card">
      <div class="card-h"><h2>Clubs</h2><span class="muted">${rows.length} taking part</span></div>
      <div class="bars">${rows.slice(0, 12).map(o => U.bar(esc(o.c.name), o.v, rows[0].v, num(o.v), 'var(--sw' + x.sw + ')')).join('')}</div>
    </section>`;
  };
  U.view('initiative', arg => U.views_initiative(arg));

  /* ---------- scorecard and awards ---------- */
  const W0 = { reports: 30, projects: 25, hours: 15, events: 15, fees: 10, inits: 5 };
  const WL = { reports: 'Reports on time', projects: 'Projects', hours: 'Service hours', events: 'Event turnout', fees: 'Fees paid', inits: 'Initiatives' };
  let RAW = null;
  function raw() {
    if (RAW) return RAW;
    RAW = U.activeClubs().map(c => {
      let onTime = 0, projs = 0, hrs = 0;
      for (let i = 0; i < 4; i++) { const r = U.report(c, i); if (r.status === 'accepted' && !r.late) onTime++; const ps = U.projects(c, i); projs += ps.length; hrs += ps.reduce((a, p) => a + p.manHours, 0); }
      const w = U.wallet(c);
      return { c, reports: onTime, projects: projs, hours: hrs / Math.sqrt(c.members), events: c.activity * 10, fees: w.filter(x => x.status === 'verified').length / w.length, inits: c.activity > 0.5 ? 1 : c.activity };
    });
    return RAW;
  }
  U.resetScore = () => { RAW = null; };
  function ranked() {
    const w = P.weights || W0, rs = raw();
    const max = {}; Object.keys(W0).forEach(k => { max[k] = Math.max(...rs.map(r => r[k])) || 1; });
    const tw = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    return rs.map(r => ({ c: r.c, s: Math.round(Object.keys(W0).reduce((a, k) => a + (r[k] / max[k]) * w[k], 0) / tw * 100) })).sort((a, b) => b.s - a.s);
  }
  U.scoreRank = ranked;
  U.scoreList = () => {
    const rk = ranked();
    const top = t => rk.filter(x => x.c.type === t).slice(0, 5);
    const block = (t) => `<section class="card"><div class="card-h"><h2>${t} clubs</h2><span class="muted">Top 5</span></div><ol class="rank">${top(t).map((x, i) => `<li class="${i < 3 ? 'medal m' + i : ''}"><span class="rk fig">${i + 1}</span><span class="rk-n"><b>${esc(x.c.name)}</b><small class="sub">Group ${U.groupOf(x.c)}</small></span><span class="rk-bar"><i style="--w:${(x.s / 100).toFixed(2)}"></i></span><b class="fig">${x.s}</b></li>`).join('')}</ol></section>`;
    return block('Community') + block('College');
  };
  U.view('awards', () => {
    const w = P.weights || W0, edit = U.role() === 'drr';
    return `${head('Scorecard', 'Every club scored from what it already logs. The Half-Yearly Awards shortlist comes straight from here, and judges confirm it.')}
    <div class="grid-log">
      <div class="grid-2 tight" id="scoreList">${U.scoreList()}</div>
      <aside class="card preview sticky">
        <div class="card-h"><h2>Weights</h2><span class="muted">${edit ? 'Drag to change' : 'Set by the DRR'}</span></div>
        <div class="weights">${Object.keys(W0).map(k => `<label class="wt" for="w-${k}"><span>${WL[k]}</span><output class="fig" id="wo-${k}">${w[k]}</output><input type="range" id="w-${k}" min="0" max="50" step="5" value="${w[k]}" data-on="weight" data-k="${k}" ${edit ? '' : 'disabled'}></label>`).join('')}</div>
        <p class="note">Check-ins are no longer the only way to earn points. Clubs that report on time and serve more rise, even if few members travel to events.</p>
      </aside>
    </div>`;
  });
})();
