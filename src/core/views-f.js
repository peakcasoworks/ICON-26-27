/* Views and actions added in round 4: DRC bookings (presidents reserve a slot in two taps) and Minutes of Meeting
   (drafted by the secretariat, published to everyone, exported). Both mirror what VIBE already offers. */
(function () {
  const U = UI, { esc, num, ic, P, save } = U;
  const head = (...a) => U.head(...a);
  const A = U.extraActions, F = U.extraForms;
  const cos = () => U.myClub();

  /* =====================================================================
     DRC bookings
     ===================================================================== */
  const MEETINGS = [
    { id: 'dec', name: 'DRC, December', date: '7 Dec 2026', dow: 'Monday' },
    { id: 'jan', name: 'DRC, January', date: '11 Jan 2027', dow: 'Monday' },
    { id: 'feb', name: 'DRC, February', date: '8 Feb 2027', dow: 'Monday' }
  ];
  const CAP = 5;
  const SLOTS = Array.from({ length: 16 }, (_, i) => { const m = 9 * 60 + i * 15, h = Math.floor(m / 60); return `${h > 12 ? h - 12 : h}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; });
  // Some clubs have booked already, so the page is not empty. The demo's own clubs start unbooked.
  const BASE = {};
  MEETINGS.forEach((m, mi) => {
    const load = SLOTS.map(() => 0), map = {};
    D.clubs.forEach(c => {
      if (c === D.cosmos || c === U.demoClubs()[1] || (c.id * 7 + mi * 3) % 10 >= 4) return;
      let s = (c.id * 5 + mi) % SLOTS.length;
      for (let k = 0; k < SLOTS.length && load[s] >= CAP; k++) s = (s + 1) % SLOTS.length;
      if (load[s] < CAP) { load[s]++; map[c.id] = s; }
    });
    BASE[m.id] = map;
  });
  const slotOf = (m, c) => { const o = P.drc && P.drc[m.id] && P.drc[m.id][c.id]; return o === undefined ? BASE[m.id][c.id] : o === null ? undefined : o; };
  const clubsAt = (m, s) => U.activeClubs().filter(c => slotOf(m, c) === s);
  const DF = { m: 'dec' };
  U.drcCount = () => MEETINGS.map(m => U.activeClubs().filter(c => slotOf(m, c) !== undefined).length);
  U.drcRows = () => { const rows = [['Meeting', 'Date', 'Time', 'Club', 'Group']]; MEETINGS.forEach(m => SLOTS.forEach((t, s) => clubsAt(m, s).forEach(c => rows.push([m.name, m.date, t, c.name, 'Group ' + U.groupOf(c)])))); return rows; };

  U.view('drc', () => {
    const m = MEETINGS.find(x => x.id === DF.m) || MEETINGS[0], me = cos(), mine = slotOf(m, me);
    const book = U.role() === 'pres', lvl = U.level();
    const chips = `<div class="chips" aria-label="Meeting">${MEETINGS.map(x => `<button class="chip${x.id === m.id ? ' on' : ''}" data-act="drc-m" data-v="${x.id}" aria-pressed="${x.id === m.id}">${esc(x.name)}</button>`).join('')}</div>`;
    const total = U.activeClubs().length, booked = U.activeClubs().filter(c => slotOf(m, c) !== undefined).length;
    if (U.level() === 'club') {
      return `${head('DRC bookings', book ? 'Reserve your club\'s slot at the District Rotaract Council. Pick the meeting, then the time. Two taps.' : 'Your president reserves the club\'s slot. You can see where it stands.')}
      ${chips}
      ${mine !== undefined ? `<section class="card callout ok">${ic('check')}<p>${esc(me.name)} is booked for <b>${esc(m.date)}, ${SLOTS[mine]}</b>. Send your president and secretary.</p>${book ? `<button class="btn sm" data-act="drc-cancel" data-m="${m.id}">Cancel booking</button>` : ''}</section>` : `<section class="card callout">${ic('alert')}<p>${esc(me.name)} has not booked ${esc(m.name)} yet.${book ? '' : ' Ask your president.'}</p></section>`}
      <section class="card"><div class="card-h"><h2>${esc(m.name)}, ${esc(m.dow)} ${esc(m.date)}</h2><span class="muted fig">${booked} of ${total} clubs booked</span></div>
        <div class="slot-grid">${SLOTS.map((t, s) => { const n = clubsAt(m, s).length, full = n >= CAP && mine !== s, own = mine === s; return `<button class="slot-b${own ? ' mine' : ''}${full ? ' full' : ''}" ${book && !full && !own ? `data-act="drc-book" data-m="${m.id}" data-s="${s}"` : 'disabled'}><b class="fig">${t}</b><small>${own ? 'Your club' : full ? 'Full' : (CAP - n) + ' of ' + CAP + ' left'}</small></button>`; }).join('')}</div>
        ${book ? `<p class="note">${mine !== undefined ? 'Tap another time to move your booking.' : 'Tap a time to book it.'}</p>` : ''}</section>`;
    }
    return `${head('DRC bookings', 'Presidents reserve their club\'s slot at each District Rotaract Council meeting. Here is who booked what.', U.can.exportAll() ? `<button class="btn" data-act="drc-export">${ic('upload')}Export bookings</button>` : '')}
    ${chips}
    <div class="stats">${U.fig(booked, 'Clubs booked', `of ${total}`)}${U.fig(total - booked, 'Not booked yet')}${U.fig(SLOTS.filter((_, s) => clubsAt(m, s).length).length, 'Time slots in use', `of ${SLOTS.length}`)}${U.fig(CAP, 'Clubs per slot')}</div>
    <section class="card"><div class="card-h"><h2>${esc(m.name)}, ${esc(m.date)}</h2></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Clubs</th><th class="r">Booked</th></tr></thead><tbody>${SLOTS.map((t, s) => { const cs = clubsAt(m, s), shown = cs.filter(U.canSeeClub); return `<tr><td class="fig">${t}</td><td>${shown.length ? shown.map(c => esc(c.name)).join(', ') : '<span class="muted">None</span>'}${cs.length > shown.length ? ` <small class="sub">and ${cs.length - shown.length} from other groups</small>` : ''}</td><td class="fig r">${cs.length} of ${CAP}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  });
  A['drc-m'] = el => { DF.m = el.dataset.v; U.rerender(); };
  A['drc-book'] = el => {
    const m = MEETINGS.find(x => x.id === el.dataset.m), s = Number(el.dataset.s), me = cos();
    if (clubsAt(m, s).length >= CAP) return;
    P.drc = P.drc || {}; (P.drc[m.id] = P.drc[m.id] || {})[me.id] = s; save();
    U.notify('drs', `${me.name} booked ${m.name} at ${SLOTS[s]}.`, 'drc');
    U.confetti(...(r => [r.left + r.width / 2, r.top + r.height / 2])(el.getBoundingClientRect()));
    U.rerender(); U.toast(`Booked ${m.name}, ${SLOTS[s]}`);
  };
  A['drc-cancel'] = el => { const m = MEETINGS.find(x => x.id === el.dataset.m); P.drc = P.drc || {}; (P.drc[m.id] = P.drc[m.id] || {})[cos().id] = null; save(); U.rerender(); U.toast('Booking cancelled', 'info'); };
  A['drc-export'] = () => { U.download('drc-bookings.csv', U.drcRows()); U.toast('DRC bookings downloaded'); };

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
