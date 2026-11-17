/* Round 6: the pass is one tap away from everywhere (top bar), opens big and scannable, lets you say "I'm going" to the next
   event, and the sergeant gets a scan desk with a manual fallback. */
(function () {
  const U = UI, { esc, num, ic, P, save } = U;
  const head = (...a) => U.head(...a);
  const A = U.extraActions, F = U.extraForms;
  let I = U.extraInputs;

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

  // The QR is a live code: it changes every 30 seconds and is tied to this member. A screenshot or a forwarded picture is
  // dead before it reaches the door.
  const BUCKET = 30000, bucket = () => Math.floor(Date.now() / BUCKET);
  const seedOf = p => Number(p.id.replace(/\D/g, '').slice(-4)) * 1000 + (bucket() % 1000);
  function passCard(big) {
    const p = U.passPerson(), season = P.season === 'vibe' ? 'VIBE' : 'ICON';
    return `<section class="pass${big ? ' big' : ''}">
      <div class="pass-top">${U.gear()}<div><b>${season} 3233</b><small>Identity pass</small></div></div>
      <div class="pass-qr" id="passQr">${U.qr(seedOf(p))}</div>
      <div class="pass-live"><i></i><span>Live code. New in <b id="passCd" class="fig">30</b> s</span></div>
      <div class="pass-id fig" aria-label="Pass number">${esc(p.id)}</div>
      <div class="pass-who"><b>${esc(p.name)}</b><span>${esc(p.line)}</span></div>
      <p class="pass-note">Sample pass. Not scannable.</p>
    </section>`;
  }
  let passTimer = null;
  function runPassTimer() {
    clearInterval(passTimer);
    let last = bucket();
    passTimer = setInterval(() => {
      const cd = U.$('#passCd'), box = U.$('#passQr');
      if (!cd || !box) { clearInterval(passTimer); return; }
      cd.textContent = Math.ceil((BUCKET - (Date.now() % BUCKET)) / 1000);
      if (bucket() !== last) { last = bucket(); box.innerHTML = U.qr(seedOf(U.passPerson())); }
    }, 500);
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
      <ul class="tips"><li>${ic('check')}<span>Turn the brightness up before the door.</span></li><li>${ic('check')}<span>The code changes every 30 seconds, so a screenshot is no use. Your own phone only.</span></li><li>${ic('check')}<span>Your pass works on your registered phone. A new phone needs a code sent to your own number, and you get an alert: not you? Tap to lock it.</span></li><li>${ic('check')}<span>The sergeant will check your face against your photo.</span></li><li>${ic('check')}<span>QR not scanning? Tell the sergeant your number <b class="fig">${esc(p.id)}</b>.</span></li></ul>
      <button class="btn full" data-act="close">Close</button></div>`);
    runPassTimer();
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
  // Only district sergeants scan, at doors the district runs. A club cannot mark its own members present. The desk still
  // keeps the live code, the face check, the time and place stamp, and the district review of anything odd.
  const SC = { ev: null, last: null, n: 0, pending: null, away: false };
  const VENUE = 'Chennai Trade Centre';
  const clock = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const scans = id => ((P.scans = P.scans || {})[id] = P.scans[id] || []);
  const FLAG = { qr: 'Code was 3 minutes old, like a screenshot', device: 'The same phone showed two passes', loc: 'Scanned away from the venue', typed: 'Typed in, not scanned', face: 'Face did not match the photo', borrowed: 'Shown on a new phone while the member\'s usual phone is somewhere else', over: 'More people present than this club has seats for', batch: 'Another scan by the same sergeant failed a spot check', unreg: 'Not on the club\'s paid list for this event' };
  const ptsOf = x => x.status === 'ok' ? x.pts : 0;
  U.views_scan = () => {
    const evs = D.EVENTS.filter(e => e.status !== 'Done');
    const e = evs.find(x => x.id === SC.ev) || evs[0]; SC.ev = e.id;
    const list = scans(e.id), ok = list.filter(x => x.status === 'ok'), hold = list.filter(x => x.status === 'review'), pend = SC.pending, last = SC.last;
    const verify = pend ? `<div class="verify"><div class="v-face" aria-label="Photo on file"><span>${esc(pend.m.name.split(' ').map(x => x[0]).join(''))}</span><small>Photo on file</small></div>
      <div class="v-body"><b>${esc(pend.m.name)}</b><small>${esc(pend.m.club.name)}, ${esc(pend.m.id)}</small>
      <ul class="v-checks">${pend.checks.map(c => `<li class="${c.ok ? 'ok' : 'bad'}">${ic(c.ok ? 'check' : 'alert')}<span>${esc(c.t)}</span></li>`).join('')}</ul>
      <p class="note">Look at the person in front of you. Is it the face in the photo?</p>
      <div class="row-btns"><button class="btn ink" data-act="scan-yes">${ic('check')}It is them, check in</button><button class="btn" data-act="scan-no">Not them</button></div></div></div>` : '';
    return `${head('Scan at the door', 'Scan any club\'s members at the district\'s doors, and clear anything flagged. Each scan is stamped with the time, the place and you.', `<button class="btn" data-go="review">${ic('badge')}Attendance review</button>`)}
    <div class="chips" aria-label="Event">${evs.map(x => `<button class="chip${x.id === e.id ? ' on' : ''}" data-act="scan-ev" data-v="${x.id}" aria-pressed="${x.id === e.id}">${esc(x.name)}</button>`).join('')}</div>
    <div class="stats">${U.fig(ok.length, 'Checked in')}${U.fig(hold.length, 'Held for district review', 'Points wait until cleared')}${U.fig(new Set(ok.map(x => x.club)).size, 'Clubs present')}${U.fig(ok.reduce((a, x) => a + x.pts, 0), 'Points given')}</div>
    <div class="grid-2">
      <section class="card scan-card"><div class="card-h"><h2>Scan</h2><span class="muted">${esc(e.name)}, ${esc(e.date)}</span></div>
        <div class="station ${SC.away ? 'away' : ''}">${ic('flag')}<span><b>${SC.away ? 'Away from the venue' : esc(VENUE)}</b><small>${SC.away ? 'Scans from here are flagged' : 'Within 60 m of the venue gate'}, clock ${clock()}</small></span><label class="demo-sw"><input type="checkbox" class="sw" data-on="scan-away" ${SC.away ? 'checked' : ''}><span>Demo: I am away</span></label></div>
        ${pend ? verify : `<button class="btn ink scan-btn" data-act="scan-next">${ic('id')}Scan next pass</button>
        <p class="note">On a phone this opens the camera. In this demo it shows the next member.</p>
        <button class="btn sm" data-act="scan-borrow">Demo: scan a borrowed phone</button>
        <form data-form="scan-id" class="form scan-id"><label class="field" for="scId"><span>QR not working? Type the number on the pass</span><input id="scId" name="id" placeholder="R3233007" autocomplete="off"></label><button class="btn" type="submit">Look up</button></form>`}
        ${last && !pend ? `<div class="scan-res ${last.kind}" role="status">${ic(last.kind === 'ok' ? 'check' : 'alert')}<div><b>${esc(last.title)}</b><small>${esc(last.sub)}</small></div></div>` : ''}
      </section>
      <section class="card"><div class="card-h"><h2>Just now</h2><span class="muted fig">${list.length} scans</span></div>
        <ul class="kv scan-list">${list.slice(-8).reverse().map(x => `<li><span><b>${esc(x.name)}</b><small class="sub">${esc(x.clubName)}, ${esc(x.time)}, by ${esc(x.by)}</small>${x.flags.length ? `<small class="sub warn-t">${esc(x.flags.map(f => FLAG[f]).join('. '))}</small>` : ''}</span>${x.status === 'ok' ? `<b class="fig">+${x.pts}</b>` : U.pill(x.status === 'review' ? 'Held' : 'Rejected', x.status === 'review' ? 'warn' : 'bad')}</li>`).join('') || '<li><span class="muted">Nobody yet. The first scan shows up here.</span></li>'}</ul>
        ${list.length ? `<div class="row-btns"><button class="btn sm" data-act="scan-export">${ic('upload')}Send list to the district</button></div>` : ''}</section>
    </div>
    <section class="card"><div class="card-h"><h2>How a stand-in is stopped</h2><span class="muted">Checks on every check-in</span></div>
      <ol class="ladder"><li><b>1</b><span>The code on the pass changes every 30 seconds. A screenshot or a forwarded picture is dead at the door.</span></li><li><b>2</b><span>You compare the face with the photo on file. Logging into a friend's account does not change the face.</span></li><li><b>3</b><span>Only district sergeants scan, at doors the district runs. A club cannot mark its own members present.</span></li><li><b>4</b><span>Every scan is stamped with time, place and the sergeant. Away from the venue or outside the event hours is flagged.</span></li><li><b>5</b><span>One phone showing two passes is flagged, and a typed number is flagged.</span></li><li><b>6</b><span>Flagged scans wait with the district. Their points are held until the DRS or the District Sergeant clears them. A few clean scans are re-checked at random.</span></li><li><b>7</b><span>The sergeant is not the only check. A pass opened on a new phone while the member's usual phone is far away, more people than the club's seats, and a photo taken at every scan are all flagged even if the sergeant taps yes. A failed spot check holds all of that sergeant's scans.</span></li></ol></section>`;
  };
  U.view('scan', () => U.views_scan());
  const tier = n => n < 6 ? ['On time', 50] : n < 14 ? ['Within 15 minutes', 40] : ['Within 30 minutes', 30];
  function start(m, method, opts) {
    const e = D.EVENTS.find(x => x.id === SC.ev), list = scans(e.id);
    if (list.some(x => x.id === m.id && x.status !== 'rejected')) { SC.last = { kind: 'dup', title: `${m.name} is already checked in`, sub: `${m.id}. No points added twice.` }; return; }
    const n = SC.n++, flags = [];
    if (SC.away) flags.push('loc');
    if (method === 'qr' && n % 7 === 3) flags.push('qr');
    if (method === 'qr' && n % 5 === 4) flags.push('device');
    if (method === 'typed') flags.push('typed');
    if (opts && opts.borrowed) flags.push('borrowed');
    const ev = D.EVENTS.find(x => x.id === SC.ev);
    const club = m.club, present = list.filter(x => x.club === club.id && x.status !== 'rejected').length;
    if (ev.quota && present >= U.seatsOf(ev, club)) flags.push('over');
    const rg = U.regOf(ev, club);
    if (rg && !(rg[m.id] && rg[m.id].paid)) flags.push('unreg');
    SC.pending = { m, method, flags, checks: [
      { ok: method === 'qr' && !flags.includes('qr'), t: method === 'typed' ? 'Typed in, no code was scanned' : flags.includes('qr') ? 'Code is 3 minutes old. A live code changes every 30 s' : 'Live code, fresh' },
      { ok: !flags.includes('loc'), t: flags.includes('loc') ? 'You are away from the venue' : `At ${VENUE}` },
      { ok: true, t: 'Member of ' + m.club.name },
      { ok: !flags.includes('device'), t: flags.includes('device') ? 'The same phone showed another pass a minute ago' : 'One phone, one pass' },
      { ok: !flags.includes('borrowed'), t: flags.includes('borrowed') ? 'New phone for this account. The usual phone was last seen in Tambaram, 22 km away' : 'The member\'s own registered phone' },
      { ok: !flags.includes('unreg'), t: flags.includes('unreg') ? 'The club did not register or collect the fee for this member' : U.regOf(ev, club) ? 'On the club\'s paid list' : 'Club has not sent its paid list yet' },
      { ok: !flags.includes('over'), t: flags.includes('over') ? `${club.name} has ${U.seatsOf(ev, club)} seat${U.seatsOf(ev, club) === 1 ? '' : 's'} here and they are all taken` : ev.quota ? `Within the club's ${U.seatsOf(ev, club)} seats` : 'No seat limit for this event' }
    ] };
  }
  function record(status, extra) {
    const pd = SC.pending, e = D.EVENTS.find(x => x.id === SC.ev), list = scans(e.id);
    const [label, pts] = tier(list.filter(x => x.status === 'ok').length);
    const flags = pd.flags.concat(extra || []);
    const st = status === 'rejected' ? 'rejected' : flags.length ? 'review' : 'ok';
    list.push({ id: pd.m.id, name: pd.m.name, club: pd.m.club.id, clubName: pd.m.club.name, label, pts, time: clock(), by: 'District Sergeant', where: SC.away ? 'Away' : VENUE, method: pd.method, flags, status: st, event: e.id, photo: true, mismatch: flags.some(f => ['borrowed', 'face', 'device'].includes(f)) });
    SC.last = st === 'ok' ? { kind: 'ok', title: `${pd.m.name} checked in, +${pts}`, sub: `${pd.m.club.name}, ${label}` } : st === 'review' ? { kind: 'dup', title: `${pd.m.name} is held for review`, sub: 'Flagged: ' + flags.map(f => FLAG[f]).join('. ') + '. Your tap does not release the points. They wait for the district.' } : { kind: 'bad', title: `${pd.m.name} was not checked in`, sub: 'Reported to the district as a possible stand-in.' };
    SC.pending = null; save();
  }
  A['scan-ev'] = el => { SC.ev = el.dataset.v; SC.last = null; SC.pending = null; U.rerender(); };
  A['scan-next'] = () => {
    let m, tries = 0; const e = D.EVENTS.find(x => x.id === SC.ev);
    do { m = D.member((SC.n * 137 + 11 + tries) % D.memberCount); tries++; } while (tries < 60 && scans(e.id).some(x => x.id === m.id));
    start(m, 'qr'); U.rerender();
  };
  A['scan-borrow'] = () => { const e = D.EVENTS.find(x => x.id === SC.ev); let m, t = 0; do { m = D.member((SC.n * 53 + 7 + t) % D.memberCount); t++; } while (t < 60 && scans(e.id).some(x => x.id === m.id)); start(m, 'qr', { borrowed: true }); U.rerender(); };
  F['scan-id'] = f => {
    const raw = (new FormData(f).get('id') || '').trim().toUpperCase().replace(/\s/g, '');
    const n = Number(raw.replace(/\D/g, '')) - 3233000;
    if (!raw) return;
    if (!Number.isInteger(n) || n < 0 || n >= D.memberCount) { SC.last = { kind: 'bad', title: `No member with number ${raw}`, sub: 'Check the number on the pass. It starts with R3233.' }; U.rerender(); return; }
    start(D.member(n), 'typed'); U.rerender();
  };
  A['scan-yes'] = el => { const ok = !SC.pending.flags.length; record('ok'); if (ok) U.confetti(...(r => [r.left + r.width / 2, r.top + r.height / 2])(el.getBoundingClientRect())); U.rerender(); };
  A['scan-no'] = () => { record('rejected', ['face']); U.rerender(); };
  I = U.extraInputs; I['scan-away'] = el => { SC.away = el.checked; U.rerender(); };
  A['scan-export'] = () => { const e = D.EVENTS.find(x => x.id === SC.ev); U.download(`${e.id}-check-ins.csv`, [['Number', 'Name', 'Club', 'Time', 'Place', 'Method', 'Scanned by', 'Status', 'Flags', 'Points counted']].concat(scans(e.id).map(x => [x.id, x.name, x.clubName, x.time, x.where, x.method, x.by, x.status, x.flags.map(f => FLAG[f]).join('; '), ptsOf(x)]))); U.toast('List sent. Downloaded for the district desk.'); };

  /* ---------- district review of flagged scans, and random spot checks ---------- */
  const RF = { spot: [] };
  const allScans = () => Object.entries(P.scans || {}).flatMap(([ev, l]) => l.map((x, i) => Object.assign({ ev, i }, x)));
  U.view('review', () => {
    const all = allScans(), held = all.filter(x => x.status === 'review'), rej = all.filter(x => x.status === 'rejected'), flaggedPct = all.length ? Math.round((held.length + rej.length) / all.length * 100) : 0;
    const row = x => `<tr><td><span class="faces"><span class="fc" title="Profile photo">${esc(x.name.split(' ').map(w => w[0]).join(''))}</span><span class="fc ${x.mismatch ? 'diff' : ''}" title="Photo taken at the scan">${x.mismatch ? '?' : esc(x.name.split(' ').map(w => w[0]).join(''))}</span></span><b>${esc(x.name)}</b><small class="sub">${esc(x.clubName)}, ${esc(x.id)}. Profile photo, then the photo taken at the scan</small></td><td>${esc((D.EVENTS.find(e => e.id === x.ev) || {}).name || x.ev)}<small class="sub">${esc(x.time)}, ${esc(x.where)}</small></td><td>${esc(x.by)}</td><td>${x.flags.map(f => `<small class="sub warn-t">${esc(FLAG[f])}</small>`).join('')}</td><td class="r"><button class="btn sm ink" data-act="rv-accept" data-ev="${x.ev}" data-i="${x.i}">Accept</button> <button class="btn sm" data-act="rv-reject" data-ev="${x.ev}" data-i="${x.i}">Reject</button></td></tr>`;
    const spot = RF.spot.map(k => all.find(x => x.ev + '|' + x.i === k)).filter(Boolean);
    return `${head('Attendance review', 'Scans that looked odd wait here, with their points held. Clear them, and spot-check a few clean ones to keep every desk honest.')}
    <div class="stats">${U.fig(all.length, 'Scans so far')}${U.fig(held.length, 'Waiting for you')}${U.fig(rej.length, 'Rejected at the door')}${U.fig(flaggedPct, 'Flagged', 'Of all scans', '', '%')}</div>
    <section class="card"><div class="card-h"><h2>Held scans</h2><span class="muted">Points wait until you accept</span></div>
      ${held.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Event and time</th><th>Scanned by</th><th>Why flagged</th><th><span class="sr">Action</span></th></tr></thead><tbody>${held.map(row).join('')}</tbody></table></div>` : `<div class="empty">${ic('check')}<b>Nothing waiting</b><span>Flagged scans from the scan desks show up here. Try the scan desk as a club sergeant, tap Demo: I am away, and scan.</span></div>`}</section>
    <section class="card"><div class="card-h"><h2>Spot check</h2><button class="btn sm ink" data-act="rv-spot">Pick 5 clean scans</button></div>
      <p class="note">A few accepted scans are picked at random. A District Sergeant walks to the person and confirms they are really there. Clubs know this happens.</p>
      ${spot.length ? `<ul class="kv">${spot.map(x => `<li><span><b>${esc(x.name)}</b><small class="sub">${esc(x.clubName)}, ${esc(x.time)}, by ${esc(x.by)}</small></span><span class="row-btns"><button class="btn sm ink" data-act="rv-seen" data-ev="${x.ev}" data-i="${x.i}">Seen at the event</button><button class="btn sm" data-act="rv-reject" data-spot="1" data-ev="${x.ev}" data-i="${x.i}">Not there</button></span></li>`).join('')}</ul>` : ''}</section>
    ${desks(all)}
    ${rej.length ? `<section class="card"><div class="card-h"><h2>Rejected, possible stand-ins</h2></div><ul class="kv">${rej.map(x => `<li><span><b>${esc(x.name)}</b><small class="sub">${esc(x.clubName)}, ${esc(x.time)}, by ${esc(x.by)}</small><small class="sub warn-t">${esc(x.flags.map(f => FLAG[f]).join('. '))}</small></span>${U.pill('Rejected', 'bad')}</li>`).join('')}</ul><p class="note">The district writes to the club president about repeat cases.</p></section>` : ''}`;
  });
  // Sergeants are checked too: a desk with many flags, or a failed spot check, is audited.
  function desks(all) {
    const by = {};
    all.forEach(x => { const d = (by[x.by] = by[x.by] || { by: x.by, n: 0, flag: 0, rej: 0 }); d.n++; if (x.status === 'review') d.flag++; if (x.status === 'rejected') d.rej++; });
    const rows = Object.values(by).sort((a, b) => (b.flag + b.rej) / b.n - (a.flag + a.rej) / a.n);
    if (!rows.length) return '';
    return `<section class="card"><div class="card-h"><h2>Desks</h2><span class="muted">The sergeants are checked as well</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Scanned by</th><th class="r">Scans</th><th class="r">Held</th><th class="r">Rejected</th><th>Look at</th></tr></thead><tbody>${rows.map(d => { const bad = (d.flag + d.rej) / d.n >= 0.25 || d.rej > 0; return `<tr><td>${esc(d.by)}</td><td class="fig r">${d.n}</td><td class="fig r">${d.flag}</td><td class="fig r">${d.rej}</td><td>${bad ? U.pill('Audit this desk', 'warn') : U.pill('Clean', 'ok')}</td></tr>`; }).join('')}</tbody></table></div><p class="note">A desk with a quarter of its scans flagged, or any rejected, is audited by the DRS. A club that keeps marking stand-ins loses its points for the event and the president is told.</p></section>`;
  }
  const setSt = (el, st) => { const x = P.scans[el.dataset.ev][Number(el.dataset.i)]; x.status = st; if (st === 'rejected' && !x.flags.includes('face')) x.flags.push('face'); save(); U.rerender(); };
  A['rv-accept'] = el => { setSt(el, 'ok'); U.toast('Accepted. The points are counted.'); };
  A['rv-reject'] = el => {
    const x = P.scans[el.dataset.ev][Number(el.dataset.i)];
    if (el.dataset.spot) P.scans[el.dataset.ev].forEach(y => { if (y.by === x.by && y.status === 'ok') { y.status = 'review'; if (!y.flags.includes('batch')) y.flags.push('batch'); } });
    setSt(el, 'rejected');
    U.toast(el.dataset.spot ? `Not there. Every other scan by ${x.by} on this event is now held.` : 'Rejected. The points are removed.', 'info');
  };
  A['rv-seen'] = el => { RF.spot = RF.spot.filter(k => k !== el.dataset.ev + '|' + el.dataset.i); U.rerender(); U.toast('Confirmed present'); };
  A['rv-spot'] = () => { const clean = allScans().filter(x => x.status === 'ok'); RF.spot = clean.sort(() => Math.random() - 0.5).slice(0, 5).map(x => x.ev + '|' + x.i); if (!RF.spot.length) U.toast('No clean scans to check yet', 'info'); U.rerender(); };
})();
