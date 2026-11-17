/* Round 6: the pass is one tap away from everywhere (top bar), opens big and scannable, lets you say "I'm going" to the next
   event, and the sergeant gets a scan desk with a manual fallback. */
(function () {
  const U = UI, { esc, num, ic, P, save } = U;
  const head = (...a) => U.head(...a);
  const A = U.extraActions, F = U.extraForms;

  /* ---------- who is on the pass ---------- */
  U.passPerson = () => {
    const r = U.role(), club = U.myClub(), g = D.GROUPS[U.MY_GROUP - 1];
    if (r === 'grr') return { name: g.grr, line: `GRR, Group ${g.id}`, id: 'R3233' + String(900 + g.id).padStart(3, '0'), points: 410 };
    if (r === 'grs') return { name: g.grs, line: `GRS, Group ${g.id}`, id: 'R3233' + String(910 + g.id).padStart(3, '0'), points: 380 };
    if (['drr', 'drs', 'dt', 'gco', 'dsgt', 'dir', 'chair'].includes(r)) { const t = { drr: 'District Rotaract Representative', drs: 'District Rotaract Secretary', dt: 'District Treasurer', gco: 'Group Coordinator', dsgt: 'Chief Sergeant-at-Arms', dir: 'Chairperson, Blood Donation', chair: 'RYLA Chairman' }[r]; const d = D.designations.find(x => x.title === t); return { name: d ? d.holder : 'District official', line: t, id: 'R3233' + String(800 + (d ? d.id : 0)).padStart(3, '0'), points: 520 }; }
    const m = D.memberOf(club, 7 % club.members);
    return { name: 'Kayal S.', line: `${U.R().label}, ${club.name}`, id: m.id, points: 170 };
  };
  const nextEvent = () => D.EVENTS.find(e => e.status !== 'Done');
  const going = e => !!(P.going && P.going[e.id]);

  function passCard(big) {
    const p = U.passPerson(), season = P.season === 'vibe' ? 'VIBE' : 'ICON';
    return `<section class="pass${big ? ' big' : ''}">
      <div class="pass-top">${U.gear()}<div><b>${season} 3233</b><small>Identity pass</small></div></div>
      <div class="pass-qr">${U.qr(3233 + Number(p.id.replace(/\D/g, '').slice(-3)))}</div>
      <div class="pass-id fig" aria-label="Pass number">${esc(p.id)}</div>
      <div class="pass-who"><b>${esc(p.name)}</b><span>${esc(p.line)}</span></div>
      <p class="pass-note">Sample pass. Not scannable. The real QR is bright on any theme.</p>
    </section>`;
  }
  function nextCard() {
    const e = nextEvent();
    if (!e) return '';
    const yes = going(e);
    return `<section class="card next-ev"><div class="card-h"><h2>Next event</h2>${U.pill(e.status, e.status === 'Planning' ? 'neutral' : 'warn')}</div>
      <p class="big-line">${esc(e.name)}</p><p class="note">${esc(e.date)}${e.full ? '. ' + esc(e.full) : ''}</p>
      <div class="row-btns"><button class="btn ${yes ? '' : 'ink'}" data-act="rsvp" data-id="${e.id}">${ic(yes ? 'check' : 'plus')}${yes ? 'I\'m going. Undo' : 'I\'m going'}</button><button class="btn" data-go="event" data-arg="${e.id}">Event details</button></div>
      ${yes ? `<p class="note">Show your pass at the door. A sergeant scans it and your points land at once.</p>` : '<p class="note">Say you are coming so your club and the chair can plan.</p>'}</section>`;
  }
  A['pass-open'] = () => {
    const p = U.passPerson();
    U.sheet(`<div class="pass-sheet">${passCard(true)}${nextCard()}
      <ul class="tips"><li>${ic('check')}<span>Turn the brightness up before the door.</span></li><li>${ic('check')}<span>The pass works with no network. Scans sync later.</span></li><li>${ic('check')}<span>QR not scanning? Tell the sergeant your number <b class="fig">${esc(p.id)}</b>.</span></li></ul>
      <button class="btn full" data-act="close">Close</button></div>`);
  };
  A.rsvp = el => {
    const e = D.EVENTS.find(x => x.id === el.dataset.id); P.going = P.going || {}; P.going[e.id] = !P.going[e.id]; save();
    if (P.going[e.id]) U.confetti(...(r => [r.left + r.width / 2, r.top + r.height / 2])(el.getBoundingClientRect()));
    if (!U.$('#sheet').hidden) A['pass-open'](); U.rerender();
    U.toast(P.going[e.id] ? `You're going to ${e.name}. Show your pass at the door.` : 'Removed. You are not marked as going.', P.going[e.id] ? 'ok' : 'info');
  };
  /* the strip at the top of every club home */
  U.passStrip = () => {
    const e = nextEvent(), p = U.passPerson();
    return `<section class="card pass-strip"><button class="btn ink lg" data-act="pass-open">${ic('id')}Show my pass</button>
      <div class="ps-t"><b>${esc(p.name)}</b><small class="fig">${esc(p.id)}</small></div>${e ? `<div class="ps-n"><span>Next: <b>${esc(e.name)}</b>, ${esc(e.date)}</span><button class="btn sm ${going(e) ? '' : 'ink'}" data-act="rsvp" data-id="${e.id}">${going(e) ? 'Going' : 'I\'m going'}</button></div>` : ''}</section>`;
  };
  U.passNext = nextCard;
  U.passCard = passCard;

  /* ---------- the sergeant's scan desk ---------- */
  const SC = { ev: null, last: null, n: 0 };
  U.views_scan = () => {
    const evs = D.EVENTS.filter(e => e.status !== 'Done');
    const e = evs.find(x => x.id === SC.ev) || evs[0]; SC.ev = e.id;
    const list = (P.scans && P.scans[e.id]) || [];
    const last = SC.last;
    const clubs = new Set(list.map(x => x.club));
    return `${head('Scan at the door', 'Scan each pass as people arrive. Points land at once. If the network drops, scans stay on this device and sync later.')}
    <div class="chips" aria-label="Event">${evs.map(x => `<button class="chip${x.id === e.id ? ' on' : ''}" data-act="scan-ev" data-v="${x.id}" aria-pressed="${x.id === e.id}">${esc(x.name)}</button>`).join('')}</div>
    <div class="stats">${U.fig(list.length, 'Checked in')}${U.fig(clubs.size, 'Clubs present')}${U.fig(list.reduce((a, x) => a + x.pts, 0), 'Points given')}${U.fig(e.attendance || (e.seats ? e.seats : 0), e.seats ? 'Seats' : 'Expected', e.seats ? `${e.filled || 0} registered` : '')}</div>
    <div class="grid-2">
      <section class="card scan-card"><div class="card-h"><h2>Scan</h2><span class="muted">${esc(e.name)}, ${esc(e.date)}</span></div>
        <button class="btn ink scan-btn" data-act="scan-next">${ic('id')}Scan next pass</button>
        <p class="note">On a phone this opens the camera. In this demo it checks in the next member in the queue.</p>
        <form data-form="scan-id" class="form scan-id"><label class="field" for="scId"><span>QR not working? Type the number on the pass</span><input id="scId" name="id" placeholder="R3233007" autocomplete="off" inputmode="text"></label><button class="btn" type="submit">Check in</button></form>
        ${last ? `<div class="scan-res ${last.kind}" role="status">${ic(last.kind === 'ok' ? 'check' : 'alert')}<div><b>${esc(last.title)}</b><small>${esc(last.sub)}</small></div></div>` : ''}
      </section>
      <section class="card"><div class="card-h"><h2>Just now</h2><span class="muted fig">${list.length} in total</span></div>
        <ul class="kv scan-list">${list.slice(-8).reverse().map(x => `<li><span><b>${esc(x.name)}</b><small class="sub">${esc(x.clubName)}, ${esc(x.label)}</small></span><b class="fig">+${x.pts}</b></li>`).join('') || '<li><span class="muted">Nobody yet. The first scan shows up here.</span></li>'}</ul>
        ${list.length ? `<div class="row-btns"><button class="btn sm" data-act="scan-export">${ic('upload')}Export list</button></div>` : ''}</section>
    </div>`;
  };
  U.view('scan', () => U.views_scan());
  const tier = n => n < 6 ? ['On time', 50] : n < 14 ? ['Within 15 minutes', 40] : ['Within 30 minutes', 30];
  function checkIn(m) {
    const e = D.EVENTS.find(x => x.id === SC.ev); P.scans = P.scans || {}; const list = (P.scans[e.id] = P.scans[e.id] || []);
    if (list.some(x => x.id === m.id)) { SC.last = { kind: 'dup', title: `${m.name} is already checked in`, sub: `${m.id}. No points added twice.` }; return false; }
    const [label, pts] = tier(list.length);
    list.push({ id: m.id, name: m.name, club: m.club.id, clubName: m.club.name, label, pts }); save();
    SC.last = { kind: 'ok', title: `${m.name} checked in, +${pts}`, sub: `${m.club.name}, ${label}` };
    return true;
  }
  A['scan-ev'] = el => { SC.ev = el.dataset.v; SC.last = null; U.rerender(); };
  A['scan-next'] = el => {
    let tries = 0, m;
    do { m = D.member((SC.n++ * 137 + 11) % D.memberCount); tries++; } while (tries < 40 && ((P.scans && P.scans[SC.ev]) || []).some(x => x.id === m.id));
    const ok = checkIn(m); if (ok) U.confetti(...(r => [r.left + r.width / 2, r.top + r.height / 2])(el.getBoundingClientRect()));
    U.rerender();
  };
  F['scan-id'] = f => {
    const raw = (new FormData(f).get('id') || '').trim().toUpperCase().replace(/\s/g, '');
    const n = Number(raw.replace(/\D/g, '')) - 3233000;
    if (!raw) return;
    if (!Number.isInteger(n) || n < 0 || n >= D.memberCount) { SC.last = { kind: 'bad', title: `No member with number ${raw}`, sub: 'Check the number on the pass. It starts with R3233.' }; U.rerender(); return; }
    checkIn(D.member(n)); U.rerender();
  };
  A['scan-export'] = () => { const e = D.EVENTS.find(x => x.id === SC.ev); U.download(`${e.id}-check-ins.csv`, [['Number', 'Name', 'Club', 'Arrival', 'Points']].concat(((P.scans && P.scans[e.id]) || []).map(x => [x.id, x.name, x.clubName, x.label, x.pts]))); U.toast('Check-in list downloaded'); };
})();
