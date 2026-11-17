/* Wiring: one click, input and submit listener for the whole app, the loader, and boot. */
(function () {
  const U = UI, { $, $$, esc, num, inr, ic, P, save } = U;
  const cos = () => D.cosmos;
  const stack = [];
  const go = (v, arg) => { stack.push(U.cur()); if (stack.length > 30) stack.shift(); U.go(v, arg); };
  const rerender = () => U.render({ instant: true, keepScroll: true });
  const roleLabel = r => U.ROLES[r].label;
  const notify = (role, t, goTo) => { P.extraNotifs.unshift({ role, t, go: goTo }); P.extraNotifs = P.extraNotifs.slice(0, 12); save(); };
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  (P.events || []).forEach(e => { if (!D.EVENTS.find(x => x.id === e.id)) D.EVENTS.push(e); });

  const chipRow = (name, opts, on) => `<div class="chips" role="radiogroup">${opts.map(o => `<button type="button" class="chip${o === on ? ' on' : ''}" role="radio" aria-checked="${o === on}" data-act="pick" data-name="${name}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}<input type="hidden" name="${name}" value="${esc(on || '')}"></div>`;

  /* ---------- actions ---------- */
  const A = {
    'pick-role'(el) { P.role = el.dataset.role; save(); U.closeSheet(); stack.length = 0; U.go('home'); U.toast('Viewing as ' + roleLabel(P.role)); },
    roles() {
      U.sheet(`<h2 class="sh-h">Switch role</h2><p class="note">Same demo, different seat. Try sending a report as the secretary, then switch to the president and the GRR.</p>
        <div class="role-list">${Object.keys(U.ROLES).map(id => `<button class="role-card${P.role === id ? ' on' : ''}" data-act="pick-role" data-role="${id}"><span class="avatar">${ic(U.ROLES[id].icon)}</span><span class="rc-t"><b>${esc(U.ROLES[id].label)}</b><small>${esc(U.ROLES[id].full)}</small></span></button>`).join('')}</div>
        <button class="btn full" data-act="landing">Back to the start page</button>`);
    },
    landing() { U.closeSheet(); U.go('roles'); },
    'to-roles'() { const r = $('#roles'); if (r) window.scrollTo({ top: r.getBoundingClientRect().top + window.scrollY - 8, behavior: U.calm() ? 'auto' : 'smooth' }); },
    more() {
      const items = U.R().nav.slice(4);
      U.sheet(`<h2 class="sh-h">More</h2><nav class="more-nav">${items.map(i => `<button class="nl" data-go="${i}">${ic(U.NAV[i][1])}<span>${U.NAV[i][0]}</span></button>`).join('')}<button class="nl" data-go="notifs">${ic('bell')}<span>Notifications</span></button><button class="nl" data-act="roles">${ic('swap')}<span>Switch role</span></button><button class="nl" data-act="reset">${ic('undo')}<span>Reset demo</span></button></nav>`);
    },
    back() { const p = stack.pop(); if (p) U.go(p.view, p.arg); else U.go('home'); },
    reset() {
      U.sheet(`<h2 class="sh-h">Reset the demo?</h2><p class="note">This clears what you changed in this browser: reports sent, payments, bookings and new items. The sample data comes back.</p><div class="row-btns"><button class="btn ink" data-act="reset-yes">Reset demo</button><button class="btn" data-act="close">Keep my changes</button></div>`);
    },
    'reset-yes'() { try { localStorage.removeItem(U.KEY); sessionStorage.removeItem('icon-seen'); } catch (e) { /* ignore */ } location.reload(); },
    close() { U.closeSheet(); },
    pick(el) {
      const row = el.closest('.chips');
      $$('.chip', row).forEach(c => { c.classList.toggle('on', c === el); c.setAttribute('aria-checked', c === el); });
      $('input[type=hidden]', row).value = el.dataset.v;
    },

    /* clubs */
    'club-f'(el) { U.CF[el.dataset.k] = el.dataset.v; U.CF.page = 1; rerender(); },
    'club-page'(el) { U.CF.page = Number(el.dataset.page); paintClubRows(); },
    'club-clear'() { Object.assign(U.CF, { q: '', g: 0, type: '', st: 'Active', page: 1 }); rerender(); },
    charter() {
      U.sheet(`<h2 class="sh-h">Charter a new club</h2><form data-form="charter" class="form">
        <label class="field" for="chName"><span>Club name</span><input id="chName" name="name" required placeholder="Chennai Kotturpuram" autofocus></label>
        <fieldset class="field"><legend>Type</legend>${chipRow('type', ['Community', 'College'], 'Community')}</fieldset>
        <label class="field" for="chG"><span>Group</span><select id="chG" name="group">${D.GROUPS.map(g => `<option value="${g.id}">${g.name}, ${esc(g.area)}</option>`).join('')}</select></label>
        <label class="field" for="chS"><span>Sponsor Rotary club</span><input id="chS" name="sponsor" placeholder="Rotary Club of Chennai ..."></label>
        <label class="field" for="chM"><span>Founding members</span><input id="chM" name="members" type="number" min="10" value="15"></label>
        <div class="form-act"><button class="btn ink" type="submit">Add as proposed</button><span class="muted">It counts as active once the DRR approves.</span></div></form>`);
    },
    lifecycle(el) {
      const c = U.club(el.dataset.id);
      U.sheet(`<h2 class="sh-h">Change state of ${esc(c.name)}</h2><form data-form="lifecycle" data-id="${c.id}" class="form">
        <fieldset class="field"><legend>New state</legend>${chipRow('state', ['Proposed', 'Active', 'Inactive', 'Terminated', 'Merged'], U.stateOf(c))}</fieldset>
        <fieldset class="field"><legend>Reason</legend>${chipRow('why', ['Charter approved', 'No meetings for 3 months', 'Dues unpaid', 'Merged with another club', 'Club revived'], 'Charter approved')}</fieldset>
        <div class="form-act"><button class="btn ink" type="submit">Save state</button><span class="muted">Logged with your name and today's date.</span></div></form>`);
    },

    /* people */
    'people-f'(el) { U.PF.role = el.dataset.v; U.PF.page = 1; rerender(); },
    'people-page'(el) { U.PF.page = Number(el.dataset.page); paintPeople(true); },
    'add-member'() {
      U.sheet(`<h2 class="sh-h">Add a member</h2><form data-form="member" class="form">
        <label class="field" for="amN"><span>Full name</span><input id="amN" required autofocus></label>
        <label class="field" for="amE"><span>Email or phone</span><input id="amE" required></label>
        <fieldset class="field"><legend>Post</legend>${chipRow('post', ['Member', 'Board member', 'Joint Secretary'], 'Member')}</fieldset>
        <div class="form-act"><button class="btn ink" type="submit">Add member</button><span class="muted">They get a link to set up their pass.</span></div></form>`);
    },
    import() {
      U.sheet(`<h2 class="sh-h">Import your roster</h2><p class="note">Upload the sheet you already keep. Name, email, phone and post are matched for you.</p>
        <label class="file big" for="impF">${ic('upload')}<span id="impL">Choose a CSV or Excel file</span><input id="impF" type="file" accept=".csv,.xlsx" data-on="import-file"></label>
        <div id="impPrev"></div>`);
    },

    /* designations */
    'add-desig'() {
      U.sheet(`<h2 class="sh-h">Add a post</h2><form data-form="desig" class="form">
        <label class="field" for="dsT"><span>Title, any wording you like</span><input id="dsT" name="title" required placeholder="Chairperson, Madras Week" autofocus></label>
        <label class="field" for="dsTpl"><span>Access template</span><select id="dsTpl" name="tpl">${Object.entries(D.TEMPLATES).map(([k, v]) => `<option value="${k}">${k}: ${v}</option>`).join('')}</select></label>
        <label class="field" for="dsS"><span>Scope</span><input id="dsS" name="scope" placeholder="Madras Week heritage walks"></label>
        <label class="field" for="dsH"><span>Given to</span><input id="dsH" name="holder" placeholder="Search a member" list="dsPeople"></label>
        <datalist id="dsPeople">${[0, 40, 400, 900, 3100].map(i => `<option value="${esc(D.member(i).name)}">`).join('')}</datalist>
        <div class="form-act"><button class="btn ink" type="submit">Add post</button></div></form>`);
    },

    /* reports */
    'q-tab'(el) { U.QF.s = el.dataset.v; U.QF.page = 1; rerender(); },
    'q-page'(el) { U.QF.page = Number(el.dataset.page); const r = U.queueRows(); $('#qRows').innerHTML = r.body; $('#qPager').innerHTML = r.pager; },
    nudge(el) {
      const c = U.club(el.dataset.id);
      P.nudged[c.id] = true; save();
      el.disabled = true; el.textContent = 'Nudged';
      U.toast(`Reminder sent to the president and secretary of ${c.name}`);
    },
    'nudge-all'(el) {
      const g = Number(el.dataset.g);
      const list = U.activeClubs().filter(c => U.groupOf(c) === g && ['none', 'draft', 'returned', 'president'].includes(U.report(c, 3).status));
      list.forEach(c => { P.nudged[c.id] = true; }); save();
      U.confetti(...centerOf(el)); rerender();
      U.toast(`Reminders sent to ${list.length} clubs`);
    },
    sign(el) {
      const c = U.club(el.dataset.id), mi = Number(el.dataset.m);
      U.setReport(c, mi, { status: 'grs' }, 'Signed by the president and sent to GRS');
      notify('grr', `${c.name} sent its ${D.MONTHS[mi].label} report for your check.`, 'report-' + c.id);
      rerender();
      U.sheet(`<div class="done-sheet">${U.coffee()}<h2 class="sh-h">Signed and sent</h2><p class="note">Your GRS checks it next, then the DRS. You will hear back at each stop.</p>${U.tracker('grs')}<button class="btn ink full" data-act="close">Done</button></div>`);
    },
    accept(el) {
      const c = U.club(el.dataset.id), r = U.report(c, 3), rl = U.role();
      const next = rl === 'grr' && r.status === 'grs' ? 'drs' : 'accepted';
      U.setReport(c, 3, { status: next, comment: '' }, next === 'drs' ? 'Checked by GRS and sent to DRS' : 'Accepted by ' + roleLabel(rl));
      notify(next === 'drs' ? 'drs' : 'pres', next === 'drs' ? `${c.name} October report is ready for you.` : 'Your October report was accepted.', next === 'drs' ? 'report-' + c.id : 'home');
      U.resetScore(); U.confetti(...centerOf(el)); rerender();
      U.toast(next === 'drs' ? 'Sent to the DRS' : 'Report accepted. Points added to the scorecard.');
    },
    return(el) {
      U.sheet(`<h2 class="sh-h">Return with a note</h2><form data-form="return" data-id="${el.dataset.id}" class="form">
        <fieldset class="field"><legend>What needs fixing</legend>${chipRow('why', ['Photos missing', 'Beneficiary count unclear', 'Add social media link', 'Project date outside the month'], 'Photos missing')}</fieldset>
        <label class="field" for="rtN"><span>Anything else, optional</span><textarea id="rtN" name="note" rows="3"></textarea></label>
        <div class="form-act"><button class="btn ink" type="submit">Return to club</button></div></form>`);
    },

    /* log a project */
    step(el) {
      const k = el.dataset.k, d = Number(el.dataset.d);
      U.LF[k] = Math.max(k === 'ben' ? 0 : 1, Math.min(k === 'hrs' ? 24 : 5000, U.LF[k] + d));
      $('#out-' + k).textContent = U.LF[k];
      $('#out-mh').textContent = U.LF.vol * U.LF.hrs;
      $('#lpPreview').innerHTML = U.logPreview();
    },
    'lp-chip'(el) {
      const k = el.dataset.k, v = el.dataset.v;
      if (el.dataset.multi) { const a = U.LF[k]; const i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); el.classList.toggle('on'); el.setAttribute('aria-pressed', i < 0); }
      else { U.LF[k] = v; $$(`[data-act="lp-chip"][data-k="${k}"]`).forEach(c => { c.classList.toggle('on', c === el); c.setAttribute('aria-pressed', c === el); }); }
      $('#lpPreview').innerHTML = U.logPreview();
    },

    /* monthly report */
    'm-step'(el) {
      const k = el.dataset.k, d = Number(el.dataset.d);
      U.MF[k] = Math.max(0, Math.min(k === 'att' ? 100 : 99, U.MF[k] + d));
      const mi = U.cur().arg === 3 || U.cur().arg === '3' ? 3 : 4;
      const r = U.report(cos(), mi);
      U.setReport(cos(), mi, { data: Object.assign({}, r.data || {}, { meetings: U.MF.meetings, att: U.MF.att, joins: U.MF.joins, drops: U.MF.drops }) });
      rerender();
    },
    quiet(el) {
      U.sheet(`<h2 class="sh-h">A quiet month</h2><p class="note">It still counts as on time. Tell us why in one tap.</p><form data-form="quiet" data-m="${el.dataset.m}" class="form">${chipRow('reason', ['Exams', 'Festival break', 'Semester holidays', 'Club rebuilding'], 'Exams')}<div class="form-act"><button class="btn ink" type="submit">Mark quiet month</button></div></form>`);
    },
    'submit-month'(el) {
      const mi = Number(el.dataset.m), r = U.report(cos(), mi);
      U.setReport(cos(), mi, { status: 'president', data: Object.assign({}, r.data || {}, U.MF) }, 'Sent by the secretary to the president');
      notify('pres', `The ${D.MONTHS[mi].label} report is waiting for your sign-off.`, 'monthly-' + mi);
      rerender();
      U.sheet(`<div class="done-sheet">${U.coffee()}<h2 class="sh-h">Sent to your president</h2><p class="note">One tap from them and it rides on to your GRS. Time for a filter coffee.</p>${U.tracker('president')}<button class="btn ink full" data-act="close">Done</button></div>`);
    },

    /* money */
    pay(el) {
      U.sheet(`<h2 class="sh-h">Mark as paid</h2><form data-form="pay" data-id="${el.dataset.id}" class="form">
        <label class="field" for="pyR"><span>UPI reference number</span><input id="pyR" name="ref" required inputmode="numeric" placeholder="12-digit UTR" autofocus></label>
        <label class="file" for="pyS">${ic('upload')}<span>Add payment screenshot</span><input id="pyS" type="file" accept="image/*"></label>
        <div class="form-act"><button class="btn ink" type="submit">Send for checking</button><span class="muted">The district treasurer confirms it against the bank statement.</span></div></form>`);
    },
    'f-page'(el) { U.FF.page = Number(el.dataset.page); const v = U.verifyRows(); $('#vRows').innerHTML = v.body; $('#vPager').innerHTML = v.pager; },
    verify(el) {
      const row = el.closest('tr');
      P.pay[el.dataset.id] = Object.assign({}, P.pay[el.dataset.id] || {}, { status: 'verified' }); save();
      U.resetScore();
      row.classList.add('leaving');
      setTimeout(rerender, U.RM ? 0 : 260);
      U.toast('Payment confirmed. The club sees it as paid.');
    },

    /* events */
    'ev-f'(el) { U.EF.f = el.dataset.v; rerender(); },
    'confirm-seats'(el) { U.confetti(...centerOf(el)); U.toast('Seats confirmed. The fee is in your club wallet.'); },
    quickpage(el) {
      const e = D.EVENTS.find(x => x.id === el.dataset.id);
      U.sheet(`<div class="qp"><div class="qp-hero">${U.gear()}<span>${P.season === 'vibe' ? 'VIBE' : 'ICON'} 3233 presents</span><h2>${esc(e.name)}</h2><p>${esc(e.date)}</p></div>
        <div class="qp-body"><h3>Schedule</h3><ul class="kv"><li><span>Arrival and check-in</span><b class="fig">8:30</b></li><li><span>Opening</span><b class="fig">9:30</b></li><li><span>Sessions</span><b class="fig">10:00</b></li><li><span>Close</span><b class="fig">17:00</b></li></ul>
        <button class="btn ink full" data-act="close">Register</button><p class="note">This is how a quick event page looks. Chairs fill four fields and it is live.</p></div></div>`, { wide: true });
    },
    'new-event'() {
      U.sheet(`<h2 class="sh-h">New event</h2><form data-form="event" class="form">
        <fieldset class="field"><legend>Start from</legend>${chipRow('kind', ['Flagship', 'Training', 'Service', 'Awards', 'Culturals', 'Custom'], 'Custom')}</fieldset>
        <label class="field" for="evN"><span>Name</span><input id="evN" name="name" required placeholder="Madras Week heritage walk" autofocus></label>
        <label class="field" for="evD"><span>Date</span><input id="evD" name="date" type="date" value="2027-01-10"></label>
        <label class="field" for="evC"><span>Chair</span><input id="evC" name="chair" placeholder="Search a member"></label>
        <div class="form-act"><button class="btn ink" type="submit">Create event</button></div></form>`);
    },
    'add-comm'(el) {
      U.sheet(`<h2 class="sh-h">Add a committee</h2><form data-form="comm" data-id="${el.dataset.id}" class="form">
        <label class="field" for="cmN"><span>Committee</span><input id="cmN" name="name" required placeholder="Decor" autofocus></label>
        <label class="field" for="cmH"><span>Head</span><input id="cmH" name="head" placeholder="Search a member"></label>
        <div class="form-act"><button class="btn ink" type="submit">Add committee</button><span class="muted">Starts with three standard tasks.</span></div></form>`);
    },
    cert(el) {
      const c = U.certs[Number(el.dataset.i)];
      U.sheet(`<div class="cert"><div class="cert-in">${U.gear()}<small>Rotaract District 3233</small><h2>Certificate of ${c[1].startsWith('Participation') ? 'participation' : 'service'}</h2><p>Presented to</p><b class="cert-name">Kayal S.</b><p>${esc(c[1])}, ${esc(c[0])}</p><span class="stamp">Verified</span><div class="cert-sig"><span>District Rotaract Representative</span><span>District Rotaract Secretary</span></div></div></div><p class="note">Generated automatically from attendance and project logs. Sample only.</p>`, { wide: true });
    },

    /* visits */
    book(el) { P.visits[el.dataset.id] = cos().id; save(); U.confetti(...centerOf(el)); rerender(); U.toast('Visit booked. The DRR sees it on their calendar.'); },
    unbook(el) { P.visits[el.dataset.id] = 0; save(); rerender(); U.toast('Slot released. Pick a new one.', 'info'); },

    /* initiatives */
    'new-initiative'() {
      U.sheet(`<h2 class="sh-h">New initiative</h2><form data-form="init" class="form">
        <fieldset class="field"><legend>Type</legend>${chipRow('type', ['Campaign', 'Directory', 'Competition', 'Collection'], 'Campaign')}</fieldset>
        <label class="field" for="inN"><span>Name</span><input id="inN" name="name" required placeholder="Books for Corporation schools" autofocus></label>
        <label class="field" for="inO"><span>Owner</span><select id="inO" name="owner">${D.designations.filter(d => ['Portfolio', 'Team'].includes(d.tpl)).map(d => `<option>${esc(d.title)}</option>`).join('')}</select></label>
        <div class="field-row"><label class="field" for="inU"><span>Counted in</span><input id="inU" name="unit" value="books"></label><label class="field" for="inG"><span>Goal</span><input id="inG" name="goal" type="number" min="1" value="2000"></label></div>
        <fieldset class="field"><legend>Colour</legend><div class="swatches">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => `<label class="swl" style="--g:var(--sw${s})"><input type="radio" name="sw" value="${s}" ${s === 8 ? 'checked' : ''}><span class="sr">Colour ${s}</span></label>`).join('')}</div></fieldset>
        <div class="form-act"><button class="btn ink" type="submit">Launch to all clubs</button></div></form>`);
    },
    contrib(el) {
      U.sheet(`<h2 class="sh-h">Log for Madras Cosmos</h2><form data-form="contrib" class="form"><label class="field" for="ctV"><span>How many</span><input id="ctV" type="number" min="1" value="12" autofocus></label><label class="file" for="ctP">${ic('upload')}<span>Add a photo</span><input id="ctP" type="file" accept="image/*"></label><div class="form-act"><button class="btn ink" type="submit">Log it</button></div></form>`);
    },

    /* season */
    season(el) { P.season = el.dataset.s; save(); document.documentElement.dataset.season = P.season; rerender(); U.toast(`Showing the ${P.season.toUpperCase()} skin`); },
    gcol(el) { P.gcol[el.dataset.g] = Number(el.dataset.s); save(); rerender(); },
    mod(el) { U.toast(`${el.dataset.name} ${el.checked ? 'switched on' : 'switched off'} for every club`, 'info'); }
  };

  /* ---------- form submits ---------- */
  const F = {
    log(f, e) {
      const name = $('#lpName').value.trim();
      if (!name) { $('#lpName').focus(); U.toast('Give the project a name first', 'info'); return; }
      const k = cos().id + '|4';
      P.projects[k] = (P.projects[k] || []).concat([{ id: 'n' + Date.now(), name, avenue: U.LF.av, focus: U.LF.focus.slice(), day: Number(($('#lpDate').value || '2026-11-16').slice(8)), volunteers: U.LF.vol, hours: U.LF.hrs, manHours: U.LF.vol * U.LF.hrs, beneficiaries: U.LF.ben, joint: U.LF.joint }]);
      save(); U.resetScore();
      U.confetti(...centerOf(e.submitter || f));
      U.toast('Project saved to November');
      go('monthly', 4);
    },
    charter(f) {
      const d = new FormData(f), g = D.GROUPS[Number(d.get('group')) - 1];
      const id = 1000 + P.newClubs.length + 1;
      P.newClubs.push({ id, name: d.get('name'), type: d.get('type') || 'Community', group: g.id, place: g.places[0], members: Number(d.get('members')) || 15, state: 'Proposed', isNew: true, x: g.cx + 8, y: g.cy - 6, chartered: 2026, president: 'To be elected', secretary: 'To be elected', treasurer: 'To be elected', sponsor: d.get('sponsor') || 'a Rotary club', activity: 0.5 });
      save(); U.closeSheet(); U.CF.st = 'Proposed'; rerender();
      U.toast(`${d.get('name')} added as a proposed club`);
    },
    lifecycle(f) {
      const d = new FormData(f), id = f.dataset.id;
      const cur = P.clubs[id] || {};
      P.clubs[id] = Object.assign(cur, { state: d.get('state'), log: [{ to: d.get('state'), why: d.get('why') }].concat(cur.log || []) });
      save(); U.resetScore(); U.closeSheet(); rerender();
      U.toast('State changed. Club counts update everywhere.');
    },
    member(f) { U.closeSheet(); U.toast('Member added. They get a link to set up their pass.'); },
    desig(f) {
      const d = new FormData(f);
      P.desig.push({ id: 900 + P.desig.length, team: 'Added this season', title: d.get('title'), tpl: d.get('tpl'), scope: d.get('scope') || 'District', holder: d.get('holder') || 'Not assigned yet', isNew: true });
      save(); U.closeSheet(); rerender(); U.toast('Post added');
    },
    return(f) {
      const d = new FormData(f), c = U.club(f.dataset.id);
      const note = d.get('why') + (d.get('note') ? '. ' + d.get('note') : '');
      U.setReport(c, 3, { status: 'returned', comment: note }, 'Returned: ' + note);
      notify('sec', `Your October report came back: ${note}`, 'monthly-3');
      U.closeSheet(); rerender(); U.toast('Returned to the club with your note', 'info');
    },
    quiet(f) {
      const d = new FormData(f), mi = Number(f.dataset.m), r = U.report(cos(), mi);
      U.setReport(cos(), mi, { data: Object.assign({}, r.data || {}, { nothing: true, reason: d.get('reason') }) });
      U.closeSheet(); rerender(); U.toast('Marked as a quiet month');
    },
    pay(f) {
      const d = new FormData(f);
      P.pay[f.dataset.id] = { status: 'pending', ref: 'UPI ' + d.get('ref') }; save();
      notify('dt', 'Madras Cosmos sent a payment for checking.', 'home');
      U.closeSheet(); rerender(); U.toast('Sent. The district treasurer will confirm it.');
    },
    event(f) {
      const d = new FormData(f);
      const dt = new Date(d.get('date') || '2027-01-10');
      const m = (dt.getMonth() + 6) % 12;
      const e = { id: 'e' + Date.now(), name: d.get('name'), kind: d.get('kind') || 'Custom', date: dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), m, status: 'Planning', chair: d.get('chair') || 'Not assigned yet', health: 0, site: 'quick' };
      P.events = (P.events || []).concat([e]); D.EVENTS.push(e); save();
      U.closeSheet(); go('event', e.id); U.toast('Event created as a draft');
    },
    comm(f) {
      const d = new FormData(f), id = f.dataset.id;
      P.comms = P.comms || {}; P.comms[id] = (P.comms[id] || []).concat([{ name: d.get('name'), head: d.get('head') || 'Not assigned yet', tasks: ['Kick-off meeting', 'Share plan with chair', 'Budget line'], done: 0 }]);
      save(); U.closeSheet(); rerender(); U.toast('Committee added');
    },
    init(f) {
      const d = new FormData(f);
      P.inits.unshift({ id: 'i' + Date.now(), name: d.get('name'), type: d.get('type') || 'Campaign', owner: d.get('owner'), unit: d.get('unit') || 'items', goal: Number(d.get('goal')) || 100, now: 0, clubs: 0, sw: Number(d.get('sw')) || 8, isNew: true });
      save(); U.closeSheet(); go('initiatives'); U.toast('Live for every club');
    },
    contrib(f) { U.closeSheet(); U.toast('Logged. The chair checks it before it counts.'); }
  };

  /* ---------- live input handlers ---------- */
  function paintClubRows() { const r = U.clubRows(); $('#clubRows').innerHTML = r.body; $('#clubPager').innerHTML = r.pager; }
  // Show a short skeleton while the next page "loads", as the real site would.
  function paintPeople(skel) {
    const body = $('#peopleRows');
    if (!body) return;
    if (skel && !U.RM) { body.innerHTML = U.skeletonRows(8, 6); setTimeout(() => { const r = U.peopleRows(); body.innerHTML = r.body; $('#peoplePager').innerHTML = r.pager; }, 180); }
    else { const r = U.peopleRows(); body.innerHTML = r.body; $('#peoplePager').innerHTML = r.pager; }
  }
  const clubQ = U.debounce(v => { U.CF.q = v; U.CF.page = 1; paintClubRows(); }, 120);
  const peopleQ = U.debounce(v => { U.PF.q = v; U.PF.page = 1; paintPeople(false); }, 150);
  const I = {
    'club-q': el => clubQ(el.value),
    'club-g': el => { U.CF.g = Number(el.value); U.CF.page = 1; paintClubRows(); },
    'people-q': el => peopleQ(el.value),
    'move-group': el => { const id = el.dataset.id; P.clubs[id] = Object.assign(P.clubs[id] || {}, { group: Number(el.value) }); save(); rerender(); U.toast('Club moved to Group ' + el.value); },
    'lp-text': () => { $('#lpPreview').innerHTML = U.logPreview(); },
    'lp-joint': el => { U.LF.joint = el.checked; $('#lpPreview').innerHTML = U.logPreview(); },
    'lp-photos': el => { U.LF.photos = el.files.length; $('#photoLbl').textContent = el.files.length + ' photos added'; },
    'import-file': el => {
      if (!el.files.length) return;
      $('#impL').textContent = el.files[0].name;
      $('#impPrev').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Post</th><th>Match</th></tr></thead><tbody>${[3, 4, 5].map(i => { const m = D.member(i); return `<tr><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td>${U.pill('Ready', 'ok')}</td></tr>`; }).join('')}</tbody></table></div><p class="note">Showing 3 of the rows found. Duplicates are skipped.</p><button class="btn ink full" data-act="close">Import members</button>`;
    },
    task: el => { P.tasks[el.dataset.k] = el.checked; save(); if (el.checked) U.confetti(...centerOf(el)); rerender(); },
    weight: el => { P.weights = Object.assign({}, P.weights || { reports: 30, projects: 25, hours: 15, events: 15, fees: 10, inits: 5 }, { [el.dataset.k]: Number(el.value) }); save(); $('#wo-' + el.dataset.k).textContent = el.value; $('#scoreList').innerHTML = U.scoreList(); }
  };

  /* ---------- listeners ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('#sheet') && !e.target.closest('.sheet-panel')) { U.closeSheet(); return; }
    const a = e.target.closest('[data-act]');
    if (a && !a.disabled && A[a.dataset.act]) {
      if (a.tagName === 'INPUT' && a.type === 'checkbox') { A[a.dataset.act](a, e); return; }
      e.preventDefault(); A[a.dataset.act](a, e); return;
    }
    const g = e.target.closest('[data-go]');
    if (g) {
      e.preventDefault();
      if (g.closest('#sheet')) U.closeSheet();
      const arg = g.dataset.arg != null ? g.dataset.arg : null;
      go(g.dataset.go, arg);
    }
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-on]'); if (el && I[el.dataset.on] && el.type !== 'search' && el.type !== 'text') I[el.dataset.on](el, e); if (el && el.dataset.act === 'mod') A.mod(el); });
  document.addEventListener('input', e => { const el = e.target.closest('[data-on]'); if (el && I[el.dataset.on] && (el.type === 'search' || el.type === 'text' || el.type === 'range' || !el.type)) I[el.dataset.on](el, e); });
  document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault(); F[f.dataset.form] && F[f.dataset.form](f, e); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#sheet').hidden) U.closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-go][role=link], tr[data-go]')) { e.preventDefault(); e.target.click(); }
  });

  /* ---------- loader: sparks gather into the gear, the gear rises over Chennai ---------- */
  const loader = done => window.MO.loader(done);

  /* ---------- boot ---------- */
  document.documentElement.dataset.season = P.season || 'icon';
  const paintMotion = () => { document.documentElement.dataset.motion = P.motion; const b = $('#motionBtn'); if (b) { b.setAttribute('aria-pressed', P.motion === 'on'); b.title = P.motion === 'on' ? 'Animations on' : 'Animations off'; } };
  paintMotion();
  $('#motionBtn').addEventListener('click', () => { P.motion = P.motion === 'on' ? 'off' : 'on'; save(); paintMotion(); U.toast(P.motion === 'on' ? 'Animations on' : 'Animations off', 'info'); });
  $('#searchBtn').addEventListener('click', () => window.MO.openSearch());
  if (U.OS_CALM && !P.motionNoted) { P.motionNoted = true; save(); setTimeout(() => U.toast('Your device asks for less motion. Animations stay on here. Use the sparkle button to turn them off.', 'info'), 4200); }
  if (!P.season) P.season = 'icon';
  $('#reset').addEventListener('click', () => A.reset());
  $('#brandGear').innerHTML = U.gear();
  $('#who').addEventListener('click', () => A.roles());
  const h = (location.hash || '').slice(1);
  const m = h.match(/^([a-z]+)(?:-(.+))?$/);
  if (P.role) U.setCur({ view: m && h !== 'roles' ? m[1] : 'home', arg: m && m[2] ? (isNaN(m[2]) ? m[2] : Number(m[2])) : null });
  else U.setCur({ view: 'roles', arg: null });
  U.render({ instant: true });
  loader(() => {});
})();
