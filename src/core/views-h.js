/* Round 10: event fees collected by the club double as the registration and the attendance list.
   Members pay the club, the president or treasurer ticks who paid, that list is who goes, the club pays the district once for
   exactly that many seats, and the district counts attendance from the same list. Nothing is typed twice. */
(function () {
  const U = UI, { esc, num, inr, ic, P, save } = U;
  const head = (...a) => U.head(...a);
  const A = U.extraActions;
  const key = m => m.added ? 'n' + (-m.i) : m.id;
  const feeEvents = () => U.countEvents();
  const regMap = (e, c) => U.regOf(e, c) || {};
  const paidList = (e, c) => Object.entries(regMap(e, c)).filter(([, v]) => v.paid);
  const CF = { ev: null, q: '', show: 'all' };
  const canTick = () => ['pres', 'trs'].includes(U.role());

  U.view('collect', () => {
    const club = U.myClub(), evs = feeEvents();
    if (!evs.length) return `${head('Event fees', 'Members pay the club, and the club pays the district once.')}<section class="card"><div class="empty">${ic('rupee')}<b>No event fees right now</b><span>When the District Treasurer sets a fee and your GRR fixes your club's count, it shows here.</span></div></section>`;
    const e = evs.find(x => x.id === CF.ev) || evs[0]; CF.ev = e.id;
    const fixed = U.countOf(e, club) != null;
    const seats = U.seatsOf(e, club), paid = paidList(e, club), roster = U.rosterOf(club);
    const q = CF.q.trim().toLowerCase();
    const shown = roster.filter(m => (CF.show === 'all' || (CF.show === 'paid') === !!regMap(e, club)[key(m)]?.paid) && (!q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)));
    const unpaid = roster.length - paid.length, got = paid.reduce((a, [, v]) => a + (v.amt || 0), 0), left = seats - paid.length;
    const fee = U.feeOf(e), word = fee ? 'Paid' : 'Going';
    const chip = x => `<button class="chip${x.id === e.id ? ' on' : ''}" data-act="col-ev" data-v="${x.id}" aria-pressed="${x.id === e.id}">${esc(x.name)}</button>`;
    const f = (v, l) => `<button class="chip${CF.show === v ? ' on' : ''}" data-act="col-show" data-v="${v}" aria-pressed="${CF.show === v}">${l}</button>`;
    if (!fixed) return `${head('Event fees', 'Your GRR or GRS agrees your club\'s count with you, then fixes it here.')}
    <div class="chips" aria-label="Event">${evs.map(chip).join('')}</div>
    <section class="card"><div class="empty">${ic('users')}<b>Your count for ${esc(e.name)} is not fixed yet</b><span>Your GRR or GRS will call to agree how many members your club sends. Once they fix it, the fee shows in your club wallet and you register that many members here.</span></div></section>`;
    return `${head('Event fees', fee ? 'Members pay the club. Tick who has paid and they are registered. The club then pays the district for its count.' : 'Tick who is coming. They are registered for the event.')}
    <div class="chips" aria-label="Event">${evs.map(chip).join('')}</div>
    <div class="stats">${U.fig(seats, 'Your club\'s count', 'Fixed with your GRR or GRS')}${U.fig(paid.length, fee ? 'Paid and registered' : 'Registered', left > 0 ? `${left} still to register` : 'Everyone registered')}${U.fig(unpaid, fee ? 'Not paid yet' : 'Not registered', `of ${roster.length} members`)}${fee ? U.fig(got, 'Collected from members', `${inr(seats * fee)} owed to the district`, '₹') : U.fig(paid.length, 'Going')}</div>
    <section class="card">
      <div class="card-h"><h2>${esc(e.name)}, ${esc(e.date)}</h2><span class="muted">${fee ? inr(fee) + ' a head' : 'No fee'}</span></div>
      <div class="filters"><label class="search">${ic('search')}<span class="sr">Search members</span><input type="search" placeholder="Search a member" value="${esc(CF.q)}" data-on="col-q" autocomplete="off"></label><div class="chips">${f('all', 'Everyone')}${f('paid', word)}${f('unpaid', 'Not yet')}</div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Post</th><th>${fee ? 'Paid to the club' : 'Going'}</th><th>${fee ? 'Received' : ''}</th></tr></thead><tbody id="colRows">${shown.slice(0, 60).map(m => {
        const r = regMap(e, club)[key(m)], on = !!(r && r.paid), disable = !canTick() || (!on && left <= 0);
        return `<tr><td><span class="pp">${esc(m.name.split(' ').map(x => x[0]).join(''))}</span><b>${esc(m.name)}</b></td><td>${esc(m.role)}</td><td><label class="sw-row"><input type="checkbox" role="switch" class="sw" ${on ? 'checked' : ''} ${disable ? 'disabled' : ''} data-on="col-tick" data-ev="${e.id}" data-m="${esc(key(m))}" aria-label="${word}: ${esc(m.name)}"><span>${on ? word : 'Not yet'}</span></label></td><td class="fig">${on ? `${fee ? inr(r.amt) + ', ' : ''}${esc(r.at)}` : ''}</td></tr>`;
      }).join('') || `<tr><td colspan="4"><div class="empty">${ic('users')}<b>Nobody matches</b></div></td></tr>`}</tbody></table></div>
      ${!canTick() ? '<p class="note">The president or the treasurer ticks who has paid.</p>' : left <= 0 ? `<p class="callout warn">${ic('alert')}All ${seats} places in your count are registered. <button class="lnk" data-act="col-more" data-ev="${e.id}">Ask your GRR to raise the count</button></p>` : ''}
      <div class="row-btns"><button class="btn" data-act="col-remind" data-ev="${e.id}">${ic('send')}Copy a reminder for those not paid</button>${paid.length ? `<button class="btn" data-act="col-export" data-ev="${e.id}">${ic('upload')}Download the list</button>` : ''}${fee ? `<button class="btn ink" data-go="wallet">${ic('rupee')}Pay the district ${inr(seats * fee)}</button>` : ''}</div>
    </section>`;
  });
  A['col-ev'] = el => { CF.ev = el.dataset.v; U.rerender(); };
  A['col-show'] = el => { CF.show = el.dataset.v; U.rerender(); };
  U.extraInputs['col-q'] = el => { CF.q = el.value; const pos = el.selectionStart; U.rerender(); const n = U.$('[data-on=col-q]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
  U.extraInputs['col-tick'] = el => {
    const e = D.EVENTS.find(x => x.id === el.dataset.ev), club = U.myClub();
    P.reg = P.reg || {}; const r = ((P.reg[e.id] = P.reg[e.id] || {})[club.id] = P.reg[e.id][club.id] || {});
    if (el.checked) { if (paidList(e, club).length >= U.seatsOf(e, club)) { U.rerender(); return; } r[el.dataset.m] = { paid: true, amt: U.feeOf(e), at: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), by: U.R().label }; }
    else r[el.dataset.m] = { paid: false };
    U.paySel(null); save(); U.rerender();
  };
  A['col-more'] = el => { const e = D.EVENTS.find(x => x.id === el.dataset.ev); ['grr', 'grs'].forEach(r => U.notify(r, `${U.myClub().name} registered its full ${e.name} count and asks to raise it.`, 'counts')); U.toast('Sent to your GRR and GRS. They can raise your count.'); };
  A['col-remind'] = el => {
    const e = D.EVENTS.find(x => x.id === el.dataset.ev), club = U.myClub(), paid = new Set(paidList(e, club).map(([k]) => k));
    const names = U.rosterOf(club).filter(m => !paid.has(key(m))).map(m => m.name);
    const t = `Reminder: ${e.name}, ${e.date}. ${U.feeOf(e) ? `Please pay ${inr(U.feeOf(e))} to the club treasurer to get your place. ` : 'Tell the club you are coming. '}Not yet: ${names.slice(0, 15).join(', ')}${names.length > 15 ? ' and ' + (names.length - 15) + ' more' : ''}.`;
    const done = () => U.toast('Reminder copied. Paste it in your club group.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, done); else done();
  };
  A['col-export'] = el => {
    const e = D.EVENTS.find(x => x.id === el.dataset.ev), club = U.myClub(), by = Object.fromEntries(U.rosterOf(club).map(m => [key(m), m]));
    U.download(`${e.id}-${club.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-registered.csv`, [['Name', 'Number', 'Post', 'Paid to the club', 'Date']].concat(paidList(e, club).map(([k, v]) => { const m = by[k]; return [m ? m.name : k, m ? m.id : k, m ? m.role : '', v.amt, v.at]; })));
  };

  /* what the district and the group see: registrations, from the same list */
  U.regSummary = e => {
    if (!U.feeOf(e) || U.level() === 'club') return '';
    const clubs = U.activeClubs().filter(U.canSeeClub), withReg = clubs.filter(c => U.regOf(e, c));
    const rows = clubs.map(c => ({ c, n: U.regOf(e, c) ? paidList(e, c).length : null, seats: U.seatsOf(e, c) })), fee = U.feeOf(e);
    const total = rows.reduce((a, r) => a + (r.n || 0), 0), seats = rows.reduce((a, r) => a + r.seats, 0);
    return `<section class="card"><div class="card-h"><h2>Registered by the clubs</h2><span class="muted">${withReg.length} of ${clubs.length} clubs have started</span></div>
      <div class="prog"><span class="bt"><i style="--w:${seats ? Math.min(1, total / seats).toFixed(2) : 0}"></i></span><span class="fig">${total} of ${seats} registered</span></div>
      <p class="note">Each club ticks who paid. That list is who is registered, and the fee the club pays the district is for exactly those people.</p>
      ${withReg.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Club</th><th class="r">Registered</th><th class="r">Count</th>${fee ? '<th class="r">Owed</th>' : ''}</tr></thead><tbody>${rows.filter(r => r.n != null).map(r => `<tr><td>${esc(r.c.name)}</td><td class="fig r">${r.n}</td><td class="fig r">${r.seats}</td>${fee ? `<td class="fig r">${inr(r.seats * fee)}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : ''}</section>`;
  };
})();
