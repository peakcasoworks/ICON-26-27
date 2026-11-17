/* Views: role picker, role homes (DRR, group, club, member), notifications, season. */
(function () {
  const U = UI, { esc, num, inr, ic, pct, P } = U;
  const head = (title, sub, act = '') => `<header class="ph"><div class="ph-t"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${act ? `<div class="ph-act">${act}</div>` : ''}</header>`;
  U.head = head;
  const cosmos = () => U.myClub();
  const fig = (v, label, sub, pre = '', suf = '') => `<div class="stat"><span class="st-l">${label}</span><b class="st-v fig" data-count="${v}" data-pre="${pre}" data-suf="${suf}">${pre}${num(v)}${suf}</b>${sub ? `<span class="st-s">${sub}</span>` : ''}</div>`;
  U.fig = fig;
  U.groupStandings = () => D.GROUPS.map(g => {
    const cs = U.activeClubs().filter(c => U.groupOf(c) === g.id);
    const ok = cs.filter(c => ['accepted', 'drs'].includes(U.report(c, 3).status)).length;
    return { id: g.id, name: g.name, v: pct(ok, cs.length) };
  }).sort((a, b) => b.v - a.v);
  U.race = (rows, mine) => `<div class="race">${rows.map((x, i) => `<div class="lane${mine === x.id ? ' mine' : ''}" style="--g:${U.gcolor(x.id)}">
      <button class="ln-name" data-go="group" data-arg="${x.id}"><span class="ln-rank fig">${i + 1}</span>${x.name}</button>
      <div class="track"><span class="finish" aria-hidden="true"></span><div class="runner" data-race="${x.v}" style="--p:${x.v * 0.86}">${U.auto('race-auto')}<b class="fig ln-v">${x.v}%</b></div></div>
    </div>`).join('')}</div>`;
  U.waffle = list => `<div class="waffle">${list.map(c => {
    const s = U.report(c, 3).status, k = s === 'accepted' ? 'ok' : (s === 'none' || s === 'returned' || s === 'draft') ? 'bad' : 'warn';
    return `<button class="wf ${k}" style="--g:${U.gcolor(U.groupOf(c))}" data-go="club" data-arg="${c.id}" title="${esc(c.name)}: ${U.RS[s][0]}"><span class="sr">${esc(c.name)}: ${U.RS[s][0]}</span></button>`;
  }).join('')}</div>`;

  /* ---------- role picker ---------- */
  const ORDER = [['District', ['drr', 'drs', 'dt', 'gco', 'dsgt', 'adsgt']], ['Group and portfolio', ['grr', 'grs', 'dir', 'chair']], ['Club', ['pres', 'vp', 'sec', 'jsec', 'trs', 'mem']]];
  const ROLE_NOTE = {
    drr: 'Command centre, approvals, season setup', drs: 'Review every monthly report', dt: 'Dues, event fees, payment checks',
    grr: 'Chase and check the clubs of your own group', dir: 'Run a district initiative', chair: 'Committees and tasks for RYLA',
    gco: 'Every GRR and GRS, club moves, seats', grs: 'Check your own group\'s reports with the GRR',
    pres: 'Send reports, add members, book the DRR visit', vp: 'See reports, roster and events', sec: 'Log projects, send the report, keep the roster', jsec: 'Log projects and help send the report',
    trs: 'Pay dues and event fees in one go', dsgt: 'Scan every member in at the big events and each DRC', adsgt: 'Scan with the District Sergeant at the big events and each DRC', mem: 'Pass, points, certificates'
  };
  const letters = w => w.split('').map((ch, i) => `<span class="ltr" style="--i:${i}">${ch}</span>`).join('');
  U.view('roles', () => `
    ${U.landingNav()}
    <section class="land">
      ${U.scene('land-sky')}
      <div class="land-top">
        <div class="land-brand">${U.gear('spin-slow land-gear')}<div><span class="wm big" aria-label="${P.season === 'vibe' ? 'VIBE' : 'ICON'}">${letters(P.season === 'vibe' ? 'VIBE' : 'ICON')}</span><span class="wm-sub">Rotaract District 3233, Chennai</span></div></div>
        <button class="btn ink lg" data-act="to-roles">Choose your role${ic('chev')}</button>
      </div>
    </section>
    ${U.landingSections()}
    <section class="roles-wrap" id="roles">
      <div class="role-intro"><span class="eyebrow">Sign in</span><h2 class="sec-h">Choose your role</h2><p class="lede">In the real site you sign in with your own login and see only your seat: a GRR or GRS lands in their own group, a club officer in their own club. In this demo, pick a seat to try it.</p>
        <div class="demo-pick"><b>Demo only</b><span>A GRR or GRS belongs to one group. Which group should they be in?</span><div class="chips" role="radiogroup" aria-label="Group">${D.GROUPS.map(g => `<button type="button" class="chip${U.MY_GROUP === g.id ? ' on' : ''}" role="radio" aria-checked="${U.MY_GROUP === g.id}" data-act="demo-group" data-g="${g.id}">Group ${g.id}</button>`).join('')}</div></div></div>
      ${ORDER.map(([g, ids]) => `<div class="role-group"><h2>${g}</h2><div class="role-grid">${ids.map(id => {
        const r = U.roleInfo(id);
        return `<button class="role-card" data-act="pick-role" data-role="${id}"><span class="avatar">${ic(r.icon)}</span><span class="rc-t"><b>${esc(U.ROLES[id].label)}</b><small>${esc(ROLE_NOTE[id])}</small></span>${ic('right', 'rc-go')}</button>`;
      }).join('')}</div></div>`).join('')}
    </section>`);

  /* ---------- home dispatcher ---------- */
  U.view('home', () => {
    const r = U.role();
    if (r === 'drr') return drrHome();
    if (r === 'drs') return U.views_reports(true);
    if (r === 'dt') return U.views_finance();
    if (r === 'gco') return U.views_gco();
    if (r === 'grr' || r === 'grs') return groupHome(U.MY_GROUP, true);
    if (r === 'dir') return U.views_initiative('blood', true);
    if (r === 'chair') return U.views_workspace('ryla');
    if (r === 'dsgt' || r === 'adsgt') return U.views_scan();
    if (['pres', 'sec', 'vp', 'jsec'].includes(r)) return clubHome();
    if (r === 'trs') return U.views_wallet();
    return passView();
  });

  /* ---------- DRR command centre ---------- */
  function drrHome() {
    const act = U.activeClubs();
    const all = U.clubs();
    const oct = act.map(c => U.report(c, 3).status);
    const cnt = s => oct.filter(x => x === s).length;
    const accepted = cnt('accepted'), review = cnt('grs') + cnt('drs'), notStarted = cnt('none') + cnt('draft') + cnt('returned');
    let due = 0, got = 0;
    act.forEach(c => U.wallet(c).forEach(w => { if (w.status === 'verified') got += w.amount; else due += w.amount; }));
    const members = act.reduce((a, c) => a + c.members, 0);
    const college = act.filter(c => c.type === 'College').length;
    const proposed = all.filter(c => U.stateOf(c) === 'Proposed').length;
    const groups = D.GROUPS.map(g => {
      const cs = act.filter(c => U.groupOf(c) === g.id);
      const ok = cs.filter(c => ['accepted', 'drs'].includes(U.report(c, 3).status)).length;
      return { g, v: pct(ok, cs.length), n: cs.length, ok };
    }).sort((a, b) => b.v - a.v);
    const upcoming = D.EVENTS.filter(e => e.status !== 'Done').slice(0, 4);
    let waitingPay = 0;
    act.forEach(c => U.wallet(c).forEach(w => { if (w.status === 'pending') waitingPay++; }));
    const needs = [
      [ic('doc'), `${review} October reports are moving through review`, 'reports', 'Open queue'],
      [ic('alert'), `${notStarted} clubs have not filed October`, 'reports', 'See clubs'],
      [ic('rupee'), `${waitingPay} payments are with the district treasurer`, 'finance', 'Open finance'],
      [ic('building'), `${proposed || 2} clubs waiting for charter approval`, 'clubs', 'Review']
    ];
    return `${head('Command centre', 'District 3233 on Monday 16 November 2026. October reports were due on 5 November.', `<button class="btn" data-go="season">${ic('sun')}Season setup</button><button class="btn ink" data-act="new-initiative">${ic('plus')}New initiative</button>`)}
    <div class="stats">
      ${fig(act.length, 'Active clubs', `${act.length - college} community, ${college} college`)}
      ${fig(members, 'Members', 'From club rosters')}
      ${fig(got, 'Dues and fees collected', `${inr(due)} still open`, '₹')}
      ${fig(33, 'Days to RYLA', 'Run by the RYLA chairperson')}
    </div>
    <div class="grid-cc">
      <section class="card">
        <div class="card-h"><h2>Group race, October reports</h2><button class="lnk" data-go="groups">All groups</button></div>
        ${U.race(groups.map(x => ({ id: x.g.id, name: x.g.name, v: x.v })))}
        <p class="note">Each group's auto moves up as its clubs' reports clear review (accepted or with the DRS). First to the flag wins the month.</p>
      </section>
      <div class="col">
        <section class="card">
          <div class="card-h"><h2>October reports</h2><button class="lnk" data-go="reports">Queue</button></div>
          <div class="ring-row">${U.ring(pct(accepted, act.length), 'accepted')}
            <ul class="kv">
              <li><span>Accepted</span><b class="fig">${accepted}</b></li>
              <li><span>In review</span><b class="fig">${review}</b></li>
              <li><span>Not filed</span><b class="fig">${notStarted}</b></li>
              <li><span>On time in September</span><b class="fig">${pct(act.filter(c => !U.report(c, 2).late).length, act.length)}%</b></li>
            </ul></div>
        </section>
        <section class="card">
          <div class="card-h"><h2>Needs you</h2></div>
          <ul class="todo">${needs.map(n => `<li>${n[0]}<span>${n[1]}</span><button class="lnk" data-go="${n[2].split('-')[0]}" ${n[2].includes('-') ? `data-arg="${n[2].split('-')[1]}"` : ''}>${n[3]}</button></li>`).join('')}</ul>
        </section>
      </div>
    </div>
    <div class="grid-3">
      <section class="card">
        <div class="card-h"><h2>Every club, October</h2><span class="muted">Tap a tile</span></div>
        ${U.waffle(act)}
        <div class="legend"><span><i class="lg ok"></i>Accepted</span><span><i class="lg warn"></i>In review</span><span><i class="lg bad"></i>Not filed</span></div>
      </section>
      <section class="card">
        <div class="card-h"><h2>Coming up</h2><button class="lnk" data-go="events">Calendar</button></div>
        <ul class="ev-mini">${upcoming.map(e => `<li data-go="event" data-arg="${e.id}" tabindex="0" role="link"><div><b>${esc(e.name)}</b><small>${esc(e.date)}</small></div><div class="ev-h"><span class="bt"><i style="--w:${(U.health(e) / 100).toFixed(2)}"></i></span><small class="fig">${U.health(e)}% ready</small></div></li>`).join('')}</ul>
      </section>
      <section class="card">
        <div class="card-h"><h2>Engagement</h2><span class="muted">QR check-ins on VIBE</span></div>
        ${U.spark(D.checkins)}
        <p class="note">Check-ins fell from 248 in July to 36 in October. In ICON, projects, on-time reports and initiatives earn points too, so clubs have more ways to stay visible.</p>
      </section>
    </div>
    <section class="card">
      <div class="card-h"><h2>Initiatives</h2><button class="lnk" data-go="initiatives">All initiatives</button></div>
      <div class="init-row">${U.views_initCards(3)}</div>
    </section>`;
  }

  /* ---------- group dashboard (GRR) ---------- */
  function groupHome(gid, mine) {
    const g = D.GROUPS[gid - 1];
    const cs = U.activeClubs().filter(c => U.groupOf(c) === gid);
    const mem = cs.reduce((a, c) => a + c.members, 0);
    const ok = cs.filter(c => U.report(c, 3).status === 'accepted').length;
    const waitingMe = cs.filter(c => U.report(c, 3).status === 'grs');
    const lagging = cs.filter(c => ['none', 'draft', 'returned'].includes(U.report(c, 3).status));
    const overdue = cs.filter(c => U.wallet(c).some(w => w.status === 'overdue')).length;
    return `<div class="g-band" style="--g:${U.gcolor(gid)}"><span>${g.name}, ${esc(g.area)}</span><small>GRR ${esc(g.grr)}, GRS ${esc(g.grs)}</small></div>
    ${head(mine ? 'My group' : g.name, `${cs.length} active clubs and ${num(mem)} members. You check reports before they reach the DRS.`, lagging.length ? `<button class="btn ink" data-act="nudge-all" data-g="${gid}">${ic('bell')}Nudge ${lagging.length} clubs</button>` : '') + `<button class="btn" data-go="seats">${ic('id')}Assign seats</button>`}
    <div class="stats">
      ${fig(cs.length, 'Clubs')}
      ${fig(pct(ok, cs.length), 'October accepted', `${ok} of ${cs.length}`, '', '%')}
      ${fig(waitingMe.length, 'Waiting for your check', 'Open the queue below')}
      ${fig(overdue, 'Clubs with overdue fees')}
    </div>
    <div class="col">
      <section class="card">
        <div class="card-h"><h2>Clubs in ${g.name}</h2><span class="muted">October report and fees</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Club</th><th>October</th><th>November projects</th><th>Fees</th><th><span class="sr">Action</span></th></tr></thead><tbody>
        ${cs.map(c => {
          const st = U.report(c, 3).status, w = U.wallet(c);
          const fee = w.some(x => x.status === 'overdue') ? 'overdue' : w.some(x => x.status === 'due') ? 'due' : 'verified';
          const nudged = P.nudged[c.id];
          const action = st === 'grs' ? `<button class="btn sm ink" data-go="report" data-arg="${c.id}">Check</button>` : ['none', 'draft', 'returned'].includes(st) ? `<button class="btn sm" data-act="nudge" data-id="${c.id}" ${nudged ? 'disabled' : ''}>${nudged ? 'Nudged' : 'Nudge'}</button>` : '';
          return `<tr><td><button class="lnk strong" data-go="club" data-arg="${c.id}">${esc(c.name)}</button><small class="sub">${c.type}, ${c.members} members</small></td><td>${U.rpill(st)}</td><td class="fig">${U.projects(c, 4).length}</td><td>${U.ppill(fee)}</td><td class="r">${action}</td></tr>`;
        }).join('')}</tbody></table></div>
      </section>
      <section class="card">
        <div class="card-h"><h2>Group race</h2><span class="muted">October reports</span></div>
        ${U.race(U.groupStandings(), gid)}
      </section>
    </div>`;
  }
  U.view('group', arg => groupHome(Number(arg) || 6, false));

  /* ---------- club home (president and secretary) ---------- */
  function clubHome() {
    const c = cosmos(), r = U.role();
    const oct = U.report(c, 3), nov = U.report(c, 4);
    const projs = U.projects(c, 4);
    const steps = U.views_monthSteps(c, 4);
    const done = steps.filter(s => s.done).length;
    const w = U.wallet(c), open = w.filter(x => x.status !== 'verified');
    const owe = open.reduce((a, x) => a + x.amount, 0);
    const myVisit = D.visits.find(v => (P.visits[v.id] != null ? P.visits[v.id] : v.club) === c.id);
    const evs = D.EVENTS.filter(e => e.status !== 'Done').slice(0, 3);
    const octAction = U.can.sendReport() && ['draft', 'none', 'returned'].includes(oct.status) ? `<button class="btn ink" data-go="monthly" data-arg="3">${ic('send')}Finish and send October</button>` : '';
    return `<div class="g-band" style="--g:${U.gcolor(c.group)}"><span>Rotaract Club of ${esc(c.name)}</span><small>Group ${U.groupOf(c)}, ${c.type.toLowerCase()} club since ${c.chartered}, ${c.members} members</small></div>
    ${head('Club home', r === 'pres' ? 'Send reports, keep fees clear and book your DRR visit.' : 'Log each project the day it happens. The monthly report then builds itself.', `<button class="btn ink" data-go="log">${ic('plus')}Log a project</button>`)}
    ${U.passStrip()}
    <div class="grid-club">
      <section class="card hero-card">
        <div class="card-h"><h2>November report</h2><span class="muted">Due 5 December, in 19 days</span></div>
        <div class="ring-row">${U.ring(Math.round(done / steps.length * 100), done + ' of ' + steps.length + ' done', 128, 'accent')}
          <ul class="steps">${steps.map(s => `<li class="${s.done ? 'done' : ''}">${ic(s.done ? 'check' : 'circle')}<span>${s.t}</span></li>`).join('')}</ul></div>
        <div class="row-btns"><button class="btn" data-go="monthly" data-arg="4">Open November report</button><span class="muted">${projs.length} projects logged so far</span></div>
      </section>
      <section class="card">
        <div class="card-h"><h2>October report</h2>${U.rpill(oct.status)}</div>
        ${U.tracker(oct.status)}
        <p class="note">${['draft', 'none', 'returned'].includes(oct.status) ? 'October is late. The president or the secretary can send it, one of you is enough. Late reports still go through, with fewer points.' : oct.status === 'accepted' ? 'Accepted by the DRS. It now counts toward your scorecard.' : 'It is on its way. You will get a notification at each stop.'}</p>
        <div class="row-btns">${octAction}<button class="btn" data-go="report" data-arg="${c.id}">View report</button></div>
      </section>
      <section class="card">
        <div class="card-h"><h2>Club wallet</h2>${U.can.pay() ? '<button class="lnk" data-go="wallet">Open wallet</button>' : ''}</div>
        <div class="owe ${owe ? 'has' : ''}"><span>${owe ? 'You owe the district' : 'All clear'}</span><b class="fig" data-count="${owe}" data-pre="₹">${inr(owe)}</b></div>
        <ul class="kv">${open.slice(0, 3).map(x => `<li><span>${esc(x.head)}</span>${U.ppill(x.status)}</li>`).join('')}</ul>
      </section>
      <section class="card">
        <div class="card-h"><h2>DRR official visit</h2></div>
        ${myVisit ? `<p class="big-line">${myVisit.day} ${myVisit.mon}, ${myVisit.time}</p><p class="note">Prepare your board, a 5-minute club story and your project photos.</p>` : `<p class="note">You have not booked a slot yet. Slots for November and December are open.</p><button class="btn" data-go="visits">${ic('calendar')}Pick a slot</button>`}
      </section>
      <section class="card span2">
        <div class="card-h"><h2>Coming up for your club</h2><button class="lnk" data-go="events">All events</button></div>
        <ul class="ev-list">${evs.map(e => `<li data-go="event" data-arg="${e.id}" tabindex="0" role="link"><div class="ev-date fig">${esc(e.date.split(' ')[0])}<small>${esc(e.date.split(' ')[1] === 'to' ? e.date.split(' ')[3] : e.date.split(' ')[1])}</small></div><div><b>${esc(e.name)}</b><small>${e.quota ? `${e.quota} seats for your club` : esc(e.kind)}${e.fee ? `, ${inr(e.fee)} each` : ''}</small></div>${U.pill(e.status, e.status === 'Planning' ? 'neutral' : 'warn')}</li>`).join('')}</ul>
      </section>
    </div>`;
  }

  /* ---------- member pass ---------- */
  function passView() {
    const club = cosmos(), who = U.passPerson();
    const hist = [['Blood Donation Megacamp', '2 Oct', 'On time', 50], ['JOSH District Culturals', '21 Sep', 'Within 15 minutes', 40], ['District Assembly', '10 Aug', 'On time', 50], ['District Orientation', '6 Jul', 'Within 30 minutes', 30]];
    const certs = [['District Assembly 2026', 'Participation'], ['Blood Donation Megacamp', 'Volunteer, 6 hours'], [club.name, 'Project chair, Notebook drive']];
    return `${head('My pass', 'Show this at the big events and every DRC, where a district sergeant scans it. At other events your club's paid list counts you.', `<button class="btn ink" data-act="pass-open">${ic('id')}Open full screen</button>`)}
    ${U.passNext()}
    <div class="grid-pass">
      ${U.passCard(false)}
      <div class="col">
        <div class="stats two">${fig(who.points, 'Points this year')}${U.level() === 'club' ? fig(3, 'Rank in your club', 'of ' + club.members + ' members') : fig(U.level() === 'district' ? 1 : 2, 'Rank among officials')}</div>
        <section class="card">
          <div class="card-h"><h2>Check-ins</h2></div>
          <ul class="kv">${hist.map(h => `<li><span><b>${h[0]}</b><small class="sub">${h[1]}, ${h[2]}</small></span><b class="fig">+${h[3]}</b></li>`).join('')}</ul>
        </section>
        <section class="card">
          <div class="card-h"><h2>Certificates</h2></div>
          <ul class="kv">${certs.map((x, i) => `<li><span><b>${x[0]}</b><small class="sub">${x[1]}</small></span><button class="btn sm" data-act="cert" data-i="${i}">View</button></li>`).join('')}</ul>
        </section>
      </div>
    </div>`;
  }
  U.view('pass', passView);
  U.certs = [['District Assembly 2026', 'Participation'], ['Blood Donation Megacamp', 'Volunteer, 6 hours'], ['Madras Cosmos', 'Project chair, Notebook drive']];

  /* ---------- notifications ---------- */
  U.view('notifs', () => `${head('Notifications', 'Reminders, approvals and event news for your role.')}
    <section class="card"><ul class="notif">${U.notifs().map(n => `<li class="${n.unread ? 'unread' : ''}"><span class="n-dot" aria-hidden="true"></span><span>${esc(n.t)}</span><button class="lnk" data-go="${n.go.split('-')[0]}" ${n.go.includes('-') ? `data-arg="${n.go.split('-')[1]}"` : ''}>Open</button></li>`).join('')}</ul></section>
    <section class="card"><div class="card-h"><h2>Reminder ladder for monthly reports</h2></div>
    <ol class="ladder"><li><b>25th</b><span>Club secretary and president: projects logged so far, steps left</span></li><li><b>1st</b><span>Club: report window opens, due on the 5th</span></li><li><b>3rd</b><span>Club and GRS: two days left</span></li><li><b>6th</b><span>GRR: report is late, points reduced, still open</span></li></ol></section>`);

  /* ---------- season setup ---------- */
  const MODULES = [['Monthly reporting', true], ['Club wallet and fees', true], ['Events and committees', true], ['Initiatives', true], ['Scorecard and awards', true], ['DRR official visits', true], ['Entrepreneur directory', true], ['Learning hub', false], ['Tamil interface', false], ['WhatsApp reminders', false]];
  U.view('season', () => {
    const sw = Array.from({ length: 10 }, (_, i) => i + 1);
    return `${head('Season setup', 'Each Rotary year gets its own name, look, designations and group colours. Clubs, members and history carry over.')}
    <div class="grid-2">
      ${[['vibe', 'VIBE', '2026-27', 'Current season, live since 1 July 2026'], ['icon', 'ICON', '2027-28', 'Prepared by the DRR Elect, goes live on 1 July 2027']].map(s => `
      <section class="card season ${P.season === s[0] ? 'on' : ''}" data-s="${s[0]}">
        <div class="season-mark" data-season-preview="${s[0]}">${U.gear()}<span class="wm">${s[1]}</span></div>
        <div><b>${s[1]} ${s[2]}</b><p class="note">${s[3]}</p></div>
        <button class="btn ${P.season === s[0] ? '' : 'ink'}" data-act="season" data-s="${s[0]}" ${P.season === s[0] ? 'disabled' : ''}>${P.season === s[0] ? 'Showing now' : 'Preview this skin'}</button>
      </section>`).join('')}
    </div>
    <section class="card callout">${ic('palette')}<p><b>Overall colour.</b> Pick an accent colour and light or dark for the whole site. Everyone can do it for themselves, and the DRR sets the season's default.</p><button class="btn" data-act="colours">Choose colours</button></section>
    <section class="card">
      <div class="card-h"><h2>Handover to the next DRR</h2></div>
      <ol class="timeline">
        <li class="done"><b>March</b><span>DRR Elect drafts the new season: name, logo, colours</span></li>
        <li class="done"><b>April</b><span>Designations drafted and people assigned, hidden until July</span></li>
        <li><b>May</b><span>PELS and SELS train incoming presidents and secretaries</span></li>
        <li><b>30 June</b><span>Current season is archived: posts, awards and numbers</span></li>
        <li><b>1 July</b><span>New season goes live for everyone</span></li>
      </ol>
    </section>
    <div class="grid-2">
      <section class="card">
        <div class="card-h"><h2>Group colours</h2><span class="muted">Not decided yet, pick freely</span></div>
        <div class="gcols">${D.GROUPS.map(g => `<div class="gc-row"><span class="gc-name">${g.name}</span><div class="swatches" role="radiogroup" aria-label="${g.name} colour">${sw.map(s => `<button class="swb${(P.gcol[g.id] || g.id) === s ? ' on' : ''}" style="--g:var(--sw${s})" role="radio" aria-checked="${(P.gcol[g.id] || g.id) === s}" aria-label="Colour ${s}" data-act="gcol" data-g="${g.id}" data-s="${s}"></button>`).join('')}</div></div>`).join('')}</div>
      </section>
      <section class="card">
        <div class="card-h"><h2>Modules this season</h2><span class="muted">Stack more on any time</span></div>
        <ul class="toggles">${MODULES.map((m, i) => `<li><label for="mod${i}">${m[0]}</label><input type="checkbox" role="switch" class="sw" id="mod${i}" ${m[1] ? 'checked' : ''} data-act="mod" data-name="${esc(m[0])}"></li>`).join('')}</ul>
      </section>
    </div>`;
  });
})();
