/* Sample data for the ICON 3233 concept demo.
   Every person, club name and figure here is generated, except the VIBE
   check-in series and the district totals (70 clubs, 5,839 members),
   which come from the public VIBE home page (3233vibe.com) in November 2026: 70 clubs, 49 college with 5,201 members and 21 community with 638, 5,839 Rotaractors in all. */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = mulberry32(3233);
  const pick = (a, r = R) => a[Math.floor(r() * a.length)];
  const ri = (lo, hi, r = R) => lo + Math.floor(r() * (hi - lo + 1));

  const FIRST = ['Aarthi','Abinaya','Akash','Anand','Arjun','Aswin','Bharath','Deepika','Dhanush','Divya','Gokul','Harini','Hari','Ishwarya','Janani','Jeeva','Kavya','Karthik','Keerthana','Kishore','Lavanya','Madhan','Meena','Mohan','Nandhini','Naveen','Nithya','Pavithra','Pradeep','Priya','Raghav','Rahul','Ramya','Sanjay','Saranya','Shalini','Shreya','Sindhu','Tharun','Varun','Vignesh','Vishnu','Yamini','Yuvan','Aadhira','Kaviya','Mithra','Nila','Pugal','Senthil','Tamizh','Valli','Ezhil','Iniyan','Kayal','Mugil','Oviya','Sudar','Amudhan','Thenmozhi'];
  const INIT = 'ABCDEGHJKLMNPRSTV';
  const person = (r = R) => pick(FIRST, r) + ' ' + pick(INIT.split(''), r) + '.';

  const GROUPS = [
    { id: 1, area: 'North Chennai', places: ['Ennore','Tiruvottiyur','Royapuram','Tondiarpet','Perambur','Kolathur'], cx: 268, cy: 78, r: 48 },
    { id: 2, area: 'North-West', places: ['Ambattur','Avadi','Anna Nagar','Mogappair','Padi','Thirumullaivoyal'], cx: 82, cy: 108, r: 52 },
    { id: 3, area: 'Central', places: ['Egmore','Nungambakkam','Kilpauk','Chetpet','T. Nagar','Kodambakkam'], cx: 252, cy: 190, r: 30 },
    { id: 4, area: 'Mylapore to Adyar', places: ['Mylapore','Alwarpet','Adyar','Besant Nagar','Thiruvanmiyur','Kotturpuram'], cx: 292, cy: 290, r: 28 },
    { id: 5, area: 'West', places: ['Porur','Valasaravakkam','Vadapalani','Poonamallee','Saligramam','Virugambakkam'], cx: 120, cy: 285, r: 52 },
    { id: 6, area: 'South', places: ['Velachery','Tambaram','Chromepet','Pallavaram','Medavakkam','Madipakkam'], cx: 128, cy: 440, r: 58 },
    { id: 7, area: 'OMR and ECR', places: ['Sholinganallur','Perungudi','Thoraipakkam','Kelambakkam','Neelankarai','Siruseri'], cx: 306, cy: 432, r: 40 }
  ];
  GROUPS.forEach(g => {
    g.name = 'Group ' + g.id;
    g.grr = person(); g.grs = person();
  });

  const PRE = ['Kurinji','Mullai','Marudham','Neidhal','Kaveri','Vaigai','Palar','Thamarai','Kadal','Ponni','Agaram','Kalai','Arivu','Ilango','Vaanam','Nila','Thendral','Malar','Pugazh','Kovalan','Kannagi','Selvam','Bharathi','Mugil'];
  const TYPES = ['College of Engineering','Arts and Science College','Institute of Technology','Medical College','College of Commerce','School of Design','Law College','College of Nursing','Polytechnic','Institute of Management','College of Architecture'];

  const clubs = [];
  let cid = 1;
  const usedPlace = new Set();
  // 21 community clubs: Madras Cosmos plus 20 neighbourhood clubs.
  clubs.push({ id: cid++, name: 'Madras Cosmos', type: 'Community', group: 6, place: 'Chromepet' });
  usedPlace.add('Chromepet');
  for (let i = 0; clubs.length < 21; i++) {
    const g = GROUPS[i % 7];
    const p = g.places.find(x => !usedPlace.has(x));
    if (!p) continue;
    usedPlace.add(p);
    clubs.push({ id: cid++, name: 'Chennai ' + p, type: 'Community', group: g.id, place: p });
  }
  // 49 college clubs, one of them a very large university club.
  clubs.push({ id: cid++, name: 'Senthamizh University', type: 'College', group: 5, place: 'Porur' });
  const usedCollege = new Set();
  while (clubs.length < 70) {
    const n = pick(PRE) + ' ' + pick(TYPES);
    if (usedCollege.has(n)) continue;
    usedCollege.add(n);
    const g = GROUPS[clubs.length % 7];
    clubs.push({ id: cid++, name: n, type: 'College', group: g.id, place: pick(g.places) });
  }
  // Members, scaled so the district total is 5,839: 5,201 in college clubs and 638 in community clubs.
  let sum = 0;
  clubs.forEach(c => {
    if (c.name === 'Senthamizh University') c.members = 2988;
    else if (c.name === 'Madras Cosmos') c.members = 18;
    else c.members = c.type === 'College' ? ri(18, 92) : ri(12, 38);
    sum += c.members;
  });
  const fit = (list, target) => {
    let diff = target - list.reduce((a, c) => a + c.members, 0), k = 0;
    while (diff !== 0) {
      const c = list[k++ % list.length];
      if (c.name === 'Senthamizh University' || c.name === 'Madras Cosmos') continue;
      const step = diff > 0 ? 1 : -1;
      if (c.members + step >= 10) { c.members += step; diff -= step; }
    }
  };
  fit(clubs.filter(c => c.type === 'College'), 5201);
  fit(clubs.filter(c => c.type === 'Community'), 638);
  clubs.forEach(c => {
    const g = GROUPS[c.group - 1];
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * g.r;
    c.x = Math.round(g.cx + Math.cos(a) * d);
    c.y = Math.round(g.cy + Math.sin(a) * d * 0.85);
    c.chartered = c.name === 'Madras Cosmos' ? 2016 : ri(1996, 2024);
    c.state = 'Active';
    c.president = person(); c.secretary = person(); c.treasurer = person();
    c.sponsor = 'Rotary Club of Chennai ' + pick(PRE);
    c.activity = R();
  });
  clubs.find(c => c.name === 'Madras Cosmos').activity = 0.8;
  clubs[40].state = 'Inactive';
  clubs[58].state = 'Inactive';

  const MONTHS = [
    { key: '2026-07', label: 'July', due: '5 Aug' },
    { key: '2026-08', label: 'August', due: '5 Sep' },
    { key: '2026-09', label: 'September', due: '5 Oct' },
    { key: '2026-10', label: 'October', due: '5 Nov' },
    { key: '2026-11', label: 'November', due: '5 Dec' }
  ];

  const AVENUES = ['Club Service','Community Service','Professional Service','International Service','Multi Avenue'];
  const FOCUS = ['Peace','Disease prevention','Water and sanitation','Mothers and children','Education','Economic development','Environment'];
  const PROJ = {
    'Community Service': ['Blood donation camp in {p}','Beach clean-up at Marina','Tree planting in {p}','Food drive for {p} night shelter','Notebook drive at {p} Corporation school','Elder care visit in {p}','Eye screening camp in {p}'],
    'Professional Service': ['Resume clinic','Mock interview day','Industrial visit to Guindy estate','Money basics talk','Public speaking lab','Design thinking workshop'],
    'Club Service': ['Fellowship night','Member induction','Board retreat','Club anniversary meet','Games evening'],
    'International Service': ['Twin-club call with a Sri Lanka club','Pen-pal exchange','Culture swap webinar','World Peace Day talk'],
    'Multi Avenue': ['Pongal with the Thiruvottiyur children\'s home','Madras Week heritage walk','Joint mega camp with sponsor club']
  };
  function projectsFor(club, mi) {
    const r = mulberry32(club.id * 131 + mi * 7);
    const n = club.state === 'Inactive' ? 0 : Math.round(club.activity * 4 + r() * 1.5);
    const out = [];
    for (let i = 0; i < n; i++) {
      const av = r() < 0.5 ? 'Community Service' : pick(AVENUES, r);
      const vol = 4 + Math.floor(r() * 26);
      const hrs = 2 + Math.floor(r() * 5);
      out.push({
        id: club.id + '-' + mi + '-' + i,
        name: pick(PROJ[av], r).replace('{p}', club.place),
        avenue: av,
        focus: [pick(FOCUS, r)],
        day: 2 + Math.floor(r() * 26),
        volunteers: vol, hours: hrs, manHours: vol * hrs,
        beneficiaries: av === 'Club Service' ? 0 : 10 + Math.floor(r() * 240),
        joint: r() < 0.15
      });
    }
    return out;
  }

  // Report status for each club and month.
  function baseReport(club, mi) {
    const r = mulberry32(club.id * 977 + mi * 13);
    const x = r();
    if (club.state === 'Inactive') return { status: mi < 2 ? 'accepted' : 'none', late: mi >= 2 };
    if (club.name === 'Madras Cosmos') return mi < 3 ? { status: 'accepted', late: mi === 1, day: mi === 1 ? 7 : 3 } : mi === 3 ? { status: 'draft', late: true } : { status: 'draft', late: false };
    if (mi < 3) {
      return { status: 'accepted', late: x > 0.78, day: x > 0.78 ? 6 + Math.floor(r() * 9) : 1 + Math.floor(r() * 4) };
    }
    if (mi === 3) {
      const t = club.activity * 0.5 + x * 0.5;
      if (t > 0.62) return { status: 'accepted', late: false, day: 2 + Math.floor(r() * 3) };
      if (t > 0.52) return { status: 'drs', late: false, day: 4 };
      if (t > 0.42) return { status: 'grs', late: r() > 0.5, day: 5 + Math.floor(r() * 4) };
      if (t > 0.37) return { status: 'returned', late: true };
      if (t > 0.32) return { status: 'draft', late: true };
      if (t > 0.26) return { status: 'draft', late: true };
      return { status: 'none', late: true };
    }
    return { status: x > 0.25 ? 'draft' : 'none', late: false };
  }
  const cosmos = clubs.find(c => c.name === 'Madras Cosmos');

  // Money: what each club owes the district this year.
  function walletFor(club) {
    const r = mulberry32(club.id * 401);
    const rate = club.type === 'College' ? 100 : 300;
    const items = [
      { id: club.id + '-dues', head: 'District dues 2026-27', detail: club.members + ' members at ₹' + rate, amount: club.members * rate, due: '31 Aug' },
      { id: club.id + '-asm', head: 'District Assembly delegates', detail: '6 seats at ₹500', amount: 3000, due: '1 Aug' },
      { id: club.id + '-josh', head: 'JOSH culturals entry', detail: 'Club entry fee', amount: 1500, due: '10 Sep' },
      { id: club.id + '-ryla', head: 'RYLA seats', detail: '2 seats at ₹1,800', amount: 3600, due: '30 Nov' },
      { id: club.id + '-conf', head: 'District Conference delegates', detail: '8 seats at ₹750', amount: 6000, due: '15 Jan' }
    ];
    items.forEach((it, i) => {
      const x = r();
      if (i === 4) it.status = x > 0.85 ? 'pending' : 'due';
      else if (i === 3) it.status = x > 0.6 ? 'verified' : x > 0.4 ? 'pending' : 'due';
      else it.status = x > 0.18 + (1 - club.activity) * 0.2 ? 'verified' : x > 0.1 ? 'pending' : 'overdue';
      if (it.status === 'verified' || it.status === 'pending') it.ref = 'UPI ' + (400000000000 + Math.floor(r() * 99999999999)).toString().slice(0, 12);
    });
    if (club === cosmos) { items[3].status = 'due'; items[0].status = 'verified'; items[4].status = 'due'; delete items[3].ref; }
    return items;
  }

  const EVENTS = [
    { id: 'orient', name: 'District Orientation', kind: 'Training', date: '6 Jul 2026', m: 0, status: 'Done', chair: person(), attendance: 612, health: 100, site: 'quick' },
    { id: 'dols', name: 'DOLS', full: 'District Officers Leadership Seminar', kind: 'Training', date: '13 Jul 2026', m: 0, status: 'Done', chair: person(), attendance: 104, health: 100, site: 'quick' },
    { id: 'assembly', name: 'District Assembly', kind: 'Flagship', date: '10 Aug 2026', m: 1, status: 'Done', chair: person(), attendance: 1140, health: 100, site: 'own', quota: 6, fee: 500 },
    { id: 'josh', name: 'JOSH District Culturals', kind: 'Culturals', date: '21 Sep 2026', m: 2, status: 'Done', chair: person(), attendance: 1820, health: 100, site: 'own', fee: 1500 },
    { id: 'blood', name: 'Blood Donation Megacamp', kind: 'Service', date: '2 Oct 2026', m: 3, status: 'Done', chair: person(), attendance: 860, health: 100, site: 'quick' },
    { id: 'drc', name: 'DRC, December', full: 'District Rotaract Council meeting', kind: 'Council', date: '7 Dec 2026', m: 5, status: 'Booking open', chair: person(), health: 82, site: 'quick', quota: 2 },
    { id: 'ryla', name: 'RYLA', full: 'Rotary Youth Leadership Awards', kind: 'Flagship', date: '19 to 21 Dec 2026', m: 5, status: 'Registration open', chair: person(), health: 64, site: 'own', quota: 2, fee: 1800, seats: 180, filled: 117 },
    { id: 'hya', name: 'Half-Yearly Awards', kind: 'Awards', date: '24 Jan 2027', m: 6, status: 'Planning', chair: person(), health: 41, site: 'quick' },
    { id: 'conf', name: 'District Conference', kind: 'Flagship', date: '20 to 22 Feb 2027', m: 7, status: 'Planning', chair: person(), health: 28, site: 'own', quota: 8, fee: 750 },
    { id: 'wrw', name: 'World Rotaract Week', kind: 'Campaign', date: '9 to 15 Mar 2027', m: 8, status: 'Planning', chair: person(), health: 18, site: 'quick' },
    { id: 'pels', name: 'PELS and SELS', full: 'President-elect and Secretary-elect Leadership Seminar', kind: 'Training', date: '16 May 2027', m: 10, status: 'Planning', chair: person(), health: 6, site: 'quick' },
    { id: 'annual', name: 'Annual Awards', kind: 'Awards', date: '20 Jun 2027', m: 11, status: 'Planning', chair: person(), health: 4, site: 'own' }
  ];
  const COMMITTEES = {
    ryla: [
      { name: 'Programs', head: person(), tasks: ['Lock 6 speakers','Finalise day plans','Print workbooks','Rehearse opening'], done: 3 },
      { name: 'Hospitality', head: person(), tasks: ['Room allotment','Welcome kits','Transport from Tambaram','Medical desk'], done: 2 },
      { name: 'Food', head: person(), tasks: ['Caterer tasting','Menu sign-off','Allergy list','Water stations'], done: 2 },
      { name: 'Backstage', head: person(), tasks: ['Sound check','Stage plan','Cue sheet','Lighting crew'], done: 1 },
      { name: 'Registration', head: person(), tasks: ['Open form','Club quota mail','Collect fees','Badges'], done: 3 },
      { name: 'Media', head: person(), tasks: ['Poster','Reels plan','Photographers rota','Press note'], done: 2 }
    ]
  };

  const INITIATIVES = [
    { id: 'blood', name: 'Every drop counts', type: 'Campaign', owner: 'Chairperson, Blood Donation', unit: 'units', goal: 3233, now: 1486, clubs: 41, sw: 1 },
    { id: 'marina', name: 'Marina clean sweep', type: 'Campaign', owner: 'Director, Community Service', unit: 'kg collected', goal: 5000, now: 2140, clubs: 23, sw: 6 },
    { id: 'red', name: 'Rotaract Entrepreneur Directory', type: 'Directory', owner: 'Chairperson, Entrepreneur Directory', unit: 'listings', goal: 300, now: 214, clubs: 37, sw: 4 },
    { id: 'teach', name: 'Each one teach one', type: 'Campaign', owner: 'Director, Professional Service', unit: 'sessions', goal: 500, now: 188, clubs: 19, sw: 3 },
    { id: 'reel', name: 'Reel of the month', type: 'Competition', owner: 'Chief PRO', unit: 'entries', goal: 120, now: 64, clubs: 29, sw: 7 }
  ];

  const DO = [
    ['DRR office', [['District Rotaract Representative','District Admin','District'],['Associate DRR','District Admin','District'],['Associate DRR','District Admin','District'],['DRR Elect','District Admin','District'],['Immediate Past DRR','Advisor','District'],['District Learning Facilitator','Advisor','District'],['DRR Special Representative','Advisor','District'],['DOLS Chairman','Event Chair','DOLS']]],
    ['Secretariat', [['District Rotaract Secretary','Secretariat','District'],['Associate District Secretary','Secretariat','District'],['Associate District Secretary','Secretariat','District'],['District Treasurer','Finance','District'],['Deputy District Treasurer','Finance','District']]],
    ['Groups', GROUPS.map(g => ['Group Rotaract Representative','Group Lead','Group ' + g.id]).concat(GROUPS.slice(0, 3).map(g => ['Group Rotaract Secretary','Group Lead','Group ' + g.id]))],
    ['Avenues', [['Director, Club Service','Portfolio','Club Service'],['Director, Community Service','Portfolio','Community Service'],['Director, Professional Service','Portfolio','Professional Service'],['Director, International Service','Portfolio','International Service'],['Chairperson, Blood Donation','Portfolio','Every drop counts'],['Chairperson, RIDE','Portfolio','RIDE']]],
    ['Events', [['RYLA Chairman','Event Chair','RYLA'],['Assembly Chairman','Event Chair','District Assembly'],['Conference Chairman','Event Chair','District Conference'],['Chairperson, Half-Yearly Awards','Event Chair','Half-Yearly Awards'],['Chairperson, World Rotaract Week','Event Chair','World Rotaract Week'],['PELS and SELS Chairperson','Event Chair','PELS and SELS']]],
    ['Sergeants', [['Chief Sergeant-at-Arms','Sergeant','District'],['Deputy Sergeant-at-Arms','Sergeant','District'],['Associate Sergeant-at-Arms','Sergeant','District'],['Associate Sergeant-at-Arms','Sergeant','District']]],
    ['Media and data', [['Chief PRO','Team','PRO team'],['Associate PRO','Team','PRO team'],['Chairperson, Editorial Board','Team','Editorial'],['Head, Creatives','Team','Creatives'],['Head, District Photography','Team','Photography'],['Database Chairman','Team','Database']]]
  ];
  const designations = [];
  let did = 1;
  DO.forEach(([team, list]) => list.forEach(([title, tpl, scope]) => designations.push({ id: did++, team, title, tpl, scope, holder: person() })));
  // One person, two posts, as happens every year.
  designations.find(d => d.title === 'RYLA Chairman').holder = designations.find(d => d.title === 'Chairperson, Blood Donation').holder;

  const TEMPLATES = {
    'District Admin': 'Everything, including season setup and designations',
    'Secretariat': 'Report review, club records, circulars',
    'Finance': 'Dues, event fees, payment checks',
    'Group Lead': 'Reports, dues and nudges for one group',
    'Portfolio': 'Runs an initiative, sees related projects',
    'Event Chair': 'Event workspace, committees, attendance',
    'Team': 'Task board and uploads for the team',
    'Sergeant': 'QR scan and attendance at events',
    'Advisor': 'Read-only view of the whole district'
  };

  // Official visit slots for November and December.
  const visits = [];
  const vr = mulberry32(77);
  for (let d = 18; d <= 30 + 20; d++) {
    const day = d <= 30 ? d : d - 30, mon = d <= 30 ? 'Nov' : 'Dec';
    const dow = (new Date(2026, d <= 30 ? 10 : 11, day)).getDay();
    if (dow === 0 || dow === 6) visits.push({ id: 'v' + d + 'a', day, mon, dow, time: '10:00 am' });
    if (dow >= 1 && dow <= 5 && vr() > 0.35) visits.push({ id: 'v' + d + 'b', day, mon, dow, time: '6:30 pm' });
  }
  visits.forEach(v => { if (vr() > 0.55) v.club = clubs[1 + Math.floor(vr() * (clubs.length - 1))].id; });

  // Real series from the VIBE public home page, November 2026.
  const checkins = [ { m: 'Jul', v: 248 }, { m: 'Aug', v: 183 }, { m: 'Sep', v: 152 }, { m: 'Oct', v: 36 }, { m: 'Nov', v: 57 } ];

  // Members are generated on request so the directory can page through
  // thousands of rows without building them all up front.
  const offsets = []; let acc = 0;
  clubs.forEach(c => { offsets.push(acc); acc += c.members; });
  const ROLES_M = ['Member','Member','Member','Member','Member','Member','Board member','Board member','Joint Secretary'];
  function member(i) {
    let lo = 0, hi = clubs.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (offsets[mid] <= i) lo = mid; else hi = mid - 1; }
    const c = clubs[lo];
    const r = mulberry32(i * 2654435761);
    const idx = i - offsets[lo];
    let role = idx === 0 ? 'President' : idx === 1 ? 'Secretary' : idx === 2 ? 'Treasurer' : pick(ROLES_M, r);
    const name = idx === 0 ? c.president : idx === 1 ? c.secretary : idx === 2 ? c.treasurer : person(r);
    return { i, name, club: c, role, points: Math.floor(r() * 18) * 50, joined: 2019 + Math.floor(r() * 8), id: 'R' + (3233000 + i) };
  }

  // The k-th member of one club (the first is its president, then secretary and treasurer).
  function memberOf(club, k) { const at = clubs.indexOf(club); return member(at < 0 ? 0 : offsets[at] + Math.min(Math.max(0, k), club.members - 1)); }
  window.D = { GROUPS, clubs, memberOf, MONTHS, AVENUES, FOCUS, EVENTS, COMMITTEES, INITIATIVES, designations, TEMPLATES, visits, checkins, projectsFor, baseReport, walletFor, member, memberCount: acc, cosmos, person, mulberry32 };
})();
