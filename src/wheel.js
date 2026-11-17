/* The Rotary wheel, drawn from its published proportions: 24 cogs, a rim, six tapered spokes and a hub with a keyway.
   One drawing feeds the logo everywhere (top bar, passes, certificates, loader, sun) and the loader's sparks, so the
   sparks gather into exactly the shape the logo has. This is a faithful redraw for the demo; the production site must
   use the artwork from the Rotary Brand Center (Rotaract clubs are licensed to use it). */
(function () {
  const TAU = Math.PI * 2;
  const f = n => +n.toFixed(2);
  const at = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

  const COGS = 24, SPOKES = 6;
  // Proportions as fractions of the outer radius R.
  const P = { root: 0.885, rim: 0.7, hub: 0.3, hole: 0.135, spokeHub: 0.05, spokeRim: 0.075, keyW: 0.04, keyD: 0.075 };

  /* Outline of the 24 cogs: flat tops at R, roots at R * root, a cog centred at twelve o'clock. */
  function cogOutline(cx, cy, R) {
    const rr = R * P.root, pitch = TAU / COGS;
    let d = '';
    for (let k = 0; k < COGS; k++) {
      const a = k * pitch - Math.PI / 2;
      const [x0, y0] = at(cx, cy, rr, a - pitch * 0.27);
      const [x1, y1] = at(cx, cy, R, a - pitch * 0.16);
      const [x2, y2] = at(cx, cy, R, a + pitch * 0.16);
      const [x3, y3] = at(cx, cy, rr, a + pitch * 0.27);
      d += (k ? 'A' + f(rr) + ' ' + f(rr) + ' 0 0 1 ' + f(x0) + ' ' + f(y0) : 'M' + f(x0) + ' ' + f(y0));
      d += `L${f(x1)} ${f(y1)}A${f(R)} ${f(R)} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}`;
    }
    const [sx, sy] = at(cx, cy, rr, -Math.PI / 2 - pitch * 0.27);
    return d + `A${f(rr)} ${f(rr)} 0 0 1 ${f(sx)} ${f(sy)}Z`;
  }

  /* Six spokes at 0, 60, 120 ... degrees, a little wider at the rim than at the hub. */
  function spokePolys(cx, cy, R) {
    let d = '';
    for (let k = 0; k < SPOKES; k++) {
      const a = (k * TAU) / SPOKES;
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      const r0 = R * P.hub * 0.8, r1 = R * P.rim * 1.04, w0 = R * P.spokeHub, w1 = R * P.spokeRim;
      const pts = [[cx + ux * r0 + nx * w0, cy + uy * r0 + ny * w0], [cx + ux * r1 + nx * w1, cy + uy * r1 + ny * w1], [cx + ux * r1 - nx * w1, cy + uy * r1 - ny * w1], [cx + ux * r0 - nx * w0, cy + uy * r0 - ny * w0]];
      d += 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
    }
    return d;
  }

  /* The hub: a disc with a round hole and the keyway notch cut up from the hole at twelve o'clock. */
  function hubPath(cx, cy, R) {
    const h = R * P.hole, kw = R * P.keyW, top = cy - h - R * P.keyD, edge = Math.sqrt(h * h - kw * kw);
    const hole = `M${f(cx + kw)} ${f(cy - edge)}L${f(cx + kw)} ${f(top)}L${f(cx - kw)} ${f(top)}L${f(cx - kw)} ${f(cy - edge)}A${f(h)} ${f(h)} 0 1 0 ${f(cx + kw)} ${f(cy - edge)}Z`;
    return circle(cx, cy, R * P.hub) + hole;
  }

  /* The three filled shapes: rim and cogs (evenodd, with the window cut out), hub (evenodd) and spokes. */
  function paths(cx = 0, cy = 0, R = 50) {
    return { rim: cogOutline(cx, cy, R) + circle(cx, cy, R * P.rim), hub: hubPath(cx, cy, R), spokes: spokePolys(cx, cy, R) };
  }

  /* The logo as inline SVG. */
  function svg(cls = '') {
    const w = paths(0, 0, 48);
    return `<svg class="gear ${cls}" viewBox="-50 -50 100 100" aria-hidden="true"><path class="g-teeth" fill-rule="evenodd" d="${w.rim}"/><path class="g-teeth" fill-rule="evenodd" d="${w.hub}"/><path class="g-teeth" d="${w.spokes}"/></svg>`;
  }

  /* Points along every edge of the wheel, for the loader sparks. R is the outer radius. */
  function points(R = 60, density = 1) {
    const out = [], rr = R * P.root, pitch = TAU / COGS;
    const arc = (r, a0, a1, n) => { for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push(at(0, 0, r, a)); } };
    const line = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) out.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]); };
    const n = v => Math.max(1, Math.round(v * density));
    for (let k = 0; k < COGS; k++) {
      const a = k * pitch - Math.PI / 2;
      const p0 = at(0, 0, rr, a - pitch * 0.27), p1 = at(0, 0, R, a - pitch * 0.16), p2 = at(0, 0, R, a + pitch * 0.16), p3 = at(0, 0, rr, a + pitch * 0.27);
      line(p0[0], p0[1], p1[0], p1[1], n(2)); arc(R, a - pitch * 0.16, a + pitch * 0.16, n(3)); line(p2[0], p2[1], p3[0], p3[1], n(2));
      arc(rr, a + pitch * 0.27, a + pitch * 0.73, n(2));
    }
    arc(R * P.rim, 0, TAU, n(96));
    arc(R * P.hub, 0, TAU, n(40));
    arc(R * P.hole, Math.PI * 0.55, Math.PI * 2.45, n(18));
    const kw = R * P.keyW, h = R * P.hole, top = -h - R * P.keyD;
    line(kw, top, kw, -h, n(3)); line(-kw, top, kw, top, n(3)); line(-kw, -h, -kw, top, n(3));
    for (let k = 0; k < SPOKES; k++) {
      const a = (k * TAU) / SPOKES, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      const r0 = R * P.hub, r1 = R * P.rim, w0 = R * P.spokeHub, w1 = R * P.spokeRim;
      [[1, w0, w1], [-1, w0, w1]].forEach(([s, a0, a1]) => line(ux * r0 + nx * a0 * s, uy * r0 + ny * a0 * s, ux * r1 + nx * a1 * s, uy * r1 + ny * a1 * s, n(8)));
    }
    return out;
  }

  window.WHEEL = { paths, svg, points, circle, COGS, SPOKES };
})();
