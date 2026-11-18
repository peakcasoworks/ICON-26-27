/* Dues and event fees. The District Treasurer raises dues and sets each event's fee a head. The GRR or GRS agrees a
   count with each club of their group, by phone or in person, and fixes it here. The club then owes count x fee in its
   wallet, and registers that many members on its Event fees page. */
(function () {
  const U = UI, { esc, num, inr, ic, P, save } = U;
  const head = (...a) => U.head(...a);
  const A = U.extraActions = U.extraActions || {}, F = U.extraForms = U.extraForms || {};
  const canFee = () => U.isLead() || U.role() === 'dt';
  const canCount = () => ['grr', 'grs', 'gco'].includes(U.role()) || U.isLead();
  const paidOf = (e, c) => { const r = U.regOf(e, c); return r ? Object.values(r).filter(x => x.paid).length : 0; };
  const isDemo = c => U.demoClubs().some(x => x.id === c.id);
  const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const dueDate = s => { const d = new Date(s + 'T12:00'); return isNaN(d) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  const SCOPES = () => [['all', 'Every club'], ['College', 'College clubs'], ['Community', 'Community clubs']].concat(D.GROUPS.map(g => ['g' + g.id, 'Group ' + g.id]));
  const scopeName = s => (SCOPES().find(x => x[0] === s) || [s, s])[1];

  /* ---------- the treasurer's page ---------- */
  U.view('dues', () => {
    const act = U.activeClubs(), edit = canFee();
    // What clubs owe, grouped by what it is for: raised dues, the yearly dues and every event count.
    const lines = {};
    act.forEach(c => U.wallet(c).forEach(w => {
      const k = w.ev || w.head, L = (lines[k] = lines[k] || { head: w.head, ev: w.ev, clubs: 0, paid: 0, checking: 0, owed: 0, got: 0, ids: [] });
      L.clubs++; L.ids.push(w.id);
      if (w.status === 'verified') { L.paid++; L.got += w.amount; } else { L.owed += w.amount; if (w.status === 'pending') L.checking++; }
    }));
    const evs = D.EVENTS.filter(e => e.status !== 'Done' && e.kind !== 'Council' && e.id !== 'josh');
    const feeRow = e => {
      const fee = U.feeOf(e), fx = act.filter(c => U.countOf(e, c) != null), ppl = fx.reduce((n, c) => n + U.seatsOf(e, c), 0);
      return `<tr><td><b>${esc(e.name)}</b><small class="sub">${esc(e.date)}</small></td>
        <td data-l="Fee a head">${edit ? `<form class="fee-f" data-form="fee-set" data-ev="${e.id}"><label class="sr" for="fee-${e.id}">Fee a head for ${esc(e.name)}</label><span class="fee-in"><span aria-hidden="true">₹</span><input id="fee-${e.id}" name="fee" type="number" inputmode="numeric" min="0" step="50" value="${fee || ''}" placeholder="No fee"></span><button class="btn sm" type="submit">Set</button></form>` : fee ? inr(fee) : 'No fee'}</td>
        <td class="fig r" data-l="Clubs with a count">${fee ? `${fx.length} of ${act.length}` : ''}</td>
        <td class="fig r" data-l="People">${fee ? num(ppl) : ''}</td>
        <td class="fig r" data-l="Owed to the district">${fee ? inr(ppl * fee) : ''}</td></tr>`;
    };
    const dueRows = Object.values(lines).sort((a, b) => b.owed - a.owed);
    return `${head('Dues and event fees', 'Raise what clubs pay, set each event\'s fee a head, and see who still owes. Event fees follow the count each GRR or GRS fixes with the club.')}
    <div class="stats">${U.fig(dueRows.reduce((n, l) => n + l.got, 0), 'Collected', 'Paid and checked', '₹')}${U.fig(dueRows.reduce((n, l) => n + l.owed, 0), 'Still owed', 'By all clubs', '₹')}${U.fig(dueRows.reduce((n, l) => n + l.checking, 0), 'Payments to check', 'On the finance page')}${U.fig(act.filter(c => U.wallet(c).some(w => w.status === 'overdue')).length, 'Clubs overdue', `of ${act.length}`)}</div>
    <section class="card"><div class="card-h"><h2>Event fees</h2><span class="muted">${edit ? 'Set a fee and the GRRs are asked for counts' : 'Set by the District Treasurer'}</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>Fee a head</th><th class="r">Clubs with a count</th><th class="r">People</th><th class="r">Owed to the district</th></tr></thead><tbody>${evs.map(feeRow).join('')}</tbody></table></div></section>
    ${edit ? `<section class="card"><div class="card-h"><h2>Raise a due</h2></div><form class="form" data-form="due-raise">
      <label class="field" for="duH"><span>What it is for</span><input id="duH" name="head" required maxlength="60" placeholder="District directory contribution"></label>
      <div class="field-row"><label class="field" for="duA"><span>Amount, in rupees</span><input id="duA" name="amount" type="number" inputmode="numeric" min="1" step="1" required></label>
      <label class="field" for="duM"><span>Charged</span><select id="duM" name="mode"><option value="club">Once per club</option><option value="member">Per member</option></select></label></div>
      <div class="field-row"><label class="field" for="duS"><span>Which clubs</span><select id="duS" name="scope">${SCOPES().map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label class="field" for="duD"><span>Pay by</span><input id="duD" name="due" type="date" min="2026-11-19" required></label></div>
      <div class="form-act"><button class="btn ink" type="submit">${ic('send')}Raise it</button><span class="muted">It shows in each club wallet, and their president and treasurer are told.</span></div></form></section>` : ''}
    <section class="card"><div class="card-h"><h2>Who still owes</h2><span class="muted">${dueRows.length} lines</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>For</th><th class="r">Clubs paid</th><th class="r">Collected</th><th class="r">Still owed</th><th><span class="sr">Remind</span></th></tr></thead><tbody>${dueRows.map(l => `<tr><td><b>${esc(l.head)}</b>${l.ev ? '<small class="sub">Event count</small>' : ''}</td><td class="fig r" data-l="Clubs paid">${l.paid} of ${l.clubs}</td><td class="fig r" data-l="Collected">${inr(l.got)}</td><td class="fig r" data-l="Still owed">${inr(l.owed)}</td><td>${edit && l.owed ? `<button class="btn sm" data-act="due-remind" data-k="${esc(l.ev || l.head)}" data-h="${esc(l.head)}">${ic('bell')}Remind ${l.clubs - l.paid}</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
  });
  F['fee-set'] = f => {
    if (!canFee()) return;
    const e = D.EVENTS.find(x => x.id === f.dataset.ev), v = Math.max(0, Math.round(Number(new FormData(f).get('fee')) || 0)), was = U.feeOf(e);
    P.fees = P.fees || {}; P.fees[e.id] = v; save();
    if (v && v !== was) ['grr', 'grs', 'gco'].forEach(r => U.notify(r, `The ${e.name} fee is ${inr(v)} a head. Agree a count with each club and fix it.`, 'counts'));
    U.rerender(); U.toast(v ? `${e.name}: ${inr(v)} a head. The GRRs and GRSs are asked for counts.` : `${e.name} has no fee now.`);
  };
  F['due-raise'] = f => {
    if (!canFee()) return;
    const d = new FormData(f), x = { id: 'd' + Date.now().toString(36), head: d.get('head').trim(), amount: Math.round(Number(d.get('amount'))), mode: d.get('mode'), scope: d.get('scope'), due: dueDate(d.get('due')) };
    if (!x.head || !(x.amount > 0)) return;
    (P.dues = P.dues || []).push(x); save();
    const n = U.activeClubs().filter(c => U.dueApplies(x, c)).length;
    if (U.demoClubs().some(c => U.dueApplies(x, c))) ['pres', 'trs'].forEach(r => U.notify(r, `New due from the district: ${x.head}, ${inr(x.amount)}${x.mode === 'member' ? ' a member' : ''}, by ${x.due}.`, 'wallet'));
    U.rerender(); U.toast(`Raised for ${n} clubs (${scopeName(x.scope).toLowerCase()}). It is in their wallets now.`);
  };
  A['due-remind'] = el => {
    const k = el.dataset.k, owing = U.activeClubs().filter(c => U.wallet(c).some(w => (w.ev || w.head) === k && w.status !== 'verified'));
    if (owing.some(isDemo)) ['pres', 'trs'].forEach(r => U.notify(r, `Reminder from the District Treasurer: ${el.dataset.h} is still unpaid.`, 'wallet'));
    U.toast(`Reminder sent to ${owing.length} clubs.`);
  };

  /* ---------- the GRR and GRS page ---------- */
  const CT = { ev: null, g: null };
  U.view('counts', arg => {
    const evs = U.countEvents(), rl = U.role(), groupLevel = U.level() === 'group';
    if (arg && evs.some(e => e.id === arg)) CT.ev = arg;
    if (!evs.length) return `${head('Club counts', 'How many members each club sends to an event.')}<section class="card"><div class="empty">${ic('users')}<b>No event needs counts yet</b><span>When the District Treasurer sets an event's fee, it shows here for you to fix each club's count.</span></div></section>`;
    const e = evs.find(x => x.id === CT.ev) || evs[0]; CT.ev = e.id;
    const g = groupLevel ? U.MY_GROUP : (CT.g || 1); CT.g = g;
    const cs = U.activeClubs().filter(c => U.groupOf(c) === g), fee = U.feeOf(e), edit = canCount();
    const fixed = cs.filter(c => U.countOf(e, c) != null), ppl = fixed.reduce((n, c) => n + U.seatsOf(e, c), 0), reg = cs.reduce((n, c) => n + paidOf(e, c), 0);
    const chip = x => `<button class="chip${x.id === e.id ? ' on' : ''}" data-act="ct-ev" data-v="${x.id}" aria-pressed="${x.id === e.id}">${esc(x.name)}</button>`;
    const gchip = x => `<button class="chip${x.id === g ? ' on' : ''}" style="--g:${U.gcolor(x.id)}" data-act="ct-g" data-v="${x.id}" aria-pressed="${x.id === g}">Group ${x.id}</button>`;
    const row = c => {
      const n = U.countOf(e, c), p = paidOf(e, c), when = P.countAt && P.countAt[e.id + '|' + c.id];
      const ctl = n == null
        ? (edit ? `<button class="btn sm ink" data-act="ct-fix" data-c="${c.id}">Fix a count</button>` : '<span class="muted">Not fixed</span>')
        : (edit ? `<div class="st-ctl ct-step"><button type="button" class="stp" data-act="ct-step" data-c="${c.id}" data-d="-1" ${n <= 0 ? 'disabled' : ''} aria-label="One fewer for ${esc(c.name)}">${ic('minus')}</button><output class="fig">${n}</output><button type="button" class="stp" data-act="ct-step" data-c="${c.id}" data-d="1" aria-label="One more for ${esc(c.name)}">${ic('plus')}</button></div>` : `<b class="fig">${n}</b>`);
      return `<tr><td><b>${esc(c.name)}</b><small class="sub">${esc(c.type)}, ${c.members} members${when ? `. Fixed ${esc(when)}` : ''}</small></td>
        <td data-l="Count">${ctl}</td>
        <td class="fig r" data-l="Owes">${n ? inr(n * fee) : ''}</td>
        <td data-l="Registered">${n ? (p >= n ? U.pill('All registered', 'ok') : U.pill(`${p} of ${n}, ${n - p} pending`, 'warn')) : n === 0 ? '<span class="muted">Not sending</span>' : U.pill('Count not fixed', 'neutral')}</td></tr>`;
    };
    return `${head('Club counts', 'Agree each club\'s count by phone or when you meet, then fix it here. The club\'s wallet updates at once and it registers that many members.')}
    <div class="chips" aria-label="Event">${evs.map(chip).join('')}</div>
    ${groupLevel ? '' : `<div class="chips" aria-label="Group">${D.GROUPS.map(gchip).join('')}</div>`}
    <div class="stats">${U.fig(fixed.length, 'Counts fixed', `of ${cs.length} clubs in Group ${g}`)}${U.fig(ppl, 'People', `${esc(e.name)}, ${esc(e.date)}`)}${U.fig(ppl * fee, 'Owed by these clubs', `${inr(fee)} a head`, '₹')}${U.fig(reg, 'Registered so far', ppl > reg ? `${ppl - reg} pending` : 'None pending')}</div>
    <section class="card"><div class="card-h"><h2>Group ${g}, ${esc(e.name)}</h2>${edit && cs.length > fixed.length ? `<span class="muted">${cs.length - fixed.length} to fix</span>` : ''}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Club</th><th>Count</th><th class="r">Owes</th><th>Registered</th></tr></thead><tbody>${cs.map(row).join('')}</tbody></table></div>
      <p class="note">The fee a head is set by the District Treasurer. A count of 0 means the club is not sending anyone.</p></section>`;
  });
  const setN = (c, e, n) => {
    U.setCount(e, c, n); P.countAt = P.countAt || {}; P.countAt[e.id + '|' + c.id] = today() + ' by ' + U.R().label; save();
    // One notice per event: a later change replaces the earlier one instead of stacking up.
    const lead = `Your ${e.name} count is fixed at`;
    P.extraNotifs = (P.extraNotifs || []).filter(x => !x.t.startsWith(lead));
    if (isDemo(c)) ['pres', 'trs'].forEach(r => U.notify(r, `${lead} ${n}. ${inr(n * U.feeOf(e))} is in your club wallet. Register ${n} member${n === 1 ? '' : 's'} on the Event fees page.`, 'collect'));
  };
  A['ct-ev'] = el => { CT.ev = el.dataset.v; U.rerender(); };
  A['ct-g'] = el => { CT.g = Number(el.dataset.v); U.rerender(); };
  // Fixing asks for the number agreed with the club, then + and - adjust it later.
  A['ct-fix'] = el => {
    if (!canCount()) return;
    const e = D.EVENTS.find(x => x.id === CT.ev), c = U.club(el.dataset.c);
    U.sheet(`<h2 class="sh-h">${esc(c.name)}, ${esc(e.name)}</h2><p class="note">How many members did the club agree to send? ${inr(U.feeOf(e))} a head goes into their wallet.</p>
      <form class="form" data-form="ct-set" data-c="${c.id}"><label class="field" for="ctN"><span>Agreed count</span><input id="ctN" name="n" type="number" inputmode="numeric" min="0" max="${c.members}" required autofocus></label>
      <div class="form-act"><button class="btn ink" type="submit">Fix the count</button><span class="muted">${c.members} members in the club</span></div></form>`);
  };
  F['ct-set'] = f => {
    if (!canCount()) return;
    const e = D.EVENTS.find(x => x.id === CT.ev), c = U.club(f.dataset.c), n = Math.max(0, Math.round(Number(new FormData(f).get('n')) || 0));
    setN(c, e, n); U.closeSheet(); U.rerender(); U.toast(n ? `${c.name}: ${n} fixed. ${inr(n * U.feeOf(e))} is in their wallet.` : `${c.name} is not sending anyone.`);
  };
  A['ct-step'] = el => {
    if (!canCount()) return;
    const e = D.EVENTS.find(x => x.id === CT.ev), c = U.club(el.dataset.c), n = Math.max(0, (U.countOf(e, c) || 0) + Number(el.dataset.d));
    setN(c, e, n); U.rerender();
  };
})();
