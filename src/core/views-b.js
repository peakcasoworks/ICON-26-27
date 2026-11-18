/* Views: clubs, club detail, groups, people directory, designations. */
(function () {
  const U = UI, { esc, num, inr, ic, pct, P } = U;
  const head = (...a) => U.head(...a);
  const canAdmin = () => ['drr', 'drs', 'gco'].includes(U.role());
  const noAccess = what => `${head(esc(what), 'Not part of your login.')}<section class="card"><div class="empty">${ic('lock')}<b>This is outside your ${U.level() === 'group' ? 'group' : 'club'}</b><span>Your login only shows ${U.level() === 'group' ? 'the clubs and people of Group ' + U.MY_GROUP : 'your own club'}. Ask a district official if you need more.</span><button class="btn sm" data-go="home">Back to home</button></div></section>`;

  /* ---------- clubs ---------- */
  const CF = { q: '', g: 0, type: '', st: 'Active', page: 1 };
  U.CF = CF;
  function clubRows() {
    const per = 15;
    const scopeG = U.level() === 'group' ? U.MY_GROUP : CF.g;
    const q = CF.q.trim().toLowerCase();
    const list = U.visibleClubs().filter(c => (!scopeG || U.groupOf(c) === scopeG) && (!CF.type || c.type === CF.type) && (!CF.st || U.stateOf(c) === CF.st) && (!q || c.name.toLowerCase().includes(q) || c.place.toLowerCase().includes(q)));
    const pages = Math.max(1, Math.ceil(list.length / per));
    if (CF.page > pages) CF.page = pages;
    const rows = list.slice((CF.page - 1) * per, CF.page * per);
    return {
      body: rows.length ? rows.map(c => {
        const st = U.report(c, 3).status, w = U.wallet(c);
        const fee = w.some(x => x.status === 'overdue') ? 'overdue' : w.some(x => x.status === 'due') ? 'due' : 'verified';
        return `<tr data-go="club" data-arg="${c.id}" tabindex="0" role="link"><td><b>${esc(c.name)}</b><small class="sub">${esc(c.place)}</small></td><td>${U.gpill(U.groupOf(c))}</td><td>${c.type}</td><td class="fig r">${num(c.members)}</td><td>${c.isNew ? U.pill('New', 'neutral') : U.rpill(st)}</td><td>${U.ppill(fee)}</td><td>${U.pill(U.stateOf(c), U.stateOf(c) === 'Active' ? 'ok' : U.stateOf(c) === 'Proposed' ? 'neutral' : 'bad')}</td></tr>`;
      }).join('') : `<tr><td colspan="7"><div class="empty">${ic('search')}<b>No clubs match</b><span>Clear the search or pick another filter.</span><button class="btn sm" data-act="club-clear">Clear filters</button></div></td></tr>`,
      pager: U.pager(list.length, CF.page, per, 'club-page')
    };
  }
  U.clubRows = clubRows;
  U.view('clubs', () => {
    const all = U.visibleClubs();
    const counts = s => all.filter(c => U.stateOf(c) === s).length;
    const r = clubRows();
    const chip = (key, val, label) => `<button class="chip${CF[key] === val ? ' on' : ''}" data-act="club-f" data-k="${key}" data-v="${val}" aria-pressed="${CF[key] === val}">${label}</button>`;
    return `${head('Clubs', `${counts('Active')} active, ${counts('Proposed')} proposed, ${counts('Inactive')} inactive. The count is worked out from each club's state, never typed in.`, canAdmin() ? `<button class="btn ink" data-act="charter">${ic('plus')}Charter a club</button>` : '')}
    <section class="card">
      <div class="filters">
        <label class="search">${ic('search')}<span class="sr">Search clubs</span><input id="clubQ" type="search" placeholder="Search by club or area" value="${esc(CF.q)}" data-on="club-q" autocomplete="off"></label>
        <div class="chips" aria-label="Club type">${chip('type', '', 'All types')}${chip('type', 'Community', 'Community')}${chip('type', 'College', 'College')}</div>
        <div class="chips" aria-label="Club state">${chip('st', 'Active', 'Active')}${chip('st', 'Proposed', 'Proposed')}${chip('st', 'Inactive', 'Inactive')}${chip('st', '', 'Any state')}</div>
        ${U.level() === 'group' ? '' : `<label class="sel"><span class="sr">Group</span><select id="clubG" data-on="club-g"><option value="0">All groups</option>${D.GROUPS.map(g => `<option value="${g.id}" ${CF.g === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}</select></label>`}
      </div>
      <div class="tbl-wrap"><table class="tbl hover"><thead><tr><th>Club</th><th>Group</th><th>Type</th><th class="r">Members</th><th>October report</th><th>Fees</th><th>State</th></tr></thead><tbody id="clubRows">${r.body}</tbody></table></div>
      <div id="clubPager">${r.pager}</div>
    </section>`;
  });

  /* ---------- club detail ---------- */
  U.view('club', arg => {
    const c = U.club(arg) || U.myClub();
    if (!U.canSeeClub(c)) return noAccess('Club');
    const st = U.stateOf(c), g = U.groupOf(c);
    const w = U.wallet(c), open = w.filter(x => x.status !== 'verified').reduce((a, x) => a + x.amount, 0);
    const log = (P.clubs[c.id] && P.clubs[c.id].log) || [];
    const projs = U.projects(c, 3).concat(U.projects(c, 4));
    const hours = projs.reduce((a, p) => a + p.manHours, 0), ben = projs.reduce((a, p) => a + p.beneficiaries, 0);
    return `<div class="g-band" style="--g:${U.gcolor(g)}"><span>Rotaract Club of ${esc(c.name)}</span><small>Group ${g}, ${c.type.toLowerCase()} club, sponsored by ${esc(c.sponsor || 'a Rotary club')}</small></div>
    ${head(esc(c.name), `${esc(c.place)}. Chartered ${c.chartered}. ${num(U.paidMembers(c))} paid members${U.unpaidMembers(c) ? `, ${U.unpaidMembers(c)} not paid yet` : ''}.`, `${canAdmin() ? `<button class="btn ink" data-act="lifecycle" data-id="${c.id}">Change state</button>` : ''}`)}
    <div class="stats">
      <div class="stat"><span class="st-l">State</span><b class="st-v">${U.pill(st, st === 'Active' ? 'ok' : st === 'Proposed' ? 'neutral' : 'bad')}</b></div>
      ${U.fig(projs.length, 'Projects, Oct and Nov')}
      ${U.fig(hours, 'Service hours')}
      ${U.fig(open, 'Open fees', '', '₹')}
    </div>
    <div class="grid-2">
      <section class="card">
        <div class="card-h"><h2>Monthly reports</h2><button class="lnk" data-go="report" data-arg="${c.id}">Latest report</button></div>
        <ul class="months">${D.MONTHS.map((m, i) => { const r = U.report(c, i); return `<li><span>${m.label}</span>${U.rpill(r.status)}${r.late && r.status === 'accepted' ? '<small class="late">late</small>' : ''}</li>`; }).join('')}</ul>
      </section>
      <section class="card">
        <div class="card-h"><h2>Board</h2></div>
        <ul class="kv"><li><span>President</span><b>${esc(c.president)}</b></li><li><span>Secretary</span><b>${esc(c.secretary)}</b></li><li><span>Treasurer</span><b>${esc(c.treasurer)}</b></li><li><span>Beneficiaries, Oct and Nov</span><b class="fig">${num(ben)}</b></li></ul>
        ${canAdmin() ? `<label class="field inline" for="moveG"><span>Assign to group</span><select id="moveG" data-on="move-group" data-id="${c.id}">${D.GROUPS.map(x => `<option value="${x.id}" ${x.id === g ? 'selected' : ''}>${x.name}, ${esc(x.area)}</option>`).join('')}</select></label>` : ''}
      </section>
    </div>
    <section class="card">
      <div class="card-h"><h2>Recent projects</h2><span class="muted">${projs.length} in October and November</span></div>
      ${projs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Project</th><th>Avenue</th><th class="r">Volunteers</th><th class="r">Hours</th><th class="r">Beneficiaries</th></tr></thead><tbody>${projs.slice(0, 8).map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.avenue)}</td><td class="fig r">${p.volunteers}</td><td class="fig r">${p.manHours}</td><td class="fig r">${num(p.beneficiaries)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${ic('doc')}<b>No projects logged yet</b><span>Projects appear here as soon as the secretary logs them.</span></div>`}
    </section>
    <section class="card">
      <div class="card-h"><h2>State history</h2></div>
      <ul class="kv">${log.map(l => `<li><span>${esc(l.to)}: ${esc(l.why)}</span><small class="sub">Today, by ${esc(U.R().label)}</small></li>`).join('')}<li><span>Active</span><small class="sub">Chartered ${c.chartered}</small></li></ul>
    </section>`;
  });

  /* ---------- groups ---------- */
  U.view('groups', () => {
    const act = U.activeClubs();
    return `${head('Groups', 'Clubs are split into seven groups. Each has a GRR, a GRS and its own colour for the season.', U.isLead() ? `<button class="btn" data-go="season">Pick group colours</button>` : '')}
    <div class="grid-cc">
      <div class="g-cards">${D.GROUPS.map(g => {
        const cs = act.filter(c => U.groupOf(c) === g.id);
        const ok = cs.filter(c => U.report(c, 3).status === 'accepted').length;
        return `<button class="g-card" style="--g:${U.gcolor(g.id)}" data-go="group" data-arg="${g.id}"><span class="g-sw"></span><span class="g-t"><b>${g.name}</b><small>${esc(g.area)}</small></span><span class="g-m"><span><b class="fig">${cs.length}</b> clubs</span><span><b class="fig">${num(cs.reduce((a, c) => a + U.paidMembers(c), 0))}</b> paid members</span><span><b class="fig">${pct(ok, cs.length)}%</b> October</span></span><span class="g-who">GRR ${esc(g.grr)}<br>GRS ${esc(g.grs)}</span></button>`;
      }).join('')}</div>
      <section class="card"><div class="card-h"><h2>Group race</h2><span class="muted">October reports</span></div>${U.race(U.groupStandings())}</section>
    </div>`;
  });

  /* ---------- people ---------- */
  // Posts every club has to fill, and the usual extras. A club can add its own (Editor, PRO, Chief Whip ...), because boards differ.
  const MANDATORY = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Sergeant-at-Arms'];
  const COMMON = ['Joint Secretary', 'Associate Sergeant-at-Arms', 'Immediate Past President (IPP)', 'Board member', 'Member'];
  U.POSTS = { MANDATORY, COMMON };
  U.customPosts = () => P.posts[U.myClub().id] || [];
  U.allPosts = () => MANDATORY.concat(COMMON, U.customPosts());
  const PF = { q: '', role: '', page: 1, club: 0 };
  let ALL = null;
  const base = () => { if (!ALL) { ALL = []; for (let i = 0; i < D.memberCount; i++) ALL.push(D.member(i)); } return ALL; };
  const added = () => P.members.map((x, k) => ({ i: -1 - k, k, name: x.name, club: U.club(x.club), role: x.post, points: 0, joined: x.joined || 2026, id: (x.ra || x.ri || '').trim() || 'No RA ID yet', paid: U.isPaidMember(x), added: true, x }));
  U.rosterOf = club => base().filter(m => m.club.id === club.id).concat(added().filter(m => m.club.id === club.id));
  const allMembers = () => base().concat(added());
  const isOwn = () => U.level() === 'club';
  function peopleList() {
    const q = PF.q.trim().toLowerCase();
    const isBoard = r => r !== 'Member';
    return allMembers().filter(m => U.canSeePerson(m) && (!PF.club || m.club.id === PF.club) && (!PF.role || (PF.role === 'Board' ? isBoard(m.role) : m.role === PF.role)) && (!q || m.name.toLowerCase().includes(q) || m.club.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)));
  }
  function peopleRows() {
    const per = 25, list = peopleList();
    const pages = Math.max(1, Math.ceil(list.length / per));
    if (PF.page > pages) PF.page = pages;
    const rows = list.slice((PF.page - 1) * per, PF.page * per);
    const phone = isOwn() ? `<td class="lock">${ic('check')}<span>Your club</span></td>` : `<td class="lock">${ic('lock')}<span>District officials</span></td>`;
    return {
      body: rows.length ? rows.map(m => `<tr><td><span class="pp">${esc(m.name.split(' ').map(x => x[0]).join(''))}</span><b>${esc(m.name)}</b>${m.added ? ' ' + U.pill('New', 'ok') : ''}${m.district ? `<small class="sub">Also ${esc(m.district)}</small>` : ''}</td><td>${esc(m.club.name)}</td><td>${esc(m.role)}</td><td class="fig">${esc(m.id)}</td><td>${m.added && !m.paid ? U.pill('Not paid', 'warn') + (U.can.roster() ? ` <button class="btn sm" data-act="mem-paid" data-k="${m.k}">Mark paid</button>` : '') : U.pill('Paid', 'ok')}</td><td class="fig r">${m.points}</td>${phone}</tr>`).join('') : `<tr><td colspan="7"><div class="empty">${ic('users')}<b>Nobody matches</b><span>Try part of a name, a post or an ID.</span></div></td></tr>`,
      pager: U.pager(list.length, PF.page, per, 'people-page'),
      total: list.length
    };
  }
  U.peopleRows = peopleRows; U.PF = PF; U.peopleList = peopleList;

  function postsCard() {
    const club = U.myClub(), roster = U.rosterOf(club), manage = U.can.roster();
    const holders = post => roster.filter(m => m.role === post);
    const row = post => {
      const h = holders(post);
      return `<li><span><b>${esc(post)}</b><small class="sub">${h.length ? esc(h.map(x => x.name).join(', ')) : 'Not filled yet'}</small></span>${h.length ? U.pill('Filled', 'ok') : manage ? `<button class="btn sm ink" data-act="add-member" data-post="${esc(post)}">Add</button>` : U.pill('Open', 'warn')}</li>`;
    };
    const custom = U.customPosts();
    const open = MANDATORY.filter(p => !holders(p).length).length;
    return `<section class="card">
      <div class="card-h"><h2>Club posts</h2><span class="muted">${open ? open + ' of ' + MANDATORY.length + ' required posts still open' : 'All required posts are filled'}</span></div>
      <ul class="kv">${MANDATORY.map(row).join('')}</ul>
      ${custom.length ? `<h3 class="sub-h">Your own posts</h3><ul class="kv">${custom.map(row).join('')}</ul>` : ''}
      ${manage ? `<div class="row-btns"><button class="btn" data-act="add-post">${ic('plus')}Add your own post</button><span class="muted">Boards differ. Add Editor, PRO, Chief Whip or anything your club uses.</span></div>` : ''}
    </section>`;
  }

  U.view('people', () => {
    const own = isOwn(), manage = U.can.roster(), grp = U.level() === 'group';
    const r = peopleRows();
    const chip = (v, l) => `<button class="chip${PF.role === v ? ' on' : ''}" data-act="people-f" data-v="${v}" aria-pressed="${PF.role === v}">${l}</button>`;
    const count = peopleList().length;
    const title = own ? 'Club roster' : 'People';
    const club = U.myClub(), up = U.unpaidMembers(club);
    const sub = own ? `${num(U.paidMembers(club))} paid members${up ? `, ${up} not paid yet` : ''}. Only paid members count in the district total. ${manage ? 'Add them one by one or import the whole roster.' : 'The president and secretary keep this list.'}`
      : grp ? `${num(count)} Rotaractors in Group ${U.MY_GROUP}. Phone numbers and addresses stay private.` : `${num(U.paidTotal())} paid members across the district. Phone numbers and addresses stay private.`;
    const act = manage ? `<button class="btn" data-act="import">${ic('upload')}Import roster</button><button class="btn ink" data-act="add-member">${ic('plus')}Add member</button>` : U.can.exportAll() ? `<button class="btn" data-act="export-data">${ic('upload')}Export district data</button>` : '';
    return `${head(title, sub, act)}
    ${own ? postsCard() : ''}
    <section class="card">
      <div class="filters">
        <label class="search">${ic('search')}<span class="sr">Search people</span><input id="peopleQ" type="search" placeholder="${own ? 'Search name, post or ID' : 'Search name, club or ID'}" value="${esc(PF.q)}" data-on="people-q" autocomplete="off"></label>
        <div class="chips">${chip('', 'Everyone')}${chip('Board', 'Board')}${chip('President', 'Presidents')}${chip('Secretary', 'Secretaries')}</div>
      </div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Club</th><th>Post</th><th>RA member ID</th><th>Membership</th><th class="r">Points</th><th>Phone</th></tr></thead><tbody id="peopleRows">${r.body}</tbody></table></div>
      <div id="peoplePager">${r.pager}</div>
    </section>
    <p class="note">${own ? 'You see your own club only. District officials see every club and each group\'s officials see their group.' : 'Privacy levels: everyone sees name, club and post. District officials see phone and email. Only the member and the database team see address and date of birth. Blood group lives in an opt-in donor list.'}</p>`;
  });

  /* ---------- designations ---------- */
  U.view('designations', () => {
    const list = D.designations.concat(P.desig);
    const teams = [...new Set(list.map(d => d.team))];
    const twice = list.find(d => d.title === 'RYLA Chairman');
    return `${head('Designations', `${list.length} posts this season. Titles change every year. Each title points to an access template, so access never breaks.`, `<button class="btn ink" data-act="add-desig">${ic('plus')}Add a post</button>`)}
    <section class="card callout">${ic('badge')}<p><b>${esc(twice.holder)}</b> holds two posts: RYLA Chairman and Chairperson, Blood Donation. They switch between both from one login.</p></section>
    <div class="grid-2">
      ${teams.map(t => `<section class="card"><div class="card-h"><h2>${esc(t)}</h2><span class="muted fig">${list.filter(d => d.team === t).length}</span></div>
        <ul class="desig">${list.filter(d => d.team === t).map(d => `<li><div><b>${esc(d.title)}</b><small class="sub">${esc(d.holder)}${(c => c ? `, ${esc(c.name)}` : '')(d.holderClub ? U.club(d.holderClub) : (D.homeOf(d.holder) || {}).club)}, ${esc(d.scope)}</small></div>${U.pill(d.tpl, d.isNew ? 'ok' : 'neutral')}</li>`).join('')}</ul></section>`).join('')}
    </div>
    <section class="card"><div class="card-h"><h2>Access templates</h2></div><ul class="kv">${Object.entries(D.TEMPLATES).map(([k, v]) => `<li><span><b>${k}</b><small class="sub">${v}</small></span></li>`).join('')}</ul></section>`;
  });
})();
