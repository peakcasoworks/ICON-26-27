/* Sponsors of the year. The DRR or the DRS adds each sponsor on the Season page: name, tier, website and logo. The start
   page shows them by tier. Until a tier has sponsors, its places show as open slots, never as invented names or logos. */
(function () {
  const U = UI, { esc, ic, P, save } = U;
  const A = U.extraActions = U.extraActions || {}, F = U.extraForms = U.extraForms || {};
  const TIERS = [
    { id: 'title', name: 'Title sponsor', slots: 1 },
    { id: 'gold', name: 'Gold sponsors', slots: 3 },
    { id: 'silver', name: 'Silver sponsors', slots: 4 },
    { id: 'partner', name: 'Community partners', slots: 6 }
  ];
  const list = () => (P.sponsors = P.sponsors || []);
  const season = () => (P.season === 'vibe' ? 'VIBE 2026-27' : 'ICON 2027-28');
  const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : '');
  const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const mark = s => s.logo
    ? `<img class="spn-logo" src="${s.logo}" alt="${esc(s.name)}" loading="lazy" decoding="async">`
    : `<span class="spn-word"><span class="spn-ini" aria-hidden="true">${esc(initials(s.name))}</span><span>${esc(s.name)}</span></span>`;
  const card = (s, t) => {
    const inner = `${mark(s)}${t.id === 'title' && s.line ? `<span class="spn-line">${esc(s.line)}</span>` : ''}`;
    const url = safeUrl(s.url);
    return url ? `<a class="spn-card spn-${t.id}" href="${esc(url)}" target="_blank" rel="noopener sponsored">${inner}<span class="sr"> (opens their website)</span></a>` : `<div class="spn-card spn-${t.id}">${inner}</div>`;
  };
  const slot = t => `<div class="spn-card spn-${t.id} spn-open" aria-label="Open ${esc(t.name.toLowerCase())} slot">${ic('plus')}<span>${t.id === 'title' ? 'Title sponsor slot open' : 'Open slot'}</span></div>`;

  U.sponsorsHTML = () => {
    const all = list();
    // A tier with sponsors shows them, plus its remaining open places. Empty lower tiers fold into one row of open places.
    const empty = TIERS.filter(t => t.id !== 'title' && !all.some(s => s.tier === t.id));
    const openRow = empty.length ? `<div class="spn-tier"><h3>Open places</h3><div class="spn-grid spn-g-open">${empty.map(t => `<div class="spn-card spn-open spn-sum">${ic('plus')}<b>${t.name}</b><span>${t.slots} place${t.slots === 1 ? '' : 's'} open</span></div>`).join('')}</div></div>` : '';
    const rows = TIERS.filter(t => t.id === 'title' || !empty.includes(t)).map(t => {
      const got = all.filter(s => s.tier === t.id), open = Math.max(0, t.slots - got.length);
      if (t.id === 'partner' && got.length > t.slots) return `<div class="spn-tier"><h3>${t.name}</h3><div class="spn-rail"><div class="spn-track">${got.concat(got).map(s => card(s, t)).join('')}</div></div></div>`;
      return `<div class="spn-tier"><h3>${t.name}</h3><div class="spn-grid spn-g-${t.id}">${got.map(s => card(s, t)).join('')}${Array.from({ length: open }, () => slot(t)).join('')}</div></div>`;
    }).join('');
    return `<section id="sponsors" class="sec spn-sec"><div class="sec-in">
      <span class="eyebrow">Sponsors</span><h2 class="sec-h">The sponsors of ${season()}</h2>
      <p class="lede">${all.length ? 'Thank you to the organisations who make the district\'s events and service possible this year.' : 'This year\'s sponsors appear here as they sign on. Each one is thanked at every district event.'}</p>
      ${rows}${openRow}
      <div class="spn-cta"><p><b>Sponsor the district.</b> Reach about 10,000 young people across Chennai through RYLA, the Conference and the year's service projects.</p><button class="btn ink" data-act="scroll" data-t="#contact">${ic('send')}Talk to the district office</button></div>
    </div></section>`;
  };

  // On the Season page, for the DRR and the DRS.
  U.sponsorAdmin = () => {
    if (!U.isLead()) return '';
    const all = list();
    return `<section class="card"><div class="card-h"><h2>Sponsors of the year</h2><span class="muted">${all.length} on the start page</span></div>
      ${all.length ? `<ul class="kv">${all.map(s => `<li><span>${s.logo ? `<img class="spn-thumb" src="${s.logo}" alt="">` : ''}<b>${esc(s.name)}</b><small class="sub">${esc(TIERS.find(t => t.id === s.tier).name)}${s.url ? ', ' + esc(s.url) : ''}</small></span><button class="btn sm" data-act="spn-rm" data-id="${s.id}">${ic('x')}Remove</button></li>`).join('')}</ul>` : '<p class="note">No sponsors yet. The start page shows open slots until you add them.</p>'}
      <form class="form" data-form="spn-add">
        <div class="field-row"><label class="field" for="spN"><span>Sponsor name</span><input id="spN" name="name" required maxlength="60"></label>
        <label class="field" for="spT"><span>Tier</span><select id="spT" name="tier">${TIERS.map(t => `<option value="${t.id}">${t.name.replace(/s$/, '')}</option>`).join('')}</select></label></div>
        <div class="field-row"><label class="field" for="spU"><span>Website, optional</span><input id="spU" name="url" type="url" placeholder="https://"></label>
        <label class="field" for="spL"><span>Line under the title sponsor, optional</span><input id="spL" name="line" maxlength="80"></label></div>
        <label class="file" for="spF">${ic('upload')}<span id="spFl">Logo, optional (PNG, SVG or JPG, under 300 KB)</span><input id="spF" name="logo" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp"></label>
        <div class="form-act"><button class="btn ink" type="submit">${ic('plus')}Add sponsor</button><span class="muted">It shows on the start page at once.</span></div>
      </form></section>`;
  };
  const readLogo = file => new Promise(res => {
    if (!file || !file.size) return res('');
    if (file.size > 300 * 1024) { U.toast('That logo is over 300 KB. Use a smaller file.', 'info'); return res(null); }
    const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(''); r.readAsDataURL(file);
  });
  F['spn-add'] = async f => {
    if (!U.isLead()) return;
    const d = new FormData(f), logo = await readLogo(f.logo.files[0]);
    if (logo === null) return;
    const name = String(d.get('name') || '').trim(); if (!name) return;
    list().push({ id: 's' + Date.now().toString(36), name, tier: d.get('tier'), url: safeUrl(String(d.get('url') || '').trim()), line: String(d.get('line') || '').trim(), logo });
    save(); U.rerender(); U.toast(`${name} added. It shows on the start page.`);
  };
  A['spn-rm'] = el => { if (!U.isLead()) return; P.sponsors = list().filter(s => s.id !== el.dataset.id); save(); U.rerender(); U.toast('Sponsor removed', 'info'); };
})();
