/* Views and actions added in round 1: seat allotment, the group coordinator desk, roster tools (posts, import, ChatGPT prompt),
   district export, bank-statement matching, one-go payments, colour choice, and the public start page sections. */
(function () {
  const U = UI, { esc, num, inr, ic, pct, P, save } = U;
  const head = (...a) => U.head(...a);
  const A = {}, F = {}, I = {};
  U.extraActions = A; U.extraForms = F; U.extraInputs = I;
  const chipRow = (name, opts, on, extra = {}) => `<div class="chips" role="radiogroup">${opts.map(o => {
    const label = typeof o === 'string' ? o : o.label, tag = typeof o === 'string' ? '' : o.tag || '';
    return `<button type="button" class="chip${label === on ? ' on' : ''}" role="radio" aria-checked="${label === on}" data-act="pick" data-name="${name}" data-v="${esc(label)}">${esc(label)}${tag ? `<small class="chip-tag">${esc(tag)}</small>` : ''}</button>`;
  }).join('')}<input type="hidden" name="${name}" value="${esc(on || '')}"></div>`;
  const dayStr = () => new Date().toISOString().slice(0, 10);

  /* =====================================================================
     Seat allotment: the district gives each group a pool, the GRR or GRS spreads it over the clubs.
     ===================================================================== */
  const SF = { ev: null, g: 6 };
  U.view('seats', arg => {
    const evs = U.seatEvents();
    if (arg && evs.find(x => x.id === arg)) SF.ev = arg;
    const e = evs.find(x => x.id === SF.ev) || evs[0];
    SF.ev = e.id;
    const district = U.level() === 'district';
    const gid = district ? SF.g : U.MY_GROUP;
    const g = D.GROUPS[gid - 1];
    const cs = U.activeClubs().filter(c => U.groupOf(c) === gid);
    const pool = U.poolOf(e, gid), used = U.spent(e, gid), left = pool - used;
    const canEdit = U.can.seats();
    const poolsTotal = D.GROUPS.reduce((a, x) => a + U.poolOf(e, x.id), 0);
    const evChip = x => `<button class="chip${x.id === e.id ? ' on' : ''}" data-act="seat-event" data-v="${x.id}" aria-pressed="${x.id === e.id}">${esc(x.name)}</button>`;
    const gChip = x => `<button class="chip${x.id === gid ? ' on' : ''}" style="--g:${U.gcolor(x.id)}" data-act="seat-group" data-v="${x.id}" aria-pressed="${x.id === gid}">Group ${x.id}</button>`;
    const stepper = (act, attrs, v, minus, plus) => `<div class="st-ctl"><button type="button" class="stp" data-act="${act}" ${attrs} data-d="-1" ${minus ? '' : 'disabled'} aria-label="One seat fewer">${ic('minus')}</button><output class="fig">${v}</output><button type="button" class="stp" data-act="${act}" ${attrs} data-d="1" ${plus ? '' : 'disabled'} aria-label="One seat more">${ic('plus')}</button></div>`;
    return `${head('Seat allotment', 'The district gives each group a pool of seats. The GRR or GRS spreads them over the clubs in the group. Each club\'s fee follows its seats.', district ? `<button class="btn" data-act="export-seats">${ic('upload')}Export allotment</button>` : '')}
    <div class="chips" aria-label="Event">${evs.map(evChip).join('')}</div>
    ${district ? `<section class="card">
      <div class="card-h"><h2>Group pools, ${esc(e.name)}</h2><span class="muted fig">${poolsTotal}${e.seats ? ' of ' + e.seats : ''} seats given out</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Group</th><th>GRR and GRS</th><th class="r">Clubs</th><th>Pool</th><th class="r">Spread</th></tr></thead><tbody>${D.GROUPS.map(x => {
        const p = U.poolOf(e, x.id), u = U.spent(e, x.id);
        const room = e.seats ? poolsTotal < e.seats : true;
        return `<tr><td>${U.gpill(x.id)}</td><td><small class="sub">${esc(x.grr)}, ${esc(x.grs)}</small></td><td class="fig r">${U.activeClubs().filter(c => U.groupOf(c) === x.id).length}</td><td>${stepper('pool-step', `data-g="${x.id}"`, p, p > u, room)}</td><td class="fig r">${u} of ${p}</td></tr>`;
      }).join('')}</tbody></table></div>
      <p class="note">Changing a pool never takes seats away from clubs that already have them. Drop a club's seats first to lower a pool.</p>
    </section>
    <div class="chips" aria-label="Group">${D.GROUPS.map(gChip).join('')}</div>` : ''}
    <section class="card">
      <div class="card-h"><h2>Clubs in ${g.name}, ${esc(e.name)}</h2><span class="muted fig">${left} of ${pool} seats left to give</span></div>
      <div class="prog"><span class="bt"><i style="--w:${pool ? (used / pool).toFixed(2) : 0}"></i></span><span class="fig">${used} of ${pool}</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Club</th><th>Type</th><th>Seats</th><th class="r">Registered</th>${e.fee ? '<th class="r">Fee for the club</th>' : ''}</tr></thead><tbody>${cs.map(c => {
        const n = U.seatsOf(e, c), rg = U.regOf(e, c), reg = rg ? Object.values(rg).filter(x => x.paid).length : null;
        return `<tr><td><b>${esc(c.name)}</b><small class="sub">${c.members} members</small></td><td>${c.type}</td><td>${canEdit ? stepper('seat-step', `data-c="${c.id}" data-g="${gid}"`, n, n > 0, left > 0) : `<b class="fig">${n}</b>`}</td><td class="fig r">${reg == null ? '<span class="muted">not started</span>' : reg}</td>${e.fee ? `<td class="fig r">${inr((reg == null ? n : reg) * e.fee)}</td>` : ''}</tr>`;
      }).join('')}</tbody></table></div>
      ${canEdit ? '' : '<p class="note">Your group lead gives the seats.</p>'}
      <p class="note">${e.fee ? `${inr(e.fee)} a seat. ` : ''}The club sees its seats on the event page and the fee in its wallet. Nothing is typed twice.</p>
    </section>`;
  });
  const ensure = id => (P.alloc[id] = P.alloc[id] || { club: {}, pool: {} });
  A['seat-event'] = el => { SF.ev = el.dataset.v; U.rerender(); };
  A['seat-group'] = el => { SF.g = Number(el.dataset.v); U.rerender(); };
  A['seat-step'] = el => {
    const e = D.EVENTS.find(x => x.id === SF.ev), c = U.club(el.dataset.c), g = Number(el.dataset.g), d = Number(el.dataset.d);
    const cur = U.seatsOf(e, c), next = cur + d;
    if (next < 0 || (d > 0 && U.spent(e, g) + d > U.poolOf(e, g))) return;
    ensure(e.id).club[c.id] = next; save(); U.resetScore && U.resetScore(); U.rerender();
  };
  A['pool-step'] = el => {
    const e = D.EVENTS.find(x => x.id === SF.ev), g = Number(el.dataset.g), d = Number(el.dataset.d);
    const next = U.poolOf(e, g) + d;
    if (next < U.spent(e, g)) return;
    ensure(e.id).pool[g] = next; save(); U.rerender();
  };
  A['export-seats'] = () => {
    const rows = [['Event', 'Group', 'Club', 'Club type', 'Seats', 'Fee per seat', 'Fee for the club']];
    U.seatEvents().forEach(e => U.activeClubs().forEach(c => rows.push([e.name, 'Group ' + U.groupOf(c), c.name, c.type, U.seatsOf(e, c), e.fee || 0, (e.fee || 0) * U.seatsOf(e, c)])));
    U.download('seat-allotment.csv', rows); U.toast('Seat allotment downloaded');
  };

  /* =====================================================================
     Group coordinator desk: every GRR and GRS in one place.
     ===================================================================== */
  U.views_gco = () => {
    const act = U.activeClubs();
    const rows = D.GROUPS.map(g => {
      const cs = act.filter(c => U.groupOf(c) === g.id);
      const ok = cs.filter(c => ['accepted', 'drs'].includes(U.report(c, 3).status)).length;
      const waiting = cs.filter(c => U.report(c, 3).status === 'grs').length;
      const late = cs.filter(c => ['none', 'draft', 'returned'].includes(U.report(c, 3).status)).length;
      const ryla = D.EVENTS.find(e => e.id === 'ryla');
      return { g, cs, ok, waiting, late, left: U.poolOf(ryla, g.id) - U.spent(ryla, g.id) };
    });
    const waitingAll = rows.reduce((a, r) => a + r.waiting, 0), lateAll = rows.reduce((a, r) => a + r.late, 0);
    return `${head('Group desk', 'You look after every GRR and GRS. See which group needs a push, move clubs between groups and spread seats.', `<button class="btn" data-act="export-data">${ic('upload')}Export district data</button><button class="btn ink" data-go="seats">${ic('id')}Assign seats</button>`)}
    <div class="stats">
      ${U.fig(7, 'Groups', '7 GRRs and 7 GRSs')}
      ${U.fig(act.length, 'Active clubs')}
      ${U.fig(waitingAll, 'Reports with a GRS now', 'Waiting for a group check')}
      ${U.fig(lateAll, 'Clubs not filed', 'October, across all groups')}
    </div>
    <section class="card">
      <div class="card-h"><h2>Every group</h2><span class="muted">GRR and GRS of each</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Group</th><th>GRR</th><th>GRS</th><th class="r">Clubs</th><th>October accepted</th><th class="r">Waiting for check</th><th class="r">RYLA seats left</th><th><span class="sr">Open</span></th></tr></thead><tbody>${rows.map(r => `<tr><td>${U.gpill(r.g.id)}<small class="sub">${esc(r.g.area)}</small></td><td>${esc(r.g.grr)}</td><td>${esc(r.g.grs)}</td><td class="fig r">${r.cs.length}</td><td>${U.ring ? `<span class="fig">${pct(r.ok, r.cs.length)}%</span>` : ''}</td><td class="fig r">${r.waiting}</td><td class="fig r">${r.left}</td><td class="r"><button class="btn sm" data-go="group" data-arg="${r.g.id}">Open</button></td></tr>`).join('')}</tbody></table></div>
    </section>
    <section class="card"><div class="card-h"><h2>Group race</h2><span class="muted">October reports</span></div>${U.race(U.groupStandings())}</section>`;
  };

  /* =====================================================================
     Roster: add a member, add your own post, import.
     ===================================================================== */
  const COLS = { all: ['full_name', 'email', 'phone', 'post', 'ri_id', 'date_joined'], college: ['department', 'year_of_study'], community: ['profession', 'organisation'] };
  const colsFor = club => COLS.all.concat(club.type === 'College' ? COLS.college : COLS.community);
  const SAMPLE = {
    College: [['Anitha R.', 'anitha@example.com', '9876500001', 'President', 'RI-0000001', '2025-07-01', 'Mechanical', '3'], ['Karthik S.', '', '9876500002', 'Secretary', '', '2025-07-01', 'Computer Science', '3'], ['Meena V.', 'meena@example.com', '', 'Member', '', '2026-08-12', 'Commerce', '2']],
    Community: [['Anitha R.', 'anitha@example.com', '9876500001', 'President', 'RI-0000001', '2019-07-01', 'Architect', 'Studio Madras'], ['Karthik S.', '', '9876500002', 'Secretary', '', '2020-07-01', 'Software engineer', 'Zoho'], ['Meena V.', 'meena@example.com', '', 'Member', '', '2024-08-12', 'Teacher', 'Corporation school']]
  };
  const postNeeded = club => { const have = new Set(U.rosterOf(club).map(m => m.role)); return U.POSTS.MANDATORY.filter(p => !have.has(p)); };

  A['add-member'] = el => {
    const club = U.myClub(), college = club.type === 'College', need = postNeeded(club);
    const preset = (el && el.dataset && el.dataset.post) || 'Member';
    const posts = U.allPosts().map(p => ({ label: p, tag: need.includes(p) ? 'needed' : '' }));
    U.sheet(`<h2 class="sh-h">Add a member</h2><p class="note">${esc(club.name)}, a ${college ? 'college' : 'community'} club. ${need.length ? `Still open: ${esc(need.join(', '))}.` : 'All required posts are filled.'}</p>
      <form data-form="member" class="form">
        <label class="field" for="amN"><span>Full name</span><input id="amN" name="name" required autofocus></label>
        <div class="field-row"><label class="field" for="amE"><span>Email</span><input id="amE" name="email" type="email" placeholder="name@example.com"></label><label class="field" for="amP"><span>Phone</span><input id="amP" name="phone" inputmode="tel" placeholder="10-digit mobile"></label></div>
        <label class="field" for="amR"><span>RI ID from My Rotary, if they have one</span><input id="amR" name="ri" placeholder="Leave empty if not known yet"></label>
        ${college ? `<div class="field-row"><label class="field" for="amD"><span>Department</span><input id="amD" name="dept" placeholder="Mechanical"></label><label class="field" for="amY"><span>Year of study</span><select id="amY" name="year"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>Alumnus</option></select></label></div>`
          : `<div class="field-row"><label class="field" for="amD"><span>Profession</span><input id="amD" name="dept" placeholder="Architect"></label><label class="field" for="amO"><span>Organisation</span><input id="amO" name="org" placeholder="Where they work"></label></div>`}
        <fieldset class="field"><legend>Post</legend>${chipRow('post', posts, preset)}</fieldset>
        <label class="field" for="amC"><span>Or a post of your own, optional</span><input id="amC" name="custom" placeholder="Editor, PRO, Chief Whip ..."></label>
        <div class="form-act"><button class="btn ink" type="submit">Add member</button><span class="muted">They get a link to set up their pass.</span></div></form>`);
  };
  F.member = f => {
    const d = new FormData(f), club = U.myClub();
    const name = (d.get('name') || '').trim(), email = (d.get('email') || '').trim(), phone = (d.get('phone') || '').trim();
    if (!name) return;
    if (!email && !phone) { U.toast('Add an email or a phone so they can get their pass', 'info'); return; }
    let post = (d.get('custom') || '').trim() || d.get('post') || 'Member';
    if (!U.allPosts().includes(post)) { P.posts[club.id] = (P.posts[club.id] || []).concat([post]); }
    P.members.push({ club: club.id, name, email, phone, ri: (d.get('ri') || '').trim(), post, dept: d.get('dept') || '', year: d.get('year') || '', org: d.get('org') || '', joined: new Date().getFullYear() });
    save(); U.closeSheet(); U.rerender();
    U.toast(`${name} added as ${post}. They get a link to set up their pass.`);
  };
  A['add-post'] = () => {
    U.sheet(`<h2 class="sh-h">Add your own post</h2><p class="note">Every board is different. The required posts stay, and you can add the ones your club uses.</p>
      <form data-form="post" class="form"><label class="field" for="apN"><span>Post name</span><input id="apN" name="title" required placeholder="Editor, PRO, Chief Whip, Club Mentor" autofocus></label>
      <div class="form-act"><button class="btn ink" type="submit">Add post</button></div></form>`);
  };
  F.post = f => {
    const t = (new FormData(f).get('title') || '').trim(), club = U.myClub();
    if (!t) return;
    if (U.allPosts().some(p => p.toLowerCase() === t.toLowerCase())) { U.toast('Your club already has that post', 'info'); return; }
    P.posts[club.id] = (P.posts[club.id] || []).concat([t]); save(); U.closeSheet(); U.rerender(); U.toast(`${t} added to your club's posts`);
  };

  /* ---- import ---- */
  const csvEsc = v => (/[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v);
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
      else cur += ch;
    }
    row.push(cur); if (row.some(x => x.trim())) rows.push(row);
    return rows;
  }
  const ALIAS = { name: 'full_name', fullname: 'full_name', membername: 'full_name', mobile: 'phone', mobilenumber: 'phone', phonenumber: 'phone', contact: 'phone', emailid: 'email', mail: 'email', designation: 'post', position: 'post', role: 'post', riid: 'ri_id', rimemberid: 'ri_id', rotaryid: 'ri_id', myrotaryid: 'ri_id', riidmyrotary: 'ri_id', joined: 'date_joined', datejoined: 'date_joined', joiningdate: 'date_joined', branch: 'department', dept: 'department', year: 'year_of_study', yearofstudy: 'year_of_study', occupation: 'profession', company: 'organisation', organization: 'organisation' };
  const norm = h => { const k = h.toLowerCase().replace(/[^a-z0-9]/g, ''); return ALIAS[k] || h.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_'); };
  let IMP = null;
  function readRoster(text, club) {
    const table = parseCSV(text);
    if (table.length < 2) return { error: 'The file has no member rows. Use the template or the ChatGPT prompt to get the columns right.' };
    const cols = table[0].map(norm);
    if (!cols.includes('full_name')) return { error: 'There is no full_name column. Download the template to see the columns we need.' };
    const posts = U.allPosts(), lower = posts.map(p => p.toLowerCase());
    const existing = U.rosterOf(club), seen = new Set(P.members.filter(m => m.club === club.id).flatMap(m => [m.email, m.phone, m.ri].filter(Boolean)));
    const out = [], bad = [];
    table.slice(1).forEach((r, i) => {
      const o = {}; cols.forEach((c, k) => { o[c] = (r[k] || '').trim(); });
      const probs = [];
      if (!o.full_name) probs.push('no name');
      if (!o.email && !o.phone) probs.push('no email or phone');
      if (o.email && !/^\S+@\S+\.\S+$/.test(o.email)) probs.push('email looks wrong');
      const keys = [o.email, o.phone, o.ri_id].filter(Boolean);
      if (keys.some(k => seen.has(k))) probs.push('already in the file or the roster');
      if (existing.some(m => o.full_name && m.name.toLowerCase() === o.full_name.toLowerCase())) probs.push('same name already in the roster');
      let post = o.post || 'Member', note = '';
      const at = lower.indexOf(post.toLowerCase());
      if (at > -1) post = posts[at]; else { note = `post "${post}" is new, it will be added as your own post`; }
      if (probs.length) { bad.push({ line: i + 2, name: o.full_name || '(blank)', why: probs.join(', ') }); return; }
      keys.forEach(k => seen.add(k));
      out.push({ club: club.id, name: o.full_name, email: o.email, phone: o.phone, ri: o.ri_id, post, dept: o.department || o.profession || '', year: o.year_of_study || '', org: o.organisation || '', joined: Number((o.date_joined || '').slice(0, 4)) || new Date().getFullYear(), note });
    });
    return { rows: out, bad };
  }
  const templateRows = club => [colsFor(club)].concat(SAMPLE[club.type === 'College' ? 'College' : 'Community']);
  function promptFor(club) {
    const cols = colsFor(club).join(',');
    const extra = club.type === 'College' ? 'department (for example Mechanical) and year_of_study (1 to 5, or Alumnus)' : 'profession and organisation (where they work)';
    return `You are helping me prepare the member roster of a Rotaract club for the ICON platform of Rotaract District 3233.

Turn the member details I paste at the end into a CSV file.

Use exactly this header row, in this order:
${cols}

Rules:
- One member per row. Output only the CSV, inside one code block, with nothing before or after it.
- full_name: the person's name as they write it.
- email and phone: copy them as given. Phone is the 10-digit Indian mobile number, without +91 or spaces. If one is missing, leave it empty. Never invent an email or a phone number. Every member needs at least one of the two.
- post: one of ${U.allPosts().join(', ')}. If someone holds a post that is not in this list, write it as they say it. If no post is given, write Member.
- ri_id: the member's Rotary International ID from the My Rotary website (my.rotary.org). If they do not have one or I did not give it, leave it empty. Never guess it.
- date_joined: the date they joined the club, as YYYY-MM-DD. If only the year is known, use YYYY-07-01. If unknown, leave it empty.
- ${extra}.
- Wrap any value that has a comma in double quotes.
- Leave out anything not in the header: no addresses, no dates of birth, no blood groups, no Aadhaar or other IDs.
- After the code block do not add notes.

Our club is ${club.type === 'College' ? 'a college-based' : 'a community-based'} Rotaract club.

Here are the member details:
[paste your list here: names, phone numbers, emails, posts, RI IDs from My Rotary]`;
  }
  A.import = () => {
    const club = U.myClub(), cols = colsFor(club);
    const req = new Set(['full_name', 'post']);
    const note = { full_name: 'Required', email: 'Email or phone', phone: 'Email or phone', post: 'Required. Your club\'s posts', ri_id: 'From My Rotary. Leave empty if unknown', date_joined: 'YYYY-MM-DD', department: 'College clubs', year_of_study: '1 to 5, or Alumnus', profession: 'Community clubs', organisation: 'Where they work' };
    U.sheet(`<h2 class="sh-h">Import your roster</h2>
      <p class="note">Upload a CSV with these columns. Open your Excel sheet and use Save as, CSV. Anything we cannot match is listed so you can fix it, and nothing is lost.</p>
      <div class="tbl-wrap tight"><table class="tbl"><thead><tr>${cols.map(c => `<th>${c}${req.has(c) ? ' *' : ''}</th>`).join('')}</tr></thead><tbody>${SAMPLE[club.type === 'College' ? 'College' : 'Community'].map(r => `<tr>${r.map(v => `<td>${esc(v) || '<span class="muted">empty</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <ul class="cols-note">${cols.map(c => `<li><b>${c}</b><span>${note[c]}</span></li>`).join('')}</ul>
      <div class="row-btns"><button class="btn" data-act="tpl-download">${ic('upload')}Download template</button><button class="btn" data-act="gpt-open">${ic('spark')}Use ChatGPT to prepare it</button></div>
      <label class="file big" for="impF">${ic('upload')}<span id="impL">Choose your CSV file</span><input id="impF" type="file" accept=".csv,text/csv" data-on="import-file"></label>
      <div id="impPrev"></div>`);
  };
  A['tpl-download'] = () => { U.download('roster-template.csv', templateRows(U.myClub())); U.toast('Template downloaded'); };
  A['gpt-open'] = () => {
    const club = U.myClub(), text = promptFor(club);
    U.sheet(`<h2 class="sh-h">Prepare your roster with ChatGPT</h2>
      <ol class="ladder"><li><b>1</b><span>Copy this prompt and paste it into ChatGPT.</span></li><li><b>2</b><span>Under it, paste what you have: a WhatsApp list, a sheet, or typed names. Add each person's RI ID from My Rotary if you have it.</span></li><li><b>3</b><span>Copy the CSV it gives back into a file, save it as .csv, and upload it here.</span></li></ol>
      <textarea class="prompt" id="gptText" readonly rows="12">${esc(text)}</textarea>
      <div class="row-btns"><button class="btn ink" data-act="gpt-copy">${ic('check')}Copy prompt</button><a class="btn" id="gptLink" href="https://chatgpt.com/?q=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">${ic('link')}Open ChatGPT with the prompt</a><button class="btn" data-act="import">Back</button></div>
      <p class="note">Share only what the columns ask for. Do not paste addresses, birth dates or ID numbers. ChatGPT is a separate service, so check the CSV it gives you before you upload it.</p>`);
  };
  A['gpt-copy'] = el => {
    const t = U.$('#gptText'); t.select();
    const done = () => U.toast('Prompt copied. Paste it into ChatGPT.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, () => { document.execCommand && document.execCommand('copy'); done(); });
    else { document.execCommand && document.execCommand('copy'); done(); }
  };
  I['import-file'] = el => {
    if (!el.files.length) return;
    U.$('#impL').textContent = el.files[0].name;
    const rd = new FileReader();
    rd.onload = () => {
      const res = readRoster(String(rd.result), U.myClub()), box = U.$('#impPrev');
      if (res.error) { IMP = null; box.innerHTML = `<p class="callout warn">${ic('alert')}${esc(res.error)}</p>`; return; }
      IMP = res.rows;
      box.innerHTML = `<div class="imp-sum"><span>${U.pill(res.rows.length + ' ready', 'ok')}</span>${res.bad.length ? `<span>${U.pill(res.bad.length + ' need a fix', 'bad')}</span>` : ''}</div>
        ${res.rows.length ? `<div class="tbl-wrap tight"><table class="tbl"><thead><tr><th>Name</th><th>Post</th><th>Contact</th><th>RI ID</th></tr></thead><tbody>${res.rows.slice(0, 5).map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.post)}${r.note ? `<small class="sub">${esc(r.note)}</small>` : ''}</td><td>${esc(r.email || r.phone)}</td><td class="fig">${esc(r.ri) || '<span class="muted">pending</span>'}</td></tr>`).join('')}</tbody></table></div><p class="note">${res.rows.length > 5 ? `Showing 5 of ${res.rows.length}. ` : ''}Duplicates are skipped.</p>` : ''}
        ${res.bad.length ? `<details class="imp-bad"><summary>${res.bad.length} rows to fix in your file</summary><ul class="kv">${res.bad.slice(0, 20).map(b => `<li><span>Line ${b.line}: ${esc(b.name)}</span><small class="sub">${esc(b.why)}</small></li>`).join('')}</ul></details>` : ''}
        <button class="btn ink full" data-act="import-go" ${res.rows.length ? '' : 'disabled'}>Import ${res.rows.length} members</button>`;
    };
    rd.readAsText(el.files[0]);
  };
  A['import-go'] = () => {
    if (!IMP || !IMP.length) return;
    const club = U.myClub(), posts = U.allPosts().map(p => p.toLowerCase());
    IMP.forEach(r => { if (!posts.includes(r.post.toLowerCase())) { P.posts[club.id] = (P.posts[club.id] || []).concat([r.post]); posts.push(r.post.toLowerCase()); } P.members.push(r); });
    const n = IMP.length; IMP = null; save(); U.closeSheet(); U.rerender(); U.toast(`${n} members imported. They get a link to set up their pass.`);
  };

  /* =====================================================================
     Export the district's data (year-end, or any time).
     ===================================================================== */
  const SETS = [
    ['clubs', 'Clubs', 'Every club with its group, type, size, board and state', () => [['Club', 'Type', 'Group', 'Place', 'Members', 'State', 'Chartered', 'President', 'Secretary', 'Treasurer', 'October report', 'Fees open (INR)']].concat(U.clubs().map(c => [c.name, c.type, 'Group ' + U.groupOf(c), c.place, c.members, U.stateOf(c), c.chartered, c.president, c.secretary, c.treasurer, U.RS[U.report(c, 3).status][0], U.wallet(c).filter(w => w.status !== 'verified').reduce((a, w) => a + w.amount, 0)]))],
    ['members', 'Members', 'All members with club, post and ID. Phone and email stay with the clubs.', () => []],
    ['reports', 'Monthly reports', 'Every club\'s status for each month, with projects, hours and beneficiaries', () => { const rows = [['Club', 'Group', 'Month', 'Status', 'Late', 'Projects', 'Service hours', 'Beneficiaries']]; U.clubs().forEach(c => D.MONTHS.forEach((m, i) => { const r = U.report(c, i), ps = U.projects(c, i); rows.push([c.name, 'Group ' + U.groupOf(c), m.label, U.RS[r.status][0], r.late ? 'yes' : 'no', ps.length, ps.reduce((a, p) => a + p.manHours, 0), ps.reduce((a, p) => a + p.beneficiaries, 0)]); })); return rows; }],
    ['payments', 'Payments', 'Every fee and due for every club, with status and UPI reference', () => { const rows = [['Club', 'Group', 'Fee', 'Detail', 'Amount (INR)', 'Due', 'Status', 'Reference']]; U.clubs().forEach(c => U.wallet(c).forEach(w => rows.push([c.name, 'Group ' + U.groupOf(c), w.head, w.detail, w.amount, w.due, U.PAY[w.status][0], w.ref || '']))); return rows; }],
    ['seats', 'Seat allotment', 'Seats each club holds for each event, and the fee that follows', () => { const rows = [['Event', 'Group', 'Club', 'Seats', 'Fee for the club (INR)']]; U.seatEvents().forEach(e => U.activeClubs().forEach(c => rows.push([e.name, 'Group ' + U.groupOf(c), c.name, U.seatsOf(e, c), (e.fee || 0) * U.seatsOf(e, c)]))); return rows; }],
    ['drc', 'DRC bookings', 'Which club booked which slot at each District Rotaract Council meeting', () => U.drcRows()],
    ['moms', 'Minutes of Meeting', 'Published minutes with decisions and action items', () => U.momRows()],
    ['events', 'Events', 'The district year: dates, chairs and results', () => [['Event', 'Kind', 'Date', 'Status', 'Chair', 'Attended']].concat(D.EVENTS.map(e => [e.name, e.kind, e.date, e.status, e.chair, e.attendance || '']))]
  ];
  function allPeople() {
    const rows = [];
    for (let i = 0; i < D.memberCount; i++) { const m = D.member(i); rows.push([m.name, m.club.name, 'Group ' + U.groupOf(m.club), m.role, m.id, m.points, m.joined]); }
    P.members.forEach(x => { const c = U.club(x.club); rows.push([x.name, c.name, 'Group ' + U.groupOf(c), x.post, x.ri || 'RI ID pending', 0, x.joined]); });
    return rows;
  }
  SETS[1][3] = () => [['Name', 'Club', 'Group', 'Post', 'ID', 'Points', 'Joined']].concat(allPeople());
  A['export-data'] = () => {
    U.sheet(`<h2 class="sh-h">Export district data</h2><p class="note">Plain CSV files that open in Excel or Google Sheets. Use them for the year-end handover, audits or the awards.</p>
      <ul class="kv export">${SETS.map(s => `<li><span><b>${s[1]}</b><small class="sub">${s[2]}</small></span><button class="btn sm" data-act="export-one" data-k="${s[0]}">Download</button></li>`).join('')}</ul>
      <button class="btn ink full" data-act="export-all">Download all ${SETS.length} files</button>
      <p class="note">Your browser may ask to allow several downloads. Phone numbers, emails and addresses are not in these files.</p>`);
  };
  A['export-one'] = el => { const s = SETS.find(x => x[0] === el.dataset.k); U.download(`icon-3233-${s[0]}.csv`, s[3]()); U.toast(`${s[1]} downloaded`); };
  A['export-all'] = () => { SETS.forEach((s, i) => setTimeout(() => U.download(`icon-3233-${s[0]}.csv`, s[3]()), i * 350)); U.toast(`${SETS.length} files downloading`); };

  /* =====================================================================
     Money: pay everything in one go, and match the bank statement once.
     ===================================================================== */
  A['pay-selected'] = () => {
    const sel = U.paySel(), items = U.wallet(U.myClub()).filter(x => sel && sel.has(x.id));
    if (!items.length) return;
    const total = items.reduce((a, x) => a + x.amount, 0);
    U.sheet(`<h2 class="sh-h">Pay ${inr(total)} in one go</h2>
      <ul class="kv">${items.map(x => `<li><span>${esc(x.head)}<small class="sub">${esc(x.detail)}</small></span><b class="fig">${inr(x.amount)}</b></li>`).join('')}<li><span><b>One UPI payment</b></span><b class="fig">${inr(total)}</b></li></ul>
      <form data-form="pay-many" data-ids="${items.map(x => x.id).join(',')}" class="form">
        <label class="field" for="pyR"><span>UPI reference of that one payment</span><input id="pyR" name="ref" required inputmode="numeric" pattern="[0-9]{12}" maxlength="12" placeholder="12-digit UTR" autofocus></label>
        <label class="file" for="pyS">${ic('upload')}<span>Add payment screenshot, optional</span><input id="pyS" type="file" accept="image/*"></label>
        <div class="form-act"><button class="btn ink" type="submit">Send for checking</button><span class="muted">The treasurer checks this one line against the bank.</span></div></form>`);
  };
  F['pay-many'] = f => {
    const ref = 'UPI ' + new FormData(f).get('ref'), ids = f.dataset.ids.split(',');
    ids.forEach(id => { P.pay[id] = { status: 'pending', ref }; });
    U.paySel(null); save();
    U.notify('dt', `${U.myClub().name} sent one payment for ${ids.length} fee${ids.length > 1 ? 's' : ''}.`, 'home');
    U.closeSheet(); U.rerender(); U.toast('Sent as one payment. The treasurer confirms it once.');
  };
  I['pay-pick'] = el => {
    const sel = U.paySel() || new Set();
    if (el.checked) sel.add(el.dataset.id); else sel.delete(el.dataset.id);
    U.paySel([...sel]); U.rerender();
  };
  A.verify = el => {
    const ids = el.dataset.ids.split(',');
    ids.forEach(id => { P.pay[id] = Object.assign({}, P.pay[id] || {}, { status: 'verified' }); });
    save(); U.resetScore();
    const row = el.closest('tr'); if (row) row.classList.add('leaving');
    setTimeout(U.rerender, U.RM ? 0 : 260);
    U.toast('Payment confirmed. The club sees it as paid.');
  };
  // A sample statement for the demo: most pending payments appear, one with a wrong amount, a few not at all.
  function sampleStatement() {
    const rows = [['Date', 'Narration', 'Credit (INR)']];
    U.pendingGroups().forEach((g, i) => { if (i % 4 === 3) return; rows.push(['2026-11-' + String(10 + (i % 6)).padStart(2, '0'), `UPI/CR/${g.ref.replace(/\D/g, '')}/${g.c.name}`, i % 9 === 5 ? g.total - 100 : g.total]); });
    rows.push(['2026-11-12', 'UPI/CR/410000000000/Other credit', 2500]);
    return rows;
  }
  let MATCH = null;
  function runMatch(text) {
    const lines = text.split(/\r?\n/), groups = U.pendingGroups(), ok = [], diff = [], missing = [];
    groups.forEach(g => {
      const digits = g.ref.replace(/\D/g, '');
      const line = digits && lines.find(l => l.replace(/\s/g, '').includes(digits));
      if (!line) { missing.push(g); return; }
      const nums = (line.match(/\d[\d,]*(\.\d+)?/g) || []).map(x => Number(x.replace(/,/g, '')));
      if (nums.includes(g.total)) ok.push(g); else diff.push(g);
    });
    return { ok, diff, missing };
  }
  A['bank-open'] = () => {
    U.sheet(`<h2 class="sh-h">Match the bank statement</h2><p class="note">Upload your statement as a CSV. Each payment whose UPI reference and amount appear on a line is ready to confirm in one tap. The rest stay in the list.</p>
      <label class="file big" for="bankF">${ic('upload')}<span id="bankL">Choose the statement CSV</span><input id="bankF" type="file" accept=".csv,.txt,text/csv" data-on="bank-file"></label>
      <button class="btn full" data-act="bank-sample">Try it with a sample statement</button><div id="bankOut"></div>`);
  };
  const showMatch = text => {
    MATCH = runMatch(text);
    const m = MATCH;
    U.$('#bankOut').innerHTML = `<div class="imp-sum">${U.pill(m.ok.length + ' match', 'ok')}${m.diff.length ? U.pill(m.diff.length + ' amount differs', 'warn') : ''}${m.missing.length ? U.pill(m.missing.length + ' not on the statement', 'neutral') : ''}</div>
      ${m.diff.length ? `<ul class="kv">${m.diff.map(g => `<li><span>${esc(g.c.name)}<small class="sub">${esc(g.ref)} on the statement with another amount than ${inr(g.total)}</small></span></li>`).join('')}</ul>` : ''}
      <button class="btn ink full" data-act="bank-go" ${m.ok.length ? '' : 'disabled'}>Confirm the ${m.ok.length} that match</button>
      <p class="note">${m.diff.length + m.missing.length ? `${m.diff.length + m.missing.length} payments stay in the list for you to check by hand.` : 'Nothing is left to check by hand.'}</p>`;
  };
  I['bank-file'] = el => { if (!el.files.length) return; U.$('#bankL').textContent = el.files[0].name; const rd = new FileReader(); rd.onload = () => showMatch(String(rd.result)); rd.readAsText(el.files[0]); };
  A['bank-sample'] = () => { const rows = sampleStatement(); U.$('#bankL').textContent = 'sample-statement.csv'; showMatch(rows.map(r => r.map(csvEsc).join(',')).join('\n')); };
  A['bank-go'] = () => {
    if (!MATCH) return;
    const n = MATCH.ok.length;
    MATCH.ok.forEach(g => g.items.forEach(w => { P.pay[w.id] = Object.assign({}, P.pay[w.id] || {}, { status: 'verified' }); }));
    MATCH = null; save(); U.resetScore(); U.closeSheet(); U.rerender(); U.toast(`${n} payments confirmed from the statement`);
  };

  /* =====================================================================
     Colours: the whole site's accent, and light or dark.
     ===================================================================== */
  const ACCENTS = [
    { id: 'default', name: 'Season colour', h: 4, c: 0.215, L: 57 },
    { id: 'cranberry', name: 'Rotaract cranberry', h: 5, c: 0.21, L: 55 },
    { id: 'royal', name: 'Rotary royal blue', h: 258, c: 0.15, L: 48 },
    { id: 'gold', name: 'Rotary gold', h: 85, c: 0.15, L: 76, ink: 'oklch(22% 0.05 80)' },
    { id: 'teal', name: 'Teal', h: 196, c: 0.11, L: 52 },
    { id: 'forest', name: 'Forest', h: 155, c: 0.13, L: 50 },
    { id: 'violet', name: 'Violet', h: 298, c: 0.19, L: 50 },
    { id: 'terracotta', name: 'Chennai terracotta', h: 40, c: 0.15, L: 55 },
    { id: 'slate', name: 'Slate', h: 250, c: 0.04, L: 40 }
  ];
  U.applyTheme = () => {
    const root = document.documentElement;
    if (P.theme === 'light' || P.theme === 'dark') root.setAttribute('data-theme', P.theme); else root.removeAttribute('data-theme');
    let st = document.getElementById('accentCss');
    const a = ACCENTS.find(x => x.id === P.accent);
    if (!a || a.id === 'default') { root.removeAttribute('data-accent'); if (st) st.textContent = ''; return; }
    if (!st) { st = document.createElement('style'); st.id = 'accentCss'; document.head.appendChild(st); }
    const lt = `--accent:oklch(${a.L}% ${a.c} ${a.h});--accent-2:oklch(${a.L - 7}% ${a.c} ${a.h});--accent-soft:oklch(94% ${Math.min(0.05, a.c / 3)} ${a.h});--focus:oklch(${a.L}% ${a.c} ${a.h});--icon-accent:oklch(${a.L}% ${a.c} ${a.h});--on-accent:${a.ink || 'oklch(99% 0.004 80)'};`;
    const L2 = Math.min(82, a.L + 14);
    const dk = `--accent:oklch(${L2}% ${a.c} ${a.h});--accent-2:oklch(${Math.min(88, L2 + 6)}% ${a.c} ${a.h});--accent-soft:oklch(30% ${Math.min(0.09, a.c / 2)} ${a.h});--focus:oklch(${L2}% ${a.c} ${a.h});--icon-accent:oklch(${L2}% ${a.c} ${a.h});--on-accent:${a.ink ? a.ink : 'oklch(15% 0.035 258)'};`;
    st.textContent = `html:root[data-accent]{${lt}}@media (prefers-color-scheme:dark){html:root[data-accent]:not([data-theme="light"]){${dk}}}html:root[data-accent][data-theme="dark"]{${dk}}`;
    root.setAttribute('data-accent', a.id);
  };
  // The accent colour is the district's look: only the DRR and DRS set it, and it shows for everyone. Light or dark is each person's own.
  const canAccent = () => ['drr', 'drs'].includes(U.role());
  A.colours = () => {
    const seg = (v, l) => `<button type="button" class="${P.theme === v ? 'on' : ''}" role="radio" aria-checked="${P.theme === v}" data-act="theme-set" data-v="${v}">${l}</button>`;
    const accent = canAccent() ? `<h3 class="sub-h">District accent colour</h3><p class="note">You set this for the whole district. Everyone sees it, on every screen and on the start page.</p>
      <div class="acc-grid" role="radiogroup" aria-label="District accent colour">${ACCENTS.map(a => `<button type="button" class="acc${P.accent === a.id ? ' on' : ''}" role="radio" aria-checked="${P.accent === a.id}" style="--g:oklch(${a.L}% ${a.c} ${a.h})" data-act="accent-set" data-v="${a.id}"><i></i><span>${esc(a.name)}</span></button>`).join('')}</div>` : '';
    U.sheet(`<h2 class="sh-h">Colours</h2><p class="note">${canAccent() ? 'Pick the district\'s accent colour, and your own light or dark.' : 'Pick light or dark for yourself. The accent colour is set by the DRR or the DRS.'}</p>
      ${accent}
      <h3 class="sub-h">Light or dark</h3>
      <div class="seg" role="radiogroup" aria-label="Theme">${seg('auto', 'Match my device')}${seg('light', 'Light')}${seg('dark', 'Dark')}</div>
      <p class="note">${canAccent() ? 'The group colours and the colour of each initiative are set separately, on the Season page and in each initiative.' : 'This is saved in this browser and is only for you.'}</p>`);
  };
  A['accent-set'] = el => { if (!canAccent()) return; P.accent = el.dataset.v; save(); U.applyTheme(); A.colours(); };
  A['theme-set'] = el => { P.theme = el.dataset.v; save(); U.applyTheme(); A.colours(); };

  /* =====================================================================
     The public start page: about, history, events, gallery, leadership, clubs, contact.
     ===================================================================== */
  const GAL = [
    ['orient', 'District Orientation', '6 Jul 2026', 'Training'], ['dols', 'DOLS', '13 Jul 2026', 'Training'], ['assembly', 'District Assembly', '10 Aug 2026', 'Flagship'],
    ['josh', 'JOSH District Culturals', '21 Sep 2026', 'Culturals'], ['blood', 'Blood Donation Megacamp', '2 Oct 2026', 'Service']
  ];
  const TONES = { Training: [255, 200], Flagship: [4, 80], Culturals: [298, 60], Service: [155, 120] };
  const tile = (ev, i, big) => {
    const r = D.mulberry32(ev[0].length * 97 + i * 31), [h, h2] = TONES[ev[3]] || [4, 80];
    const sun = 30 + r() * 40, hills = [0, 1, 2].map(k => { const y = 62 + k * 10 + r() * 6; return `<path d="M0 ${y}Q${25 + r() * 20} ${y - 14 - r() * 8} 50 ${y - 4}T100 ${y - 8}V100H0Z" fill="oklch(${44 - k * 8}% 0.09 ${h + k * 12})" opacity="${0.9 - k * 0.12}"/>`; }).join('');
    const people = Array.from({ length: 5 + Math.floor(r() * 4) }, () => { const x = 8 + r() * 84, y = 72 + r() * 18; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="2.2" cy="-5" fill="oklch(90% 0.04 70)"/><path d="M-2.6 0V-3.2h5.2V0Z" fill="oklch(${55 + r() * 25}% 0.14 ${(h + r() * 160) % 360})"/></g>`; }).join('');
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(ev[1])}, sample picture"><defs><linearGradient id="gl${i}${big ? 'b' : ''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="oklch(78% 0.1 ${h2})"/><stop offset="1" stop-color="oklch(92% 0.06 ${h})"/></linearGradient></defs><rect width="100" height="100" fill="url(#gl${i}${big ? 'b' : ''})"/><circle cx="${(25 + r() * 50).toFixed(1)}" cy="${sun.toFixed(1) - 8}" r="${(9 + r() * 5).toFixed(1)}" fill="oklch(96% 0.07 90)" opacity="0.9"/>${hills}${people}</svg>`;
  };
  const GALLERY = [];
  GAL.forEach((ev, k) => { for (let j = 0; j < (k === 4 ? 3 : 2); j++) GALLERY.push({ ev, n: GALLERY.length, cap: j === 0 ? `${ev[1]}, opening` : j === 1 ? `${ev[1]}, the crowd` : `${ev[1]}, volunteers` }); });
  const GF = { f: 'all' };
  U.GF = GF;
  const galleryHTML = () => `<div class="chips" aria-label="Album"><button class="chip${GF.f === 'all' ? ' on' : ''}" data-act="gal-f" data-v="all" aria-pressed="${GF.f === 'all'}">All</button>${GAL.map(e => `<button class="chip${GF.f === e[0] ? ' on' : ''}" data-act="gal-f" data-v="${e[0]}" aria-pressed="${GF.f === e[0]}">${esc(e[1])}</button>`).join('')}</div>
    <div class="gal">${GALLERY.filter(x => GF.f === 'all' || x.ev[0] === GF.f).map(x => `<button class="gal-t" data-act="gal-open" data-n="${x.n}" aria-label="Open ${esc(x.cap)}">${tile(x.ev, x.n)}<span>${esc(x.cap)}</span></button>`).join('')}</div>`;
  A['gal-f'] = el => { GF.f = el.dataset.v; const box = U.$('#galBox'); if (box) box.innerHTML = galleryHTML(); };
  A['gal-open'] = el => { const x = GALLERY[Number(el.dataset.n)]; U.sheet(`<div class="gal-big">${tile(x.ev, x.n, true)}</div><h2 class="sh-h">${esc(x.cap)}</h2><p class="note">${esc(x.ev[2])}. These pictures are drawings for the demo. Event chairs and photographers upload real ones, sorted by event.</p>`, { wide: true }); };
  A.scroll = el => { const t = U.$(el.dataset.t); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 64, behavior: U.calm() ? 'auto' : 'smooth' }); };
  F.contact = f => { f.reset(); U.toast('Message sent to the district office (demo only, nothing is stored)'); };

  U.landingNav = () => `<nav class="land-nav" aria-label="Sections"><span class="ln-brand">${U.gear()}<b>${P.season === 'vibe' ? 'VIBE' : 'ICON'}</b></span><div class="ln-links">${[['about', 'About'], ['pulse', 'Pulse'], ['board', 'Leaderboard'], ['how', 'How it works'], ['history', 'History'], ['events', 'Events'], ['gallery', 'Gallery'], ['team', 'Leadership'], ['clubs-map', 'Clubs'], ['contact', 'Contact']].map(([id, l]) => `<button data-act="scroll" data-t="#${id}">${l}</button>`).join('')}</div><button class="btn sm ink" data-act="scroll" data-t="#roles">Sign in</button></nav>`;

  let TOPM = null;
  const topMembers = () => { if (!TOPM) { const all = []; for (let i = 0; i < D.memberCount; i++) all.push(D.member(i)); TOPM = all.sort((a, b) => b.points - a.points || a.i - b.i).slice(0, 5); } return TOPM; };
  const topClubs = () => U.scoreRank().slice(0, 5);
  U.landingSections = () => {
    const act = U.activeClubs(), college = act.filter(c => c.type === 'College').length;
    const memC = act.filter(c => c.type === 'College').reduce((a, c) => a + c.members, 0), memK = act.filter(c => c.type === 'Community').reduce((a, c) => a + c.members, 0);
    const upcoming = D.EVENTS.filter(e => e.status !== 'Done').slice(0, 4);
    const office = D.designations.filter(d => d.team === 'DRR office').slice(0, 4).concat(D.designations.filter(d => d.title === 'District Rotaract Secretary'));
    return `<section id="about" class="sec"><div class="sec-in">
        <span class="eyebrow">About</span><h2 class="sec-h">Service Above Self, in ${act.length} clubs across Chennai</h2>
        <p class="lede">Rotaract District 3233 brings together ${num(D.memberCount)} young people in community and college clubs. They serve through the four avenues of Rotaract: club, community, professional and international service. ICON is the district's one home for what they do: monthly reports, fees, events, initiatives and recognition.</p>
        <div class="stats flat">${U.fig(act.length, 'Active clubs', `${act.length - college} community, ${college} college`)}${U.fig(D.memberCount, 'Rotaractors')}${U.fig(7, 'Groups', 'Led by a GRR and a GRS each')}${U.fig(4, 'Avenues of service')}</div>
        <div class="trio">
          <div class="card"><b>One place for clubs</b><p class="note">Secretaries log projects the day they happen. The monthly report writes itself and goes to the GRS and the DRS in one send.</p></div>
          <div class="card"><b>Fees without the chase</b><p class="note">Dues and event seats sit in one club wallet. A club pays once, and the treasurer checks one line.</p></div>
          <div class="card"><b>Every event, every year</b><p class="note">Each event keeps its record, its attendance and its certificates, even when the chair runs sign-ups on their own site.</p></div>
        </div></div></section>
      <section id="pulse" class="sec alt"><div class="sec-in">
        <span class="eyebrow">District pulse</span><h2 class="sec-h">The district, in live numbers</h2>
        <p class="lede">Every scan, project and report rolls up here the moment it happens. No monthly PDFs, no waiting.</p>
        <div class="stats flat">${U.fig(57, 'Check-ins this month', '36 last month')}${U.fig(D.checkins.reduce((a, c) => a + c.v, 0), 'Check-ins since July')}${U.fig(act.reduce((a, c) => a + U.projects(c, 3).length, 0), 'Projects reported in October')}${U.fig(act.reduce((a, c) => a + U.projects(c, 3).reduce((x, p) => x + p.beneficiaries, 0), 0), 'Beneficiaries in October')}</div>
        <div class="card"><div class="card-h"><h2>Check-ins by month</h2><span class="muted">QR scans at district events</span></div>${U.spark(D.checkins)}</div>
      </div></section>
      <section id="board" class="sec"><div class="sec-in">
        <span class="eyebrow">Leaderboard</span><h2 class="sec-h">Who is on top right now</h2>
        <p class="lede">Points land the second a member scans in or a club files on time. Names here are samples.</p>
        <div class="grid-2"><section class="card"><div class="card-h"><h2>Members</h2><span class="muted">Top 5</span></div><ol class="rank">${topMembers().map((m, i) => `<li class="${i < 3 ? 'medal m' + i : ''}"><span class="rk fig">${i + 1}</span><span class="rk-n"><b>${esc(m.name)}</b><small class="sub">${esc(m.club.name)}</small></span><b class="fig">${m.points}</b></li>`).join('')}</ol></section>
        <section class="card"><div class="card-h"><h2>Clubs</h2><span class="muted">Top 5 by scorecard</span></div><ol class="rank">${topClubs().map((x, i) => `<li class="${i < 3 ? 'medal m' + i : ''}"><span class="rk fig">${i + 1}</span><span class="rk-n"><b>${esc(x.c.name)}</b><small class="sub">${x.c.type}, Group ${U.groupOf(x.c)}</small></span><span class="rk-bar"><i style="--w:${(x.s / 100).toFixed(2)}"></i></span><b class="fig">${x.s}</b></li>`).join('')}</ol></section></div>
      </div></section>
      <section id="how" class="sec alt"><div class="sec-in">
        <span class="eyebrow">How it works</span><h2 class="sec-h">Three steps, one platform</h2>
        <div class="trio"><div class="card"><span class="eyebrow">Step 1</span><b>Scan in</b><p class="note">Show up to a district event and scan the QR. The sergeant's scan logs your check-in at once.</p></div><div class="card"><span class="eyebrow">Step 2</span><b>Earn points</b><p class="note">Punctuality bonuses, event turnout, on-time reports and initiatives all build your score.</p></div><div class="card"><span class="eyebrow">Step 3</span><b>Climb the board</b><p class="note">See where you and your club stand across the district, and who leads the group race.</p></div></div>
        <ul class="feat">${['QR attendance: a personal pass, sergeant scans land instantly', 'Live leaderboard: punctuality and turnout, ranked', 'Club management: officers, rosters and posts, kept by each club', 'Project reports: the secretary or president sends, the GRS and DRS review', 'Club wallet: dues and event seats, paid in one go', 'Seat allotment: groups spread RYLA and conference seats over their clubs'].map(t => `<li>${ic('check')}<span>${t}</span></li>`).join('')}</ul>
        <div class="row-btns"><button class="btn ink lg" data-act="scroll" data-t="#roles">Sign in${ic('chev')}</button></div>
      </div></section>
      <section id="history" class="sec"><div class="sec-in">
        <span class="eyebrow">History</span><h2 class="sec-h">From one club to a district of clubs</h2>
        <ol class="timeline big">
          <li class="done"><b>1905</b><span>Paul Harris founds the first Rotary club in Chicago. Its motto, Service Above Self, still guides Rotaract.</span></li>
          <li class="done"><b>1968</b><span>The Rotary Club of Charlotte North in North Carolina sponsors the first Rotaract club. Rotary International adopts Rotaract as its programme for young adults. The name joins Rotary and action.</span></li>
          <li class="done"><b>Today</b><span>Rotaract District 3233 runs ${act.length} clubs in seven groups across Chennai. VIBE 2026-27 is the current year, with QR check-ins at every district event.</span></li>
          <li><b>1 July 2027</b><span>ICON 2027-28 takes over. Clubs, members and history carry over, and the new DRR sets the season's look.</span></li>
        </ol>
        <p class="note edit-note">The district's own milestones go here: charter year, past DRRs, flagship events and records. The DRR office can add them from the Season page. The district entries above are placeholders for the demo.</p></div></section>
      <section id="events" class="sec alt"><div class="sec-in">
        <span class="eyebrow">Events</span><h2 class="sec-h">Coming up</h2>
        <div class="ev-grid">${upcoming.map(e => `<div class="ev-card static"><span class="ev-top"><span class="ev-kind">${esc(e.kind)}</span>${U.pill(e.status, e.status === 'Planning' ? 'neutral' : 'warn')}</span><b class="ev-name">${esc(e.name)}</b><span class="ev-when">${esc(e.date)}</span>${e.full ? `<small class="sub">${esc(e.full)}</small>` : ''}<span class="ev-chair">Clubs register through their GRR or GRS</span></div>`).join('')}</div>
      </div></section>
      <section id="gallery" class="sec"><div class="sec-in">
        <span class="eyebrow">Gallery</span><h2 class="sec-h">The year in pictures</h2>
        <div id="galBox">${galleryHTML()}</div>
        <p class="note edit-note">Sample drawings for the demo. Event chairs and the photography team upload the real pictures, and each album follows its event.</p></div></section>
      <section id="team" class="sec alt"><div class="sec-in">
        <span class="eyebrow">Leadership</span><h2 class="sec-h">The people who run the district</h2>
        <div class="people-grid">${office.map(d => `<div class="card person-c"><span class="pp big">${esc(d.holder.split(' ').map(x => x[0]).join(''))}</span><b>${esc(d.holder)}</b><small class="sub">${esc(d.title)}</small></div>`).join('')}</div>
        <h3 class="sub-h">Group leaders</h3>
        <div class="people-grid">${D.GROUPS.map(g => `<div class="card person-c" style="--g:${U.gcolor(g.id)}"><span class="gp" style="--g:${U.gcolor(g.id)}">${g.name}</span><small class="sub">${esc(g.area)}</small><b>${esc(g.grr)}</b><small class="sub">GRR</small><b>${esc(g.grs)}</b><small class="sub">GRS</small></div>`).join('')}</div>
      </div></section>
      <section id="clubs-map" class="sec"><div class="sec-in two">
        <div><span class="eyebrow">Clubs</span><h2 class="sec-h">${act.length} clubs, seven groups</h2>
          <p class="lede">${college} college clubs with ${num(memC)} members and ${act.length - college} community clubs with ${num(memK)} members, from Ennore in the north to Siruseri in the south.</p>
          <ul class="legend vert"><li><i class="lg ok"></i>Community club</li><li><i class="lg warn"></i>College club</li></ul></div>
        <div class="map-box">${U.mapSVG({ plain: true, dotClass: c => (c.type === 'College' ? 'warn' : 'ok') })}</div>
      </div></section>
      <section id="contact" class="sec alt"><div class="sec-in two">
        <div><span class="eyebrow">Contact</span><h2 class="sec-h">Talk to the district office</h2><p class="lede">Want to start a club, join one, or invite the district to an event? Write to us and the office replies.</p></div>
        <form class="card form" data-form="contact"><label class="field" for="ctN"><span>Your name</span><input id="ctN" name="name" required></label><label class="field" for="ctE"><span>Email</span><input id="ctE" name="email" type="email" required></label><label class="field" for="ctM"><span>Message</span><textarea id="ctM" name="msg" rows="4" required></textarea></label><div class="form-act"><button class="btn ink" type="submit">Send message</button><span class="muted">Demo: nothing is stored.</span></div></form>
      </div></section>
      <footer class="land-foot"><span class="ln-brand">${U.gear()}<b>Rotaract District 3233, Chennai</b></span><span>Service Above Self. Concept prototype with sample data.</span></footer>`;
  };
})();
