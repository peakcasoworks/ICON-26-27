/* Views and actions added in round 4: DRC bookings (presidents reserve a slot in two taps) and Minutes of Meeting
   (drafted by the secretariat, published to everyone, exported). Both mirror what VIBE already offers. */
(function () {
  const U = UI, { esc, num, ic, P, save } = U;
  const head = (...a) => U.head(...a);
  const A = U.extraActions, F = U.extraForms;
  const cos = () => U.myClub();

  /* =====================================================================
     DRC running order
     The DRR and the district sergeants announce each DRC date. Clubs, district officers, group teams and
     event teams then book a slot with one tap, without picking a time: each booking joins the end of the
     queue, so the list fills in the order people book. The DRR, the District Sergeant-at-Arms and the
     Associate District Sergeant-at-Arms rearrange it; every time follows from the order and the minutes.
     ===================================================================== */
  const MANAGE = ['drr', 'dsgt', 'adsgt'], WATCH = ['drs', 'gco'];
  const BOOKERS = ['pres', 'sec', 'grr', 'grs', 'dir', 'chair'];
  const KIND_MIN = { Club: 5, Group: 5, 'District officer': 5, 'Event team': 10 };
  const MINS = [3, 5, 7, 10, 15, 20];
  const manager = () => MANAGE.includes(U.role());
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const clock = n => { const h = Math.floor(n / 60) % 24, m = n % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };
  const day = d => { const x = new Date(d + 'T00:00'); return `${x.toLocaleDateString('en-IN', { weekday: 'short' })} ${x.getDate()} ${x.toLocaleDateString('en-IN', { month: 'short' })}`; };
  const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const longDay = d => { const x = new Date(d + 'T00:00'); return `${x.toLocaleDateString('en-IN', { weekday: 'long' })} ${x.getDate()} ${x.toLocaleDateString('en-IN', { month: 'long' })} ${x.getFullYear()}`; };

  // Who is booking, from the login: a club, a group's GRR and GRS, a district officer or an event team.
  const booker = () => {
    const r = U.role();
    if (r === 'pres' || r === 'sec') { const c = cos(); return { k: 'c' + c.id, name: c.name, kind: 'Club', by: r === 'pres' ? 'President' : 'Secretary', g: U.groupOf(c) }; }
    if (r === 'grr' || r === 'grs') { const g = U.MY_GROUP; return { k: 'g' + g, name: `Group ${g} team`, kind: 'Group', by: 'GRR and GRS', g }; }
    if (r === 'dir') return { k: 'd-blood', name: U.R().full, kind: 'District officer', by: 'Every drop counts' };
    if (r === 'chair') return { k: 't-ryla', name: 'RYLA team', kind: 'Event team', by: 'RYLA Chairman' };
    return null;
  };

  // Sample meetings: 7 Dec is filling up in the order people booked; 21 Dec has only just opened.
  function seed() {
    const rnd = D.mulberry32(3233);
    const skip = new Set([D.cosmos.id, U.demoClubs()[1].id]);
    const clubsIn = D.clubs.filter(c => c.state === 'Active' && !skip.has(c.id) && c.group !== U.MY_GROUP);
    const pickClubs = n => clubsIn.slice().sort(() => rnd() - 0.5).slice(0, n).map(c => ({ k: 'c' + c.id, name: c.name, kind: 'Club', by: rnd() < 0.6 ? 'President' : 'Secretary', g: c.group }));
    const officers = ['Director, Club Service', 'Director, Community Service', 'Director, Professional Service', 'Director, International Service', 'Chief PRO', 'Chairperson, RIDE'].map((t, i) => ({ k: 'd' + i, name: t, kind: 'District officer', by: t }));
    const teams = [['Assembly team', 'Assembly Chairman'], ['Conference team', 'Conference Chairman'], ['Half-Yearly Awards team', 'Chairperson, Half-Yearly Awards']].map(([n, by], i) => ({ k: 't' + i, name: n, kind: 'Event team', by }));
    const groups = [2, 5].filter(g => g !== U.MY_GROUP).map(g => ({ k: 'g' + g, name: `Group ${g} team`, kind: 'Group', by: 'GRR and GRS', g }));
    const TOPIC = { 'Assembly team': 'Venue, dates and the club quota', 'Conference team': 'Theme reveal and delegate fees', 'Director, Club Service': 'Club installation checklist', 'Chief PRO': 'Reel of the month rules', 'Director, Community Service': 'Marina clean sweep update' };
    const mk = (id, date, start, venue, list) => {
      const q = list.sort(() => rnd() - 0.5).map((b, i) => Object.assign(b, { id: id + '-' + i, n: i + 1, min: KIND_MIN[b.kind], topic: TOPIC[b.name] || '' }));
      return { id, date, start, venue, status: 'open', published: false, changed: false, q, seq: q.length };
    };
    return [
      mk('d1', '2026-12-07', '18:00', 'Rotary Centre, Egmore', pickClubs(13).concat(officers.slice(0, 4), teams.slice(0, 2), groups)),
      mk('d2', '2026-12-21', '18:30', 'Rotary Centre, Egmore', pickClubs(3).concat(officers.slice(4, 5), teams.slice(2)))
    ];
  }
  const meetings = () => { if (!P.drcM) { P.drcM = seed(); save(); } return P.drcM; };
  const DF = { m: null, moved: null };
  const current = () => { const ms = meetings(); return ms.find(x => x.id === DF.m) || ms[0]; };
  const times = m => { let t = toMin(m.start); return m.q.map(b => { const s = t; t += b.min; return s; }); };
  const endOf = m => toMin(m.start) + m.q.reduce((n, b) => n + b.min, 0);
  const touch = m => { if (m.published) m.changed = true; save(); };

  U.drcCount = () => meetings().map(m => m.q.length);
  U.drcRows = () => { const rows = [['Meeting', 'Slot', 'Time', 'Minutes', 'Presenting', 'Kind', 'Booked by', 'Topic']]; meetings().forEach(m => { const ts = times(m); m.q.forEach((b, i) => rows.push([longDay(m.date), i + 1, clock(ts[i]), b.min, b.name, b.kind, b.by, b.topic])); }); return rows; };

  const kindTag = b => b.kind === 'Group' ? U.gpill(b.g) : `<span class="kd" data-k="${esc(b.kind)}">${esc(b.kind)}</span>`;
  const statusPill = m => m.published ? (m.changed ? U.pill('Changes not published', 'warn') : U.pill('Order published', 'ok')) : m.status === 'open' ? U.pill('Booking open', 'neutral') : U.pill('Booking closed', 'warn');
  const meetChips = m => `<div class="chips" aria-label="Meeting">${meetings().map(x => `<button class="chip${x.id === m.id ? ' on' : ''}" data-act="drc-m" data-v="${x.id}" aria-pressed="${x.id === m.id}">DRC, ${esc(day(x.date))}</button>`).join('')}</div>`;

  function managerRow(m, b, i, t) {
    const opt = (v, sel, label) => `<option value="${v}"${v === sel ? ' selected' : ''}>${label}</option>`;
    return `<li class="dq-row${DF.moved === b.id ? ' moved' : ''}" data-flip-id="${b.id}" data-i="${i}">
      <button class="dq-grip" type="button" aria-label="Move ${esc(b.name)}. Drag, or use the arrow keys" data-m="${m.id}" data-i="${i}">${ic('menu')}</button>
      <span class="dq-pos fig">${i + 1}</span>
      <span class="dq-time fig">${clock(t)}</span>
      <span class="dq-who"><b>${esc(b.name)}</b><small>${kindTag(b)} <span>Booked ${ordinal(b.n)}${b.by !== b.name ? ' by ' + esc(b.by) : ''}</span>${b.topic ? `<span class="dq-topic">${esc(b.topic)}</span>` : ''}</small></span>
      <span class="dq-ctl">
        <label class="sel dq-min"><span class="sr">Minutes for ${esc(b.name)}</span><select data-on="drc-min" data-m="${m.id}" data-i="${i}">${MINS.concat(MINS.includes(b.min) ? [] : [b.min]).sort((a, z) => a - z).map(v => opt(v, b.min, v + ' min')).join('')}</select></label>
        <label class="sel dq-to"><span class="sr">Move ${esc(b.name)} to slot</span><select data-on="drc-to" data-m="${m.id}" data-i="${i}">${m.q.map((_, j) => opt(j, i, 'Slot ' + (j + 1))).join('')}</select></label>
        <button class="icon-btn sm" type="button" aria-label="Move ${esc(b.name)} up" data-act="drc-up" data-m="${m.id}" data-i="${i}" ${i === 0 ? 'disabled' : ''}>${ic('chev', 'up')}</button>
        <button class="icon-btn sm" type="button" aria-label="Move ${esc(b.name)} down" data-act="drc-down" data-m="${m.id}" data-i="${i}" ${i === m.q.length - 1 ? 'disabled' : ''}>${ic('chev')}</button>
        <button class="icon-btn sm" type="button" aria-label="Remove ${esc(b.name)}" data-act="drc-rm" data-m="${m.id}" data-i="${i}">${ic('x')}</button>
      </span></li>`;
  }
  const plainRow = (b, i, t, mineId) => `<li class="dq-row ro${b.id === mineId ? ' mine' : ''}"><span class="dq-pos fig">${i + 1}</span><span class="dq-time fig">${clock(t)}</span><span class="dq-who"><b>${esc(b.name)}</b><small>${kindTag(b)} <span>${b.min} min</span>${b.topic ? `<span class="dq-topic">${esc(b.topic)}</span>` : ''}</small></span></li>`;

  function managerView() {
    const m = current(), ts = times(m), n = m.q.length;
    const count = k => m.q.filter(b => b.kind === k).length;
    const acts = `<button class="btn ink" data-act="drc-new">${ic('plus')}Announce a DRC</button><button class="btn" data-act="drc-export">${ic('upload')}Export</button>`;
    const edit = manager();
    return `${head('DRC running order', edit ? 'Each booking joins the queue in the order it came in. Drag a row, or pick its slot, to set who presents when. Times follow.' : 'The DRR and the district sergeants set the order. This is where it stands.', edit ? acts : (U.can.exportAll() ? `<button class="btn" data-act="drc-export">${ic('upload')}Export</button>` : ''))}
    ${meetChips(m)}
    <section class="card dq-meet"><div class="card-h"><h2>${esc(longDay(m.date))}</h2>${statusPill(m)}</div>
      <p class="note">${esc(m.venue)}. Starts ${clock(toMin(m.start))}, runs to about ${clock(endOf(m))}.</p>
      ${edit ? `<div class="row-btns">
        ${!m.published || m.changed ? `<button class="btn ink" data-act="drc-publish" data-m="${m.id}" ${n ? '' : 'disabled'}>${ic('send')}${m.published ? 'Publish changes' : 'Publish the order'}</button>` : ''}
        <button class="btn" data-act="drc-open" data-m="${m.id}">${ic(m.status === 'open' ? 'lock' : 'circle')}${m.status === 'open' ? 'Close booking' : 'Reopen booking'}</button>
        <button class="btn" data-act="drc-shuffle" data-m="${m.id}" ${n > 1 ? '' : 'disabled'}>${ic('swap')}Shuffle</button>
        <button class="btn" data-act="drc-edit" data-m="${m.id}">${ic('pen')}Date and time</button></div>` : ''}</section>
    <div class="stats">${U.fig(n, 'Slots booked')}${U.fig(count('Club'), 'Clubs')}${U.fig(count('District officer') + count('Group'), 'Officers and groups')}${U.fig(count('Event team'), 'Event teams')}</div>
    <section class="card"><div class="card-h"><h2>Running order</h2><span class="muted">${n} slots, ${endOf(m) - toMin(m.start)} min</span></div>
      ${n ? `<ol class="dq${edit ? '' : ' ro'}" data-m="${m.id}">${m.q.map((b, i) => edit ? managerRow(m, b, i, ts[i]) : plainRow(b, i, ts[i])).join('')}</ol>` : `<div class="empty">${ic('calendar')}<b>No bookings yet</b><span>Clubs, officers and teams book from their own login once the date is announced.</span></div>`}
    </section>`;
  }

  function bookerView() {
    const me = booker(), ms = meetings();
    const card = m => {
      const i = me ? m.q.findIndex(b => b.k === me.k) : -1, ts = times(m), mine = m.q[i];
      let body;
      if (mine) {
        body = `<div class="callout ok">${ic('check')}<p>${m.published && !m.changed ? `Final order: you present <b>slot ${i + 1} of ${m.q.length}</b>, at <b>${clock(ts[i])}</b> for ${mine.min} minutes.` : `You are <b>number ${i + 1} of ${m.q.length}</b> so far, around <b>${clock(ts[i])}</b>. The sergeant may still move slots before publishing the order.`}</p></div>
          ${m.status === 'open' ? `<div class="row-btns"><button class="btn sm" data-act="drc-cancel" data-m="${m.id}">Cancel my booking</button></div>` : ''}`;
      } else if (!me) {
        body = `<p class="note">Your president or secretary books the club's slot.</p>`;
      } else if (m.status === 'open') {
        body = `<form class="form dq-book" data-form="drc-book" data-m="${m.id}">
          <label class="field" for="dqT${m.id}"><span>What you will present, optional</span><input id="dqT${m.id}" name="topic" maxlength="80" placeholder="${me.kind === 'Club' ? 'Our flagship project this month' : 'An update for every club'}"></label>
          <div class="form-act"><button class="btn ink" type="submit">${ic('plus')}Book a slot for ${esc(me.name)}</button><span class="muted">You join the queue at number ${m.q.length + 1}. No time to pick.</span></div></form>`;
      } else body = `<div class="callout">${ic('lock')}<p>Booking for this DRC is closed. Ask the District Sergeant-at-Arms if you still need a slot.</p></div>`;
      const showOrder = m.published && !m.changed;
      return `<section class="card dq-meet"><div class="card-h"><h2>DRC, ${esc(longDay(m.date))}</h2>${statusPill(m)}</div>
        <p class="note">${esc(m.venue)}. Starts ${clock(toMin(m.start))}. ${m.q.length} slots booked.</p>${body}
        ${showOrder ? `<details class="dq-all"><summary>See the full running order</summary><ol class="dq ro">${m.q.map((b, j) => plainRow(b, j, ts[j], mine && mine.id)).join('')}</ol></details>` : ''}</section>`;
    };
    return `${head('DRC bookings', 'The DRR and the District Sergeant-at-Arms set each DRC date. Book your slot and you join the running order. They arrange the final order and the times.')}
      ${ms.length ? ms.map(card).join('') : `<section class="card"><div class="empty">${ic('calendar')}<b>No DRC announced yet</b><span>You will get a notification when the next date is set.</span></div></section>`}`;
  }

  U.view('drc', () => MANAGE.includes(U.role()) || WATCH.includes(U.role()) ? managerView() : bookerView());

  /* ---------- reordering ---------- */
  const byId = id => meetings().find(x => x.id === id);
  // Rows glide to their new places: Flip records where they were, the page redraws, Flip animates the change.
  function reorder(m, from, to, flip = true) {
    if (to < 0 || to >= m.q.length || to === from) return;
    const Fl = window.MO && window.MO.Flip, st = flip && Fl && !U.calm() ? Fl.getState('.dq-row') : null;
    const [b] = m.q.splice(from, 1); m.q.splice(to, 0, b);
    DF.moved = b.id; touch(m); U.rerender();
    if (st) Fl.from(st, { targets: '.dq-row', duration: 0.45, ease: 'power3.inOut' });
    const g = document.querySelector(`.dq-row[data-flip-id="${b.id}"] .dq-grip`);
    return g;
  }
  A['drc-m'] = el => { DF.m = el.dataset.v; DF.moved = null; U.rerender(); };
  A['drc-up'] = el => reorder(byId(el.dataset.m), +el.dataset.i, +el.dataset.i - 1);
  A['drc-down'] = el => reorder(byId(el.dataset.m), +el.dataset.i, +el.dataset.i + 1);
  U.extraInputs['drc-to'] = el => reorder(byId(el.dataset.m), +el.dataset.i, +el.value);
  U.extraInputs['drc-min'] = el => { const m = byId(el.dataset.m); m.q[+el.dataset.i].min = +el.value; touch(m); U.rerender(); };
  A['drc-shuffle'] = el => {
    const m = byId(el.dataset.m), Fl = window.MO && window.MO.Flip, st = Fl && !U.calm() ? Fl.getState('.dq-row') : null;
    for (let i = m.q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m.q[i], m.q[j]] = [m.q[j], m.q[i]]; }
    DF.moved = null; touch(m); U.rerender();
    if (st) Fl.from(st, { targets: '.dq-row', duration: 0.6, ease: 'power3.inOut', stagger: 0.01 });
    U.toast('Order shuffled. Move any slot you want fixed.', 'info');
  };
  A['drc-rm'] = el => { const m = byId(el.dataset.m), b = m.q[+el.dataset.i]; U.sheet(`<h2 class="sh-h">Remove ${esc(b.name)}?</h2><p class="note">They drop out of the running order for ${esc(longDay(m.date))} and get a notification. They can book again while booking is open.</p><div class="row-btns"><button class="btn ink" data-act="drc-rm-yes" data-m="${m.id}" data-id="${b.id}">Remove</button><button class="btn" data-act="close">Keep</button></div>`); };
  A['drc-rm-yes'] = el => { const m = byId(el.dataset.m); m.q = m.q.filter(b => b.id !== el.dataset.id); touch(m); U.closeSheet(); U.rerender(); U.toast('Removed from the running order', 'info'); };
  A['drc-open'] = el => { const m = byId(el.dataset.m); m.status = m.status === 'open' ? 'closed' : 'open'; save(); U.rerender(); U.toast(m.status === 'open' ? 'Booking is open again' : 'Booking closed. Nobody new can join.', 'info'); };
  A['drc-publish'] = el => {
    const m = byId(el.dataset.m), ts = times(m);
    m.published = true; m.changed = false; m.status = 'closed'; save();
    const at = k => { const i = m.q.findIndex(b => b.k === k); return i < 0 ? null : `slot ${i + 1}, ${clock(ts[i])}`; };
    const club = at('c' + cos().id), grp = at('g' + U.MY_GROUP);
    [['pres', club], ['sec', club], ['grr', grp], ['grs', grp], ['dir', at('d-blood')], ['chair', at('t-ryla')]].forEach(([r, s]) => U.notify(r, `The running order for the DRC on ${day(m.date)} is out.${s ? ' You present at ' + s + '.' : ''}`, 'drc'));
    U.confetti(...(r => [r.left + r.width / 2, r.top + r.height / 2])(el.getBoundingClientRect()));
    U.rerender(); U.toast('Published. Everyone who booked can see their time.');
  };
  A['drc-cancel'] = el => { const m = byId(el.dataset.m), me = booker(); m.q = m.q.filter(b => b.k !== me.k); touch(m); U.rerender(); U.toast('Booking cancelled', 'info'); };
  A['drc-export'] = () => { U.download('drc-running-order.csv', U.drcRows()); U.toast('Running order downloaded'); };
  F['drc-book'] = f => {
    const m = byId(f.dataset.m), me = booker();
    if (!me || m.status !== 'open' || m.q.some(b => b.k === me.k)) return;
    m.seq += 1;
    m.q.push(Object.assign({}, me, { id: m.id + '-' + m.seq, n: m.seq, min: KIND_MIN[me.kind], topic: (new FormData(f).get('topic') || '').trim() }));
    touch(m);
    MANAGE.forEach(r => U.notify(r, `${me.name} booked a slot at the DRC on ${day(m.date)}. They are number ${m.q.length}.`, 'drc'));
    const btn = f.querySelector('[type=submit]');
    U.confetti(...(r => [r.left + r.width / 2, r.top + r.height / 2])(btn.getBoundingClientRect()));
    U.rerender(); U.toast(`Booked. You are number ${m.q.length}, around ${clock(times(m)[m.q.length - 1])}.`);
  };

  // Announce or edit a DRC: the date, the start time and the venue. Bookers are told when a new one opens.
  const meetForm = m => {
    const x = m || { date: '2027-01-11', start: '18:00', venue: 'Rotary Centre, Egmore' };
    U.sheet(`<h2 class="sh-h">${m ? 'Date and time' : 'Announce a DRC'}</h2><form class="form" data-form="drc-meet" data-id="${m ? m.id : ''}">
      <div class="field-row"><label class="field" for="dqD"><span>Date</span><input id="dqD" name="date" type="date" required value="${esc(x.date)}"></label>
      <label class="field" for="dqS"><span>Starts at</span><input id="dqS" name="start" type="time" required value="${esc(x.start)}"></label></div>
      <label class="field" for="dqV"><span>Venue</span><input id="dqV" name="venue" required value="${esc(x.venue)}"></label>
      <div class="form-act"><button class="btn ink" type="submit">${m ? 'Save' : 'Announce and open booking'}</button><span class="muted">${m ? 'Times in the running order move with the start.' : 'Every club, officer and team gets a notification.'}</span></div></form>`);
  };
  A['drc-new'] = () => meetForm();
  A['drc-edit'] = el => meetForm(byId(el.dataset.m));
  F['drc-meet'] = f => {
    const d = new FormData(f), id = f.dataset.id, rec = { date: d.get('date'), start: d.get('start'), venue: (d.get('venue') || '').trim() };
    if (!rec.date || !rec.start) return;
    if (id) { Object.assign(byId(id), rec); touch(byId(id)); }
    else {
      const m = Object.assign({ id: 'd' + Date.now(), status: 'open', published: false, changed: false, q: [], seq: 0 }, rec);
      meetings().push(m); meetings().sort((a, z) => a.date.localeCompare(z.date)); DF.m = m.id; save();
      BOOKERS.forEach(r => U.notify(r, `A DRC is set for ${day(m.date)}. Book your slot.`, 'drc'));
    }
    U.closeSheet(); U.rerender(); U.toast(id ? 'Saved' : 'Announced. Booking is open.');
  };

  // Drag a row by its handle. Rows in between slide aside while you drag; the order is saved on release.
  document.addEventListener('pointerdown', e => {
    const grip = e.target.closest('.dq-grip');
    if (!grip || e.button > 0) return;
    const list = grip.closest('.dq'), row = grip.closest('.dq-row'), rows = [...list.children], from = rows.indexOf(row);
    if (from < 0 || rows.length < 2) return;
    e.preventDefault();
    try { grip.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
    const rects = rows.map(r => r.getBoundingClientRect()), gap = rects[1].top - rects[0].bottom, h = rects[from].height + gap;
    const y0 = e.clientY, s0 = window.scrollY;
    let to = from;
    row.classList.add('lifting'); list.classList.add('dragging');
    const move = ev => {
      const dy = ev.clientY - y0 + window.scrollY - s0, mid = rects[from].top + rects[from].height / 2 + dy;
      row.style.transform = `translateY(${dy}px)`;
      to = rects.reduce((n, r, i) => n + (i !== from && r.top + r.height / 2 < mid ? 1 : 0), 0);
      rows.forEach((r, i) => { if (i === from) return; const s = from < to && i > from && i <= to ? -h : from > to && i >= to && i < from ? h : 0; r.style.transform = s ? `translateY(${s}px)` : ''; });
      if (ev.clientY < 70) window.scrollBy(0, -10); else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 10);
    };
    const up = () => {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
      rows.forEach(r => { r.style.transform = ''; }); row.classList.remove('lifting'); list.classList.remove('dragging');
      if (to !== from) reorder(byId(list.dataset.m), from, to, false);
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  });
  // Keyboard: focus a handle and press the up or down arrow to move that slot.
  document.addEventListener('keydown', e => {
    const grip = e.target.closest && e.target.closest('.dq-grip');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const i = +grip.dataset.i, g = reorder(byId(grip.dataset.m), i, i + (e.key === 'ArrowUp' ? -1 : 1));
    if (g) g.focus();
  });

  /* =====================================================================
     Minutes of Meeting
     ===================================================================== */
  const KINDS = ['DRC', 'Board', 'Committee', 'Event review'];
  const SEED = [
    { id: 'm-sep', title: 'DRC, September', kind: 'DRC', date: '2026-09-07', present: 58, status: 'published', by: 'District Rotaract Secretary',
      agenda: ['Welcome and attendance', 'Reports for August: on-time rate', 'JOSH District Culturals plan', 'DRR official visit schedule'],
      decisions: ['JOSH will be held on 21 September at the agreed venue.', 'Official visits are booked by clubs through the platform.'],
      actions: [['Share the JOSH rules with all clubs', 'Chairperson, JOSH', '2026-09-10'], ['Open official visit slots for November', 'District Rotaract Secretary', '2026-09-15']] },
    { id: 'm-oct', title: 'DRC, October', kind: 'DRC', date: '2026-10-05', present: 61, status: 'published', by: 'District Rotaract Secretary',
      agenda: ['Welcome and attendance', 'September report status', 'Blood Donation Megacamp results', 'RYLA registration'],
      decisions: ['RYLA seats are allotted per group and spread by each GRR and GRS.', 'Late reports are accepted with reduced points.'],
      actions: [['Open RYLA seat pools for the groups', 'DRR', '2026-10-12'], ['Remind clubs of the 5th-of-month report date', 'Group Coordinator', '2026-10-30']] }
  ];
  const moms = () => SEED.concat(P.moms || []);
  const canWrite = () => ['drs', 'drr'].includes(U.role());
  const visible = x => x.status === 'published' || canWrite();
  const fmt = d => { const t = new Date(d + 'T00:00:00'); return isNaN(t) ? d : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const MF = { st: 'all' };

  U.view('mom', () => {
    const list = moms().filter(visible), pub = list.filter(x => x.status === 'published').length;
    const chip = (v, l) => `<button class="chip${MF.st === v ? ' on' : ''}" data-act="mom-f" data-v="${v}" aria-pressed="${MF.st === v}">${l}</button>`;
    const shown = list.filter(x => MF.st === 'all' || x.status === MF.st).sort((a, b) => b.date.localeCompare(a.date));
    return `${head('Minutes of Meeting', 'Official minutes of district meetings. The secretariat drafts them, publishes them to everyone, and anyone can export them.', canWrite() ? `<button class="btn ink" data-act="mom-new">${ic('plus')}New minutes</button>` : '')}
    ${canWrite() ? `<div class="chips">${chip('all', 'All')}${chip('draft', 'Drafts')}${chip('published', 'Published')}</div>` : ''}
    <div class="ev-grid">${shown.map(x => `<button class="ev-card" data-go="momdoc" data-arg="${x.id}"><span class="ev-top"><span class="ev-kind">${esc(x.kind)}</span>${U.pill(x.status === 'published' ? 'Published' : 'Draft', x.status === 'published' ? 'ok' : 'warn')}</span><b class="ev-name">${esc(x.title)}</b><span class="ev-when">${esc(fmt(x.date))}</span><span class="ev-res fig">${x.decisions.length} decisions, ${x.actions.length} actions</span></button>`).join('') || `<div class="card"><div class="empty">${ic('doc')}<b>No minutes yet</b></div></div>`}</div>
    <p class="note">${pub} published. ${canWrite() ? 'Drafts are visible to the secretariat only until you publish.' : 'Each action has an owner and a date.'}</p>`;
  });
  U.view('momdoc', arg => {
    const x = moms().find(m => m.id === arg);
    if (!x || !visible(x)) return `${head('Minutes', 'Not available.')}<section class="card"><div class="empty">${ic('lock')}<b>These minutes are not published yet</b><button class="btn sm" data-go="mom">Back to minutes</button></div></section>`;
    const edit = canWrite() && x.status === 'draft';
    return `${head(esc(x.title), `${esc(x.kind)} meeting, ${esc(fmt(x.date))}. ${x.status === 'published' ? 'Published' : 'Draft'} by the ${esc(x.by)}.`, `<button class="btn" data-go="mom">${ic('left')}All minutes</button><button class="btn" data-act="mom-export" data-id="${x.id}">${ic('upload')}Export</button><button class="btn" data-act="mom-print">${ic('doc')}Print or save as PDF</button>${edit ? `<button class="btn" data-act="mom-edit" data-id="${x.id}">${ic('pen')}Edit</button><button class="btn ink" data-act="mom-publish" data-id="${x.id}">${ic('send')}Publish</button>` : ''}`)}
    <article class="card mom-doc">
      <div class="stats flat"><div class="stat"><span class="st-l">Status</span><b class="st-v">${U.pill(x.status === 'published' ? 'Published' : 'Draft', x.status === 'published' ? 'ok' : 'warn')}</b></div>${U.fig(x.present, 'Clubs present')}${U.fig(x.agenda.length, 'Agenda items')}${U.fig(x.actions.length, 'Action items')}</div>
      <h3 class="sub-h">Agenda</h3><ol class="mom-l">${x.agenda.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <h3 class="sub-h">Decisions</h3><ul class="mom-l">${x.decisions.map(t => `<li>${esc(t)}</li>`).join('') || '<li class="muted">None recorded.</li>'}</ul>
      <h3 class="sub-h">Action items</h3>
      ${x.actions.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Action</th><th>Owner</th><th>Due</th></tr></thead><tbody>${x.actions.map(a => `<tr><td>${esc(a[0])}</td><td>${esc(a[1])}</td><td class="fig">${esc(fmt(a[2]))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">None recorded.</p>'}
    </article>`;
  });
  A['mom-f'] = el => { MF.st = el.dataset.v; U.rerender(); };
  A['mom-print'] = () => window.print();
  const lines = t => (t || '').split('\n').map(x => x.trim()).filter(Boolean);
  const form = x => {
    x = x || { title: '', kind: 'DRC', date: new Date().toISOString().slice(0, 10), present: 0, agenda: [], decisions: [], actions: [] };
    const chips = `<div class="chips" role="radiogroup">${KINDS.map(k => `<button type="button" class="chip${k === x.kind ? ' on' : ''}" role="radio" aria-checked="${k === x.kind}" data-act="pick" data-name="kind" data-v="${k}">${k}</button>`).join('')}<input type="hidden" name="kind" value="${esc(x.kind)}"></div>`;
    U.sheet(`<h2 class="sh-h">${x.id ? 'Edit minutes' : 'New minutes'}</h2><form data-form="mom" data-id="${x.id || ''}" class="form">
      <label class="field" for="mmT"><span>Title</span><input id="mmT" name="title" required value="${esc(x.title)}" placeholder="DRC, December" autofocus></label>
      <fieldset class="field"><legend>Kind of meeting</legend>${chips}</fieldset>
      <div class="field-row"><label class="field" for="mmD"><span>Date</span><input id="mmD" name="date" type="date" value="${esc(x.date)}"></label><label class="field" for="mmP"><span>Clubs present</span><input id="mmP" name="present" type="number" min="0" value="${x.present}"></label></div>
      <label class="field" for="mmA"><span>Agenda, one item per line</span><textarea id="mmA" name="agenda" rows="4">${esc(x.agenda.join('\n'))}</textarea></label>
      <label class="field" for="mmDe"><span>Decisions, one per line</span><textarea id="mmDe" name="decisions" rows="4">${esc(x.decisions.join('\n'))}</textarea></label>
      <label class="field" for="mmAc"><span>Action items, one per line: what | who | due date (YYYY-MM-DD)</span><textarea id="mmAc" name="actions" rows="4" placeholder="Share the JOSH rules | Chairperson, JOSH | 2026-09-10">${esc(x.actions.map(a => a.join(' | ')).join('\n'))}</textarea></label>
      <div class="form-act"><button class="btn ink" type="submit">Save draft</button><span class="muted">Nobody else sees it until you publish.</span></div></form>`, { wide: true });
  };
  A['mom-new'] = () => form();
  A['mom-edit'] = el => form(P.moms.find(m => m.id === el.dataset.id));
  F.mom = f => {
    const d = new FormData(f), id = f.dataset.id;
    const rec = { title: (d.get('title') || '').trim(), kind: d.get('kind') || 'DRC', date: d.get('date') || new Date().toISOString().slice(0, 10), present: Number(d.get('present')) || 0, agenda: lines(d.get('agenda')), decisions: lines(d.get('decisions')), actions: lines(d.get('actions')).map(l => { const p = l.split('|').map(x => x.trim()); return [p[0] || '', p[1] || 'Not assigned', p[2] || '']; }) };
    if (!rec.title) return;
    P.moms = P.moms || [];
    if (id) Object.assign(P.moms.find(m => m.id === id), rec);
    else P.moms.push(Object.assign({ id: 'm' + Date.now(), status: 'draft', by: U.R().full }, rec));
    save(); U.closeSheet();
    const at = id || P.moms[P.moms.length - 1].id;
    U.go('momdoc', at); U.toast('Draft saved');
  };
  A['mom-publish'] = el => {
    const x = P.moms.find(m => m.id === el.dataset.id);
    U.sheet(`<h2 class="sh-h">Publish these minutes?</h2><p class="note">Every club and official will see ${esc(x.title)}. You can still export it. Published minutes cannot be edited, so check the decisions and action owners first.</p><div class="row-btns"><button class="btn ink" data-act="mom-publish-yes" data-id="${x.id}">Publish</button><button class="btn" data-act="close">Not yet</button></div>`);
  };
  A['mom-publish-yes'] = el => {
    const x = P.moms.find(m => m.id === el.dataset.id); x.status = 'published'; save();
    ['pres', 'sec', 'grr', 'grs'].forEach(r => U.notify(r, `${x.title} minutes are published.`, 'momdoc-' + x.id));
    U.closeSheet(); U.rerender(); U.toast('Published. Everyone can read it now.');
  };
  const asText = x => `# ${x.title}\n\n${x.kind} meeting, ${fmt(x.date)}\nClubs present: ${x.present}\nStatus: ${x.status}\n\n## Agenda\n${x.agenda.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n## Decisions\n${x.decisions.map(t => `- ${t}`).join('\n') || '- None recorded'}\n\n## Action items\n${x.actions.map(a => `- ${a[0]} (${a[1]}, due ${fmt(a[2])})`).join('\n') || '- None recorded'}\n`;
  A['mom-export'] = el => {
    const x = moms().find(m => m.id === el.dataset.id), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([asText(x)], { type: 'text/markdown;charset=utf-8' }));
    a.download = x.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-minutes.md';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    U.toast('Minutes downloaded');
  };
  U.momRows = () => [['Title', 'Kind', 'Date', 'Status', 'Clubs present', 'Decisions', 'Action items']].concat(moms().filter(x => x.status === 'published').map(x => [x.title, x.kind, x.date, x.status, x.present, x.decisions.length, x.actions.length]));
})();
