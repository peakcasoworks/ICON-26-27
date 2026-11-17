/* Views: reports queue and detail, log a project, monthly report, club wallet, district finance. */
(function () {
  const U = UI, { esc, num, inr, ic, pct, P } = U;
  const head = (...a) => U.head(...a);

  /* ---------- the report text, built from taps with plain rules ---------- */
  const listJoin = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  function summary(c, mi, extra = {}) {
    const ps = U.projects(c, mi);
    const m = D.MONTHS[mi].label;
    if (!ps.length) return `In ${m} 2026, the Rotaract Club of ${c.name} reported no projects${extra.reason ? ' because of ' + extra.reason.toLowerCase() : ''}.`;
    const vol = ps.reduce((a, p) => a + p.volunteers, 0), hrs = ps.reduce((a, p) => a + p.manHours, 0), ben = ps.reduce((a, p) => a + p.beneficiaries, 0);
    const av = [...new Set(ps.map(p => p.avenue))];
    const joint = ps.filter(p => p.joint).length;
    const top = ps.slice().sort((a, b) => b.beneficiaries - a.beneficiaries)[0];
    let s = `In ${m} 2026, the Rotaract Club of ${c.name} ran ${ps.length} project${ps.length > 1 ? 's' : ''} across ${listJoin(av)}. ${num(vol)} volunteers gave ${num(hrs)} hours of service`;
    s += ben ? ` and benefited ${num(ben)} people.` : '.';
    if (top && top.beneficiaries) s += ` The largest was ${top.name}, with ${num(top.beneficiaries)} beneficiaries.`;
    const partners = [...new Set(ps.flatMap(p => p.jointWith || []))];
    if (joint) s += ` ${joint} project${joint > 1 ? 's were' : ' was'} run jointly with ${partners.length ? listJoin(partners) : 'other clubs'}.`;
    if (extra.meetings) s += ` The board met ${extra.meetings} time${extra.meetings > 1 ? 's' : ''} and general attendance was ${extra.att}%.`;
    if (extra.joins) s += ` ${extra.joins} new member${extra.joins > 1 ? 's' : ''} joined.`;
    return s;
  }
  U.summary = summary;

  // The checklist that makes a monthly report. Most of it fills itself.
  U.views_monthSteps = (c, mi) => {
    const r = U.report(c, mi), d = r.data || {};
    const ps = U.projects(c, mi);
    const fees = U.wallet(c).every(w => w.status !== 'overdue');
    return [
      { k: 'projects', t: ps.length ? `${ps.length} projects logged` : 'Log projects or mark a quiet month', done: ps.length > 0 || !!d.nothing },
      { k: 'meetings', t: 'Meetings and attendance', done: !!d.meetings },
      { k: 'members', t: 'Membership changes', done: d.joins != null },
      { k: 'fees', t: fees ? 'No overdue fees' : 'Clear overdue fees', done: fees },
      { k: 'submit', t: 'Send to GRS', done: !['none', 'draft', 'returned'].includes(r.status) }
    ];
  };

  /* ---------- reports queue ---------- */
  const QF = { s: 'review', g: 0, page: 1 };
  U.QF = QF;
  function queueRows() {
    const per = 12, rl = U.role();
    const scopeG = U.level() === 'group' ? U.MY_GROUP : QF.g;
    const want = { review: ['grr', 'grs'].includes(rl) ? ['grs'] : rl === 'drs' ? ['drs'] : ['grs', 'drs'], late: ['none', 'draft', 'returned'], accepted: ['accepted'], all: null }[QF.s];
    const list = U.activeClubs().filter(c => U.canSeeClub(c) && (!scopeG || U.groupOf(c) === scopeG) && (!want || want.includes(U.report(c, 3).status)));
    const pages = Math.max(1, Math.ceil(list.length / per));
    if (QF.page > pages) QF.page = pages;
    return {
      body: list.slice((QF.page - 1) * per, QF.page * per).map(c => {
        const r = U.report(c, 3), ps = U.projects(c, 3);
        return `<tr data-go="report" data-arg="${c.id}" tabindex="0" role="link"><td><b>${esc(c.name)}</b><small class="sub">${c.type}</small></td><td>${U.gpill(U.groupOf(c))}</td><td class="fig r">${ps.length}</td><td class="fig r">${num(ps.reduce((a, p) => a + p.manHours, 0))}</td><td>${U.rpill(r.status)}${r.late ? '<small class="late">late</small>' : ''}</td></tr>`;
      }).join('') || `<tr><td colspan="5"><div class="empty">${ic('check')}<b>Nothing waiting</b><span>Every report in this view has moved on. Pick another tab to see the rest.</span></div></td></tr>`,
      pager: U.pager(list.length, QF.page, per, 'q-page'),
      n: list.length
    };
  }
  U.queueRows = queueRows;
  U.views_reports = (isHome) => {
    const rl = U.role();
    const r = queueRows();
    const tab = (v, l) => `<button class="tab${QF.s === v ? ' on' : ''}" role="tab" aria-selected="${QF.s === v}" data-act="q-tab" data-v="${v}">${l}</button>`;
    const who = ['grr', 'grs'].includes(rl) ? 'Check each report before it goes to the DRS.' : rl === 'gco' ? 'Every group\'s reports, with the GRR and GRS who check them.' : rl === 'drs' ? 'Reports reach you after the GRS has checked them.' : 'Every club report for October, wherever it sits on its route.';
    return `${head(isHome ? 'Reports desk' : 'Reports', `October 2026. ${who}`)}
    <section class="card">
      <div class="tabs" role="tablist">${tab('review', 'Waiting for review')}${tab('late', 'Not filed')}${tab('accepted', 'Accepted')}${tab('all', 'All')}</div>
      <div class="tbl-wrap"><table class="tbl hover"><thead><tr><th>Club</th><th>Group</th><th class="r">Projects</th><th class="r">Hours</th><th>Status</th></tr></thead><tbody id="qRows">${r.body}</tbody></table></div>
      <div id="qPager">${r.pager}</div>
    </section>`;
  };
  U.view('reports', () => U.views_reports(false));

  /* ---------- report detail ---------- */
  U.view('report', arg => {
    const c = U.club(arg) || U.myClub(), mi = 3, r = U.report(c, mi), rl = U.role();
    if (!U.canSeeClub(c)) return `${head('October report', 'Not part of your login.')}<section class="card"><div class="empty">${ic('lock')}<b>This report is outside your ${U.level() === 'group' ? 'group' : 'club'}</b><button class="btn sm" data-go="home">Back to home</button></div></section>`;
    const ps = U.projects(c, mi);
    const canAct = (['grr', 'grs', 'gco'].includes(rl) && r.status === 'grs') || (rl === 'drs' && r.status === 'drs') || (rl === 'drr' && ['grs', 'drs'].includes(r.status));
    const hist = (r.hist || []);
    return `${head(`October report, ${esc(c.name)}`, `Group ${U.groupOf(c)}. ${r.late ? 'Filed after 5 November, so it earns reduced points.' : 'Filed on time.'}`, `<button class="btn" data-act="back">${ic('left')}Back</button>`)}
    <section class="card">
      <div class="card-h"><h2>Where it is</h2>${U.rpill(r.status)}</div>
      ${U.tracker(r.status)}
      ${r.comment ? `<p class="callout warn">${ic('alert')}Returned with a note: ${esc(r.comment)}</p>` : ''}
      ${canAct ? `<div class="decide"><button class="btn ink" data-act="accept" data-id="${c.id}">${ic('check')}${r.status === 'grs' && rl !== 'drr' ? 'Checked, send to DRS' : 'Accept report'}</button><button class="btn" data-act="return" data-id="${c.id}">Return with a note</button></div>` : ''}
    </section>
    <div class="grid-2">
      <section class="card">
        <div class="card-h"><h2>Summary</h2><span class="muted">Written from the club's taps</span></div>
        <p class="gen">${esc(summary(c, mi, r.data || { meetings: 2, att: 71, joins: 1 }))}</p>
      </section>
      <section class="card">
        <div class="card-h"><h2>Numbers</h2></div>
        <ul class="kv"><li><span>Projects</span><b class="fig">${ps.length}</b></li><li><span>Volunteers</span><b class="fig">${num(ps.reduce((a, p) => a + p.volunteers, 0))}</b></li><li><span>Service hours</span><b class="fig">${num(ps.reduce((a, p) => a + p.manHours, 0))}</b></li><li><span>Beneficiaries</span><b class="fig">${num(ps.reduce((a, p) => a + p.beneficiaries, 0))}</b></li></ul>
      </section>
    </div>
    <section class="card">
      <div class="card-h"><h2>Projects</h2></div>
      ${ps.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Project</th><th>Date</th><th>Avenue</th><th>Focus</th><th class="r">Hours</th><th class="r">Beneficiaries</th></tr></thead><tbody>${ps.map(p => `<tr><td>${esc(p.name)}${p.joint ? ' ' + U.pill('Joint', 'neutral') : ''}</td><td class="fig">${p.day} Oct</td><td>${esc(p.avenue)}</td><td>${esc(p.focus.join(', '))}</td><td class="fig r">${p.manHours}</td><td class="fig r">${num(p.beneficiaries)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${ic('doc')}<b>No projects this month</b><span>The club marked October as a quiet month.</span></div>`}
    </section>
    ${hist.length ? `<section class="card"><div class="card-h"><h2>Activity</h2></div><ul class="kv">${hist.map(h => `<li><span>${esc(h.t)}</span><small class="sub">${h.at}</small></li>`).join('')}</ul></section>` : ''}`;
  });

  /* ---------- log a project: taps, steppers, chips ---------- */
  const LF = { av: 'Community Service', focus: ['Environment'], vol: 12, hrs: 3, ben: 50, joint: false, jointClubs: [], out: ['Awareness created'], photos: 0, text: null, editing: false };
  U.LF = LF;
  const OUTCOMES = ['Awareness created', 'Items distributed', 'Funds raised', 'Skills taught', 'Trees planted', 'Health screened', 'Waste cleared'];
  // The text the district reads: written from the taps, and the club can rewrite it. Once rewritten it stays as typed until reset.
  function autoText() {
    const name = (U.$('#lpName') && U.$('#lpName').value.trim()) || 'This project';
    const place = (U.$('#lpVenue') && U.$('#lpVenue').value.trim()) || 'Chromepet';
    const joint = LF.joint && LF.jointClubs.length ? `. Run jointly with ${listJoin(LF.jointClubs.map(id => U.club(id).name))}` : '';
    return `${name} was a ${LF.av.toLowerCase()} project at ${place}. ${LF.vol} volunteers gave ${LF.vol * LF.hrs} hours${LF.ben ? ` and benefited ${num(LF.ben)} people` : ''}. Focus: ${LF.focus.join(', ').toLowerCase() || 'not set'}. Outcome: ${LF.out.join(', ').toLowerCase() || 'not set'}${joint}.`;
  }
  U.logPreview = () => esc(LF.text != null ? LF.text : autoText());
  function previewHTML() {
    const custom = LF.text != null;
    if (LF.editing) return `<label class="sr" for="lpText">Text the district will read</label><textarea id="lpText" class="prompt plain" rows="7" data-on="lp-edit">${esc(custom ? LF.text : autoText())}</textarea>
      <div class="row-btns"><button type="button" class="btn sm ink" data-act="lp-edit-done">Done</button><button type="button" class="btn sm" data-act="lp-reset">Back to automatic text</button></div>`;
    return `<p class="gen" id="lpPreview">${U.logPreview()}</p>${custom ? `<p class="note">${U.pill('Edited by you', 'neutral')} It will not change when you tap options.</p>` : ''}
      <div class="row-btns"><button type="button" class="btn sm" data-act="lp-edit-start">${ic('pen')}Edit the text</button>${custom ? '<button type="button" class="btn sm" data-act="lp-reset">Back to automatic text</button>' : ''}</div>`;
  }
  U.paintPreview = () => { if (LF.editing) return; const b = U.$('#lpPrev'); if (b) b.innerHTML = previewHTML(); };
  U.lpPrevHTML = previewHTML;
  function jointHTML() {
    if (!LF.joint) return '';
    const me = U.myClub().id, list = U.activeClubs().filter(c => c.id !== me && !LF.jointClubs.includes(c.id));
    return `<div class="joint-box"><label class="field" for="lpClub"><span>Which club or clubs did you run it with?</span><input id="lpClub" list="lpClubs" placeholder="Start typing a club name" autocomplete="off" data-on="lp-club"></label>
      <datalist id="lpClubs">${list.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
      <div class="chips">${LF.jointClubs.map(id => `<button type="button" class="chip on" data-act="lp-club-x" data-id="${id}" aria-label="Remove ${esc(U.club(id).name)}">${esc(U.club(id).name)} ${ic('x')}</button>`).join('') || '<small class="muted">Pick at least one club.</small>'}</div></div>`;
  }
  U.lpJointHTML = jointHTML;
  const stepper = (k, label, v, step, unit) => `<div class="stepper"><span class="st-lbl">${label}</span><div class="st-ctl"><button class="stp" data-act="step" data-k="${k}" data-d="-${step}" aria-label="Fewer ${label.toLowerCase()}">${ic('minus')}</button><output class="fig" id="out-${k}">${v}</output><button class="stp" data-act="step" data-k="${k}" data-d="${step}" aria-label="More ${label.toLowerCase()}">${ic('plus')}</button></div>${unit ? `<small>${unit}</small>` : ''}</div>`;
  U.view('log', () => {
    const chips = (k, opts, multi) => opts.map(o => { const on = multi ? LF[k].includes(o) : LF[k] === o; return `<button class="chip${on ? ' on' : ''}" data-act="lp-chip" data-k="${k}" data-v="${esc(o)}" data-multi="${multi ? 1 : ''}" aria-pressed="${on}">${esc(o)}</button>`; }).join('');
    return `${head('Log a project', 'About a minute. Do it the day the project happens and your monthly report fills itself.', `<button class="btn" data-act="back">${ic('left')}Back</button>`)}
    <div class="grid-log">
      <form class="card form" id="logForm" data-form="log">
        <label class="field" for="lpName"><span>Project name</span><input id="lpName" required placeholder="Notebook drive at Chromepet school" data-on="lp-text"></label>
        <div class="field-row">
          <label class="field" for="lpDate"><span>Date</span><input id="lpDate" type="date" value="2026-11-16" max="2026-11-30"></label>
          <label class="field" for="lpVenue"><span>Venue</span><input id="lpVenue" placeholder="Chromepet" data-on="lp-text" list="venues"></label>
          <datalist id="venues"><option value="Chromepet"><option value="Tambaram"><option value="Pallavaram"><option value="Marina Beach"><option value="Online"></datalist>
        </div>
        <fieldset class="field"><legend>Avenue</legend><div class="chips">${chips('av', D.AVENUES)}</div></fieldset>
        <fieldset class="field"><legend>Area of focus</legend><div class="chips">${chips('focus', D.FOCUS, true)}</div></fieldset>
        <div class="steppers">${stepper('vol', 'Volunteers', LF.vol, 1)}${stepper('hrs', 'Hours each', LF.hrs, 1)}${stepper('ben', 'Number of beneficiaries', LF.ben, 10)}</div>
        <p class="calc">Service hours worked out for you: <b class="fig" id="out-mh">${LF.vol * LF.hrs}</b></p>
        <fieldset class="field"><legend>Outcome</legend><div class="chips">${chips('out', OUTCOMES, true)}</div></fieldset>
        <div class="field-row">
          <label class="toggle-row" for="lpJoint"><input type="checkbox" role="switch" class="sw" id="lpJoint" ${LF.joint ? 'checked' : ''} data-on="lp-joint"><span>Joint project with another club</span></label>
          <label class="file" for="lpPhotos">${ic('upload')}<span id="photoLbl">${LF.photos ? LF.photos + ' photos added' : 'Add photos'}</span><input id="lpPhotos" type="file" accept="image/*" multiple data-on="lp-photos"></label>
        </div>
        <div id="lpJointBox">${jointHTML()}</div>
        <div class="form-act"><button class="btn ink" type="submit">${ic('check')}Save project</button><span class="muted">Saved to November for ${esc(U.myClub().name)}</span></div>
      </form>
      <aside class="card preview">
        <div class="card-h"><h2>What the district will read</h2></div>
        <div id="lpPrev">${previewHTML()}</div>
        <p class="note">Written by simple rules from your taps. No AI needed. Edit it to say it your way, and it is saved with the project.</p>
      </aside>
    </div>`;
  });

  /* ---------- monthly report ---------- */
  const MF = { meetings: 2, att: 70, joins: 1, drops: 0, reason: '' };
  U.MF = MF;
  U.view('monthly', arg => {
    const c = U.myClub(), mi = Number(arg) === 3 ? 3 : 4, r = U.report(c, mi), rl = U.role();
    const steps = U.views_monthSteps(c, mi), done = steps.filter(s => s.done).length;
    const ps = U.projects(c, mi), d = r.data || {};
    const locked = !['none', 'draft', 'returned'].includes(r.status);
    const m = D.MONTHS[mi];
    const mstep = (k, label, v, step, unit) => `<div class="stepper"><span class="st-lbl">${label}</span><div class="st-ctl"><button type="button" class="stp" data-act="m-step" data-k="${k}" data-d="-${step}" ${locked ? 'disabled' : ''} aria-label="Less">${ic('minus')}</button><output class="fig" id="mo-${k}">${MF[k]}${unit || ''}</output><button type="button" class="stp" data-act="m-step" data-k="${k}" data-d="${step}" ${locked ? 'disabled' : ''} aria-label="More">${ic('plus')}</button></div></div>`;
    return `${head(`${m.label} report`, `Rotaract Club of ${esc(c.name)}. Due ${m.due}.`, `<div class="seg" role="tablist"><button class="${mi === 3 ? 'on' : ''}" role="tab" aria-selected="${mi === 3}" data-go="monthly" data-arg="3">October</button><button class="${mi === 4 ? 'on' : ''}" role="tab" aria-selected="${mi === 4}" data-go="monthly" data-arg="4">November</button></div>`)}
    <div class="grid-log">
      <div class="col">
        <section class="card">
          <div class="card-h"><h2>Progress</h2>${U.rpill(r.status)}</div>
          <div class="prog"><span class="bt"><i style="--w:${(done / steps.length).toFixed(2)}"></i></span><span class="fig">${done} of ${steps.length}</span></div>
          ${U.tracker(r.status)}
        </section>
        <section class="card">
          <div class="card-h"><h2>1. Projects</h2><span class="muted">Filled from your log</span></div>
          ${ps.length ? `<ul class="kv">${ps.map(p => `<li><span><b>${esc(p.name)}</b><small class="sub">${p.day} ${m.label.slice(0, 3)}, ${esc(p.avenue)}${p.jointWith && p.jointWith.length ? ', with ' + esc(listJoin(p.jointWith)) : ''}</small>${p.text ? `<small class="sub">${esc(p.text)}</small>` : ''}</span><b class="fig">${p.manHours} h</b></li>`).join('')}</ul>` : `<div class="empty sm">${ic('doc')}<b>No projects logged for ${m.label}</b><span>Log one, or tell us it was a quiet month.</span></div>`}
          <div class="row-btns">${locked ? '' : `<button class="btn" data-go="log">${ic('plus')}Log a project</button><button class="btn" data-act="quiet" data-m="${mi}">Quiet month</button>`}</div>
          ${d.nothing ? `<p class="callout">${ic('info')}Marked as a quiet month: ${esc(d.reason)}.</p>` : ''}
        </section>
        <section class="card">
          <div class="card-h"><h2>2. Meetings</h2></div>
          <div class="steppers">${mstep('meetings', 'Board meetings', MF.meetings, 1)}${mstep('att', 'Attendance', MF.att, 5, '%')}</div>
        </section>
        <section class="card">
          <div class="card-h"><h2>3. Membership</h2></div>
          <div class="steppers">${mstep('joins', 'New members', MF.joins, 1)}${mstep('drops', 'Left the club', MF.drops, 1)}</div>
        </section>
        <section class="card">
          <div class="card-h"><h2>4. Fees</h2><span class="muted">Checked from the club wallet</span></div>
          <p class="note">${steps[3].done ? 'Nothing overdue. Good to go.' : 'You have an overdue fee. Clear it from the club wallet before sending.'}</p>
        </section>
      </div>
      <aside class="card preview sticky">
        <div class="card-h"><h2>Your report</h2></div>
        <p class="gen" id="mPreview">${esc(summary(c, mi, Object.assign({}, MF, d)))}</p>
        ${locked ? `<p class="note">Sent to the GRS${r.hist && r.hist.length ? '. ' + esc(r.hist[r.hist.length - 1].t) : ''}. ${r.status === 'grs' ? 'Your GRS checks it next, then the DRS.' : 'It is with the district now.'}</p>`
          : U.can.sendReport() ? `<button class="btn ink full" data-act="submit-month" data-m="${mi}">${ic('send')}Send to GRS</button><p class="note">The president or the secretary can send it. One of you is enough, no second sign-off. Late reports still go through, with fewer points.</p>`
          : `<p class="note">Your president or secretary sends this report. You can see how far it has got.</p>`}
      </aside>
    </div>`;
  });

  /* ---------- club wallet ---------- */
  // One payment covers everything the club ticks. The club pays once by UPI and gives one reference, the district checks once.
  let PAYSEL = null;
  U.paySel = ids => { if (ids) PAYSEL = new Set(ids); return PAYSEL; };
  U.views_wallet = () => {
    const c = U.myClub(), w = U.wallet(c);
    const open = w.filter(x => x.status !== 'verified');
    const owe = open.reduce((a, x) => a + x.amount, 0), paid = w.filter(x => x.status === 'verified').reduce((a, x) => a + x.amount, 0);
    const canPay = U.can.pay();
    const payable = w.filter(x => x.status === 'due' || x.status === 'overdue');
    if (!PAYSEL) PAYSEL = new Set(payable.map(x => x.id));
    PAYSEL = new Set(payable.filter(x => PAYSEL.has(x.id)).map(x => x.id));
    const pick = payable.filter(x => PAYSEL.has(x.id)), total = pick.reduce((a, x) => a + x.amount, 0);
    return `${head('Club wallet', `Everything ${esc(c.name)} owes the district this year, and what is already settled.`)}
    <div class="grid-2">
      <section class="card owe-card ${owe ? 'has' : ''}">
        <span class="muted">${owe ? 'Open balance' : 'All clear'}</span>
        <b class="owe-big fig" data-count="${owe}" data-pre="₹">${inr(owe)}</b>
        <div class="split"><span class="bt"><i style="--w:${(paid / (paid + owe || 1)).toFixed(3)}"></i></span><small class="fig">${inr(paid)} paid of ${inr(paid + owe)}</small></div>
      </section>
      <section class="card">
        <div class="card-h"><h2>How paying works</h2></div>
        <ol class="ladder"><li><b>1</b><span>Tick what you are paying. Everything is ticked by default.</span></li><li><b>2</b><span>Make one UPI payment for the total.</span></li><li><b>3</b><span>Give the one reference. The treasurer checks it once against the bank.</span></li></ol>
      </section>
    </div>
    <section class="card">
      <div class="card-h"><h2>Fees and dues</h2>${canPay && payable.length ? `<span class="muted">${pick.length} of ${payable.length} ticked</span>` : ''}</div>
      <ul class="ledger">${w.map(x => {
        const can = canPay && (x.status === 'due' || x.status === 'overdue');
        return `<li class="${x.status}">
        <div class="lg-t">${can ? `<input type="checkbox" class="pay-pick" id="pk-${x.id}" ${PAYSEL.has(x.id) ? 'checked' : ''} data-on="pay-pick" data-id="${x.id}" aria-label="Include ${esc(x.head)}">` : ''}<span><b>${esc(x.head)}</b><small class="sub">${esc(x.detail)}, due ${x.due}${x.ref ? `, ${esc(x.ref)}` : ''}</small></span></div>
        <b class="fig">${inr(x.amount)}</b>
        <div class="lg-s">${x.status === 'verified' ? '<span class="stamp">Paid</span>' : U.ppill(x.status)}</div>
      </li>`; }).join('')}</ul>
      ${canPay && payable.length ? `<div class="pay-bar"><div><span class="muted">One payment for</span><b class="fig">${inr(total)}</b></div><button class="btn ink" data-act="pay-selected" ${pick.length ? '' : 'disabled'}>${ic('rupee')}Pay ${pick.length || ''} ${pick.length === 1 ? 'item' : 'items'} in one go</button></div>` : !canPay && open.length ? `<p class="note">The president or the treasurer makes the payment.</p>` : ''}
    </section>`;
  };
  U.view('wallet', () => U.views_wallet());

  /* ---------- district finance ---------- */
  const FF = { page: 1 };
  U.FF = FF;
  // One row per payment, not per fee: a club that paid three fees with one UPI reference is one line to check.
  function pendingGroups() {
    const groups = {};
    U.activeClubs().forEach(c => U.wallet(c).forEach(w => {
      if (w.status !== 'pending') return;
      const k = c.id + '|' + (w.ref || w.id);
      (groups[k] = groups[k] || { c, ref: w.ref || '', items: [] }).items.push(w);
    }));
    return Object.values(groups).map(g => Object.assign(g, { total: g.items.reduce((a, x) => a + x.amount, 0) }));
  }
  U.pendingGroups = pendingGroups;
  function verifyRows() {
    const per = 8, list = pendingGroups();
    const pages = Math.max(1, Math.ceil(list.length / per));
    if (FF.page > pages) FF.page = pages;
    return {
      body: list.slice((FF.page - 1) * per, FF.page * per).map(g => `<tr><td><b>${esc(g.c.name)}</b><small class="sub">${esc(g.items.map(x => x.head.replace('District ', '')).join(', '))}</small></td><td class="fig">${esc(g.ref)}</td><td class="fig r">${inr(g.total)}</td><td class="r"><button class="btn sm ink" data-act="verify" data-ids="${g.items.map(x => x.id).join(',')}">Confirm</button></td></tr>`).join('') || `<tr><td colspan="4"><div class="empty">${ic('check')}<b>All payments checked</b><span>New UPI references from clubs show up here.</span></div></td></tr>`,
      pager: U.pager(list.length, FF.page, per, 'f-page'), n: list.length
    };
  }
  U.verifyRows = verifyRows;
  U.views_finance = () => {
    const act = U.activeClubs();
    let got = 0, pend = 0, due = 0, over = 0;
    const byG = {}, byHead = {};
    act.forEach(c => U.wallet(c).forEach(w => {
      const g = U.groupOf(c); byG[g] = byG[g] || { got: 0, all: 0 }; byG[g].all += w.amount;
      byHead[w.head] = byHead[w.head] || { got: 0, all: 0 }; byHead[w.head].all += w.amount;
      if (w.status === 'verified') { got += w.amount; byG[g].got += w.amount; byHead[w.head].got += w.amount; }
      else if (w.status === 'pending') pend += w.amount; else if (w.status === 'overdue') over += w.amount; else due += w.amount;
    }));
    const v = verifyRows();
    return `${head('District finance', 'Dues and event fees from every club. Clubs pay by UPI and you confirm each reference.')}
    <div class="stats">${U.fig(got, 'Collected', '', '₹')}${U.fig(pend, 'Waiting for your check', `${v.n} payment${v.n === 1 ? '' : 's'}, one line each`, '₹')}${U.fig(due, 'Due, not yet late', '', '₹')}${U.fig(over, 'Overdue', '', '₹')}</div>
    <div class="grid-cc">
      <section class="card">
        <div class="card-h"><h2>Check payments</h2>${v.n ? `<button class="btn sm ink" data-act="bank-open">${ic('upload')}Match bank statement</button>` : ''}</div>
        <p class="note tight">Upload the bank statement once and every payment whose UPI reference and amount match is confirmed for you. Only the ones that do not match are left to check by hand.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Club and fee</th><th>Reference</th><th class="r">Amount</th><th><span class="sr">Action</span></th></tr></thead><tbody id="vRows">${v.body}</tbody></table></div>
        <div id="vPager">${v.pager}</div>
      </section>
      <div class="col">
        <section class="card"><div class="card-h"><h2>By group</h2><span class="muted">Share collected</span></div>
          <div class="bars">${D.GROUPS.map(g => U.bar(`<span class="gdot" style="--g:${U.gcolor(g.id)}"></span>${g.name}`, byG[g.id] ? byG[g.id].got : 0, byG[g.id] ? byG[g.id].all : 1, pct(byG[g.id] ? byG[g.id].got : 0, byG[g.id] ? byG[g.id].all : 1) + '%', U.gcolor(g.id))).join('')}</div></section>
        <section class="card"><div class="card-h"><h2>By fee</h2></div>
          <div class="bars">${Object.entries(byHead).map(([k, x]) => U.bar(esc(k.replace('District ', '')), x.got, x.all, pct(x.got, x.all) + '%')).join('')}</div></section>
      </div>
    </div>`;
  };
  U.view('finance', () => U.views_finance());
})();
