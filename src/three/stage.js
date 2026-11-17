/* The 3D start page: a cranberry-pink Rotaract wheel rising as the sun over Chennai, seen from the sea.
   Loaded on demand, so the rest of the site never waits for it. One renderer for the whole visit: the loader
   plays the intro on it, then the canvas moves into the start page and carries on.

   Everything is drawn from code, with no textures, models or HDR files to download. Cost is kept low on purpose:
   one sky quad, one sea plane, a handful of flat silhouettes, a three-part wheel, and two point clouds. No
   post-processing. Pixel ratio adapts to the measured frame time, and the loop stops when nobody can see it. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Group, Points, PlaneGeometry, BoxGeometry, SphereGeometry,
  ShapeGeometry, ExtrudeGeometry, BufferGeometry, BufferAttribute, Shape, Path, ShaderMaterial, MeshBasicMaterial,
  MeshStandardMaterial, MeshPhysicalMaterial, DirectionalLight, PMREMGenerator, Color, Fog, Vector3,
  AdditiveBlending, BackSide, SRGBColorSpace, ACESFilmicToneMapping
} from 'three';

const TAU = Math.PI * 2;
const SEA = -1.25;                          // sea level
const SUN = new Vector3(0, 1.75, -9);       // the wheel's centre
const SUN_R = 1.9;                          // the wheel's outer radius

/* ---------- small GLSL helpers shared by the shaders ---------- */
const NOISE = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }`;
// Ordered noise added after the colour conversion, so the long gradients never band.
const DITHER = /* glsl */`gl_FragColor.rgb += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;`;

/* ---------- the wheel, from the same proportions as the logo drawing ---------- */
const WP = { root: 0.885, rim: 0.7, hub: 0.3, hole: 0.135, spokeHub: 0.05, spokeRim: 0.075, keyW: 0.04, keyD: 0.075 };
function wheelShapes() {
  const pitch = TAU / 24, pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const out = [];
  for (let k = 0; k < 24; k++) {
    const a = Math.PI / 2 + k * pitch;
    [[-0.73, WP.root], [-0.6, WP.root], [-0.45, WP.root], [-0.27, WP.root], [-0.16, 1], [-0.08, 1], [0, 1], [0.08, 1], [0.16, 1]].forEach(([o, r]) => out.push(pt(r, a + o * pitch)));
  }
  const ring = new Shape(); out.forEach(([x, y], i) => (i ? ring.lineTo(x, y) : ring.moveTo(x, y))); ring.closePath();
  ring.holes.push(new Path().absarc(0, 0, WP.rim, 0, TAU, true));

  const spokes = [];
  for (let k = 0; k < 6; k++) {
    const a = k * TAU / 6, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const r0 = WP.hub * 0.8, r1 = WP.rim * 1.04, w0 = WP.spokeHub, w1 = WP.spokeRim;
    const s = new Shape();
    s.moveTo(ux * r0 + nx * w0, uy * r0 + ny * w0); s.lineTo(ux * r1 + nx * w1, uy * r1 + ny * w1);
    s.lineTo(ux * r1 - nx * w1, uy * r1 - ny * w1); s.lineTo(ux * r0 - nx * w0, uy * r0 - ny * w0); s.closePath();
    spokes.push(s);
  }

  // The hub with its round hole and the keyway notch cut up from the hole at twelve o'clock.
  const hub = new Shape().absarc(0, 0, WP.hub, 0, TAU, false);
  const h = WP.hole, kw = WP.keyW, top = h + WP.keyD, edge = Math.sqrt(h * h - kw * kw);
  const hole = new Path(); hole.moveTo(kw, edge); hole.lineTo(kw, top); hole.lineTo(-kw, top); hole.lineTo(-kw, edge);
  const a0 = Math.atan2(edge, -kw), a1 = Math.atan2(edge, kw) + TAU;
  for (let i = 1; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; hole.lineTo(h * Math.cos(a), h * Math.sin(a)); }
  hub.holes.push(hole);
  return { ring, spokes, hub };
}

// Points spread over the wheel's face, for the sparks to land on.
function wheelTargets(n, rnd) {
  const pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rnd();
    let r, a;
    if (u < 0.45) { r = WP.rim + (WP.root - WP.rim) * rnd(); a = rnd() * TAU; }
    else if (u < 0.65) { const k = Math.floor(rnd() * 24); r = WP.root + (1 - WP.root) * rnd(); a = Math.PI / 2 + (k + (rnd() - 0.5) * 0.32) * TAU / 24; }
    else if (u < 0.85) { const k = Math.floor(rnd() * 6); r = WP.hub + (WP.rim - WP.hub) * rnd(); a = k * TAU / 6 + (rnd() - 0.5) * 0.12 * (0.4 / r); }
    else { r = WP.hole + (WP.hub - WP.hole) * rnd(); a = rnd() * TAU; }
    pts[i * 3] = SUN.x + Math.cos(a) * r * SUN_R; pts[i * 3 + 1] = SUN.y + Math.sin(a) * r * SUN_R; pts[i * 3 + 2] = SUN.z + (rnd() - 0.5) * 0.25;
  }
  return pts;
}

/* ---------- Chennai skyline, flat silhouettes at real depths so the camera's motion gives true parallax ---------- */
const poly = pts => { const s = new Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const dome = (cx, y, r, n = 10) => poly([...Array(n + 1)].map((_, i) => [cx + Math.cos(Math.PI * i / n) * r, y + Math.sin(Math.PI * i / n) * r * 1.15]));
const spire = (cx, y, w, h) => poly([[cx - w, y], [cx + w, y], [cx, y + h]]);

function lighthouse() {
  return [poly([[-0.17, 0], [0.17, 0], [0.11, 1.9], [-0.11, 1.9]]), rect(-0.21, 1.9, 0.21, 1.97), rect(-0.09, 1.97, 0.09, 2.17), dome(0, 2.17, 0.1, 8), spire(0, 2.27, 0.012, 0.12)];
}
function gopuram() {
  const s = [rect(-0.55, 0, 0.55, 0.36)];
  let w = 0.5, y = 0.36;
  for (let t = 0; t < 6; t++) {
    const hgt = 0.2 - t * 0.012;
    s.push(poly([[-w, y], [w, y], [w - 0.035, y + hgt], [-w + 0.035, y + hgt]]));
    s.push(rect(-w - 0.03, y + hgt * 0.35, -w + 0.06, y + hgt * 0.8), rect(w - 0.06, y + hgt * 0.35, w + 0.03, y + hgt * 0.8));
    y += hgt; w -= 0.065;
  }
  s.push(poly([...Array(13)].map((_, i) => { const a = Math.PI * i / 12; return [Math.cos(a) * (w + 0.03), y + Math.sin(a) * 0.17]; })));
  for (let i = -2; i <= 2; i++) s.push(spire(i * (w / 2.4), y + 0.13 - Math.abs(i) * 0.03, 0.018, 0.12));
  return s;
}
function centralStation() {
  const s = [rect(-1.15, 0, 1.15, 0.52)];
  for (let i = -1.1; i <= 1.11; i += 0.1) s.push(rect(i - 0.025, 0.52, i + 0.025, 0.57));
  s.push(rect(-0.17, 0, 0.17, 1.45), poly([[-0.2, 1.45], [0.2, 1.45], [0, 1.8]]), spire(0, 1.8, 0.01, 0.14));
  [-0.82, 0.82].forEach(x => s.push(rect(x - 0.1, 0, x + 0.1, 0.92), poly([[x - 0.12, 0.92], [x + 0.12, 0.92], [x, 1.12]])));
  [-1.12, 1.12].forEach(x => s.push(rect(x - 0.07, 0, x + 0.07, 0.68), dome(x, 0.68, 0.075, 8)));
  return s;
}
function palm(h, lean) {
  const s = [], n = 8;
  const trunk = [];
  for (let i = 0; i <= n; i++) { const t = i / n; trunk.push([lean * t * t - 0.025 * (1 - t * 0.4), t * h]); }
  for (let i = n; i >= 0; i--) { const t = i / n; trunk.push([lean * t * t + 0.025 * (1 - t * 0.4), t * h]); }
  s.push(poly(trunk));
  // Fronds: long curved leaves that arch up and droop at the tips.
  const tx = lean, ty = h;
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * (0.04 + k * 0.13), len = 0.36 + (k % 3) * 0.06, dx = Math.cos(a), dy = Math.sin(a);
    const ex = tx + dx * len, ey = ty + dy * len * 0.35 - 0.16 - Math.abs(dx) * 0.06;
    const cx = tx + dx * len * 0.55, cy = ty + 0.1 + dy * 0.12;
    const leaf = new Shape(); leaf.moveTo(tx, ty);
    leaf.quadraticCurveTo(cx - dy * 0.05, cy + 0.05, ex, ey);
    leaf.quadraticCurveTo(cx + dy * 0.02, cy - 0.04, tx, ty - 0.02);
    s.push(leaf);
  }
  s.push(new Shape().absarc(tx, ty - 0.02, 0.045, 0, TAU));
  return s;
}

/* ---------- the stage ---------- */
export function createStage({ tier, colors, calm }) {
  const rnd = (s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(3233);
  const C = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, new Color().setRGB(v[0], v[1], v[2], SRGBColorSpace)]));
  const dpr = window.devicePixelRatio || 1;
  // Phones have dense screens and small canvases, so they start sharp; modest laptops start lower. Both adapt.
  const phone = Math.min(screen.width, screen.height) < 520;
  const maxPR = Math.min(dpr, tier >= 2 || phone ? 2 : 1.5), minPR = Math.min(0.75, maxPR);
  let pr = tier >= 2 ? maxPR : Math.min(maxPR, phone ? 1.75 : 1.25);

  const renderer = new WebGLRenderer({ antialias: tier >= 2 && dpr < 2, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(pr);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.className = 'stage-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  scene.fog = new Fog(C.haze, 7, 24);
  const camera = new PerspectiveCamera(38, 1, 0.1, 80);
  const LOOK = new Vector3(0, 0.5, -9);

  /* Sky: a full-screen quad drawn first. Gradient, drifting light, and the sun's glow and rays around the wheel. */
  const sky = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: [0.5, 0.7] }, uAsp: { value: 1 }, uIgnite: { value: 0 }, cTop: { value: C.skyTop }, cMid: { value: C.skyMid }, cLow: { value: C.skyLow }, cHor: { value: C.skyHor }, cGlow: { value: C.glow } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime, uAsp, uIgnite; uniform vec2 uSun; uniform vec3 cTop, cMid, cLow, cHor, cGlow; varying vec2 vUv;
      ${NOISE}
      void main() {
        float y = vUv.y;
        vec3 col = mix(cHor, cLow, smoothstep(0.18, 0.42, y));
        col = mix(col, cMid, smoothstep(0.38, 0.7, y));
        col = mix(col, cTop, smoothstep(0.68, 1.05, y));
        vec2 p = vec2(vUv.x * uAsp, y), t = vec2(uTime * 0.03, uTime * 0.02);
        float drift = noise(p * 1.6 + t) * 0.6 + noise(p * 3.4 - t * 1.7) * 0.4;
        col = mix(col, cLow, smoothstep(0.45, 0.85, drift) * 0.28 * smoothstep(0.3, 0.9, y));
        vec2 d = (vUv - uSun) * vec2(uAsp, 1.0); float r = length(d), ang = atan(d.y, d.x);
        float halo = 0.75 * exp(-r * 3.4) + 0.55 * exp(-r * 11.0);
        float rays = pow(0.5 + 0.5 * sin(ang * 16.0 + uTime * 0.12), 8.0) * 0.6 + pow(0.5 + 0.5 * sin(ang * 7.0 - uTime * 0.08 + 1.3), 5.0) * 0.4;
        col += cGlow * (halo + rays * 0.32 * exp(-r * 2.4) * smoothstep(0.06, 0.22, r)) * (0.85 + uIgnite * 0.6);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        ${DITHER}
      }`
  }));
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  /* Sea: dark cranberry close to the camera, pale near the shore, a glittering column of reflected light under the sun. */
  const sea = new Mesh(new PlaneGeometry(70, 40, 1, 1), new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIgnite: { value: 0 }, cDeep: { value: C.seaDeep }, cFar: { value: C.seaFar }, cGlow: { value: C.glow } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uTime, uIgnite; uniform vec3 cDeep, cFar, cGlow; varying vec3 vW;
      ${NOISE}
      void main() {
        float far = smoothstep(4.0, -8.0, vW.z);
        vec3 col = mix(cDeep, cFar, far);
        float w = 0.18 + max(0.0, 4.0 - vW.z) * 0.07;
        float column = exp(-pow(vW.x / w, 2.0));
        float n = noise(vec2(vW.x * 4.0, vW.z * 9.0 - uTime * 0.7)) * noise(vec2(vW.x * 9.0 + uTime * 0.4, vW.z * 17.0 + uTime * 0.3));
        float glint = smoothstep(0.42, 0.75, n);
        col += cGlow * (glint * column * 1.4 + column * 0.18 * far) * (0.8 + uIgnite * 0.4);
        float swell = noise(vec2(vW.x * 0.9, vW.z * 3.0 + uTime * 0.25));
        col += cFar * smoothstep(0.62, 0.9, swell) * 0.08 * (1.0 - far);
        col += cGlow * smoothstep(0.75, 0.95, noise(vec2(vW.x * 6.0 - uTime * 0.2, vW.z * 26.0))) * 0.06;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        ${DITHER}
      }`
  }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, SEA, -12);
  scene.add(sea);

  /* Environment for the wheel's reflections: a white-and-pink studio, rendered once into a prefiltered map. */
  const pmrem = new PMREMGenerator(renderer);
  const envScene = new Scene();
  envScene.add(new Mesh(new SphereGeometry(10, 32, 16), new ShaderMaterial({
    side: BackSide,
    uniforms: { cA: { value: C.envLow }, cB: { value: C.envHigh } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 cA, cB; varying vec3 vD; void main(){ gl_FragColor = vec4(mix(cA, cB, smoothstep(-0.4, 0.8, vD.y + vD.z * 0.3)), 1.0); }'
  })));
  const box = (w, h, x, y, z, k) => { const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(1, 1, 1).multiplyScalar(k), side: 2 })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m); };
  box(6, 2.5, -4, 5, 6, 7); box(2, 6, 6, 1, 4, 4); box(9, 0.8, 0, -4, 6, 2.2); box(1.2, 1.2, 3, 3, 7, 9);
  const envMap = pmrem.fromScene(envScene, 0.035).texture;
  envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();

  /* The wheel: rim and cogs, recessed spokes, a raised hub. Candy-pink metal with a clear coat. */
  const sh = wheelShapes();
  const ext = (shapes, depth, z) => { const g = new ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: tier >= 2 ? 4 : 2, curveSegments: tier >= 2 ? 48 : 28 }); g.translate(0, 0, -depth / 2 + z); return g; };
  const wheelMat = tier >= 2
    ? new MeshPhysicalMaterial({ color: C.wheel, metalness: 0.8, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMap, envMapIntensity: 1.5, fog: false, transparent: true, opacity: 0 })
    : new MeshStandardMaterial({ color: C.wheel, metalness: 0.8, roughness: 0.22, envMap, envMapIntensity: 1.6, fog: false, transparent: true, opacity: 0 });
  const wheel = new Group();
  [ext(sh.ring, 0.16, 0), ext(sh.spokes, 0.1, -0.015), ext(sh.hub, 0.22, 0.01)].forEach(g => wheel.add(new Mesh(g, wheelMat)));
  wheel.position.copy(SUN); wheel.scale.setScalar(SUN_R);
  scene.add(wheel);
  const key = new DirectionalLight(0xffffff, 1.6); key.position.set(-3, 5, 6); key.target = wheel; scene.add(key);

  /* Skyline: far city blocks with lit windows, then the landmarks, then palms on the near shore. */
  const silMat = new MeshBasicMaterial({ color: C.sil });
  const silFar = new MeshBasicMaterial({ color: C.silFar });
  const winMat = new ShaderMaterial({
    fog: false,
    uniforms: { uTime: { value: 0 }, cWall: { value: C.silFar }, cWin: { value: C.window }, cHaze: { value: C.haze } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 cWall, cWin, cHaze; varying vec3 vW;
      ${NOISE}
      void main() {
        vec2 g = vec2(vW.x * 10.0, vW.y * 12.0), cell = floor(g), f = fract(g);
        float inside = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.75);
        float lit = step(0.64, hash(cell + floor(uTime * 0.05 + hash(cell) * 9.0)));
        vec3 col = mix(cWall, cWin, inside * lit * 0.9);
        col = mix(col, cHaze, smoothstep(6.0, 22.0, distance(vW, cameraPosition)) * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`
  });
  const layers = [];
  const place = (geo, mat, x, z, side) => { const m = new Mesh(geo, mat); m.position.set(x, SEA, z); scene.add(m); layers.push({ m, x, side }); return m; };
  // Far blocks behind the landmarks
  [[-6.2, 1.0, 0.7], [-5.3, 1.5, 0.5], [-4.6, 0.9, 0.6], [-3.9, 1.25, 0.45], [-2.9, 0.7, 0.55], [3.0, 0.8, 0.6], [3.7, 1.35, 0.5], [5.2, 1.1, 0.7], [6.0, 1.6, 0.5], [6.8, 0.9, 0.6]]
    .forEach(([x, h, w], i) => { const g = new BoxGeometry(w, h, 0.4); g.translate(0, h / 2, 0); place(g, winMat, x, -7.5 - (i % 3) * 0.6, Math.sign(x)); });
  // LIC building, Anna Salai
  { const g = new BoxGeometry(0.55, 2.3, 0.5); g.translate(0, 1.15, 0); place(g, winMat, 4.5, -6.6, 1); place(new ShapeGeometry([rect(-0.012, 2.3, 0.012, 2.6)]), silFar, 4.5, -6.6, 1); }
  place(new ShapeGeometry(centralStation(), 6), silMat, 2.75, -5.2, 1);
  place(new ShapeGeometry(gopuram(), 6), silMat, -2.25, -5.4, -1);
  const lh = place(new ShapeGeometry(lighthouse(), 6), silMat, -3.75, -4.4, -1);
  // The clock on Central Station glows.
  const clock = place(new ShapeGeometry([new Shape().absarc(0, 1.18, 0.085, 0, TAU)], 20), new MeshBasicMaterial({ color: C.window, fog: false }), 2.75, -5.19, 1);
  // A promenade line along the shore
  const prom = new Mesh(new BoxGeometry(40, 0.07, 0.5), silMat); prom.position.set(0, SEA + 0.035, -4.2); scene.add(prom);
  const palms = [[-1.55, -3.4, 0.9, 0.1], [1.6, -3.5, 0.95, -0.12], [-4.9, -3.0, 1.05, 0.15], [-5.6, -3.6, 0.8, -0.08], [4.8, -3.1, 1.1, -0.12], [5.5, -3.7, 0.85, 0.1]]
    .map(([x, z, h, l]) => place(new ShapeGeometry(palm(h, l), 10), silMat, x, z, Math.sign(x)));

  /* Lighthouse beam: a long soft wedge that turns with the lamp. */
  const beamGeo = new BufferGeometry();
  beamGeo.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 7, 0.35, 0, 7, -0.35, 0]), 3));
  beamGeo.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0.5, 1, 1, 1, 0]), 2));
  const beam = new Mesh(beamGeo, new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: 2, fog: false,
    uniforms: { cGlow: { value: C.glow }, uA: { value: 0.5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 cGlow; uniform float uA; varying vec2 vUv; void main(){ float a = (1.0 - vUv.x) * (1.0 - abs(vUv.y - 0.5) * 2.0) * uA; gl_FragColor = vec4(cGlow * a, a); }'
  }));
  const beamPivot = new Group(); beamPivot.add(beam); scene.add(beamPivot);

  /* Sparks that gather into the wheel during the intro. */
  const NG = tier >= 2 ? 2600 : tier === 1 ? 1300 : 700;
  const gStart = new Float32Array(NG * 3), gSeed = new Float32Array(NG);
  for (let i = 0; i < NG; i++) {
    const a = rnd() * TAU, r = 5 + rnd() * 9;
    gStart[i * 3] = Math.cos(a) * r * 1.4; gStart[i * 3 + 1] = SUN.y + Math.sin(a) * r * 0.8; gStart[i * 3 + 2] = SUN.z + 3 + rnd() * 9;
    gSeed[i] = rnd();
  }
  const gGeo = new BufferGeometry();
  gGeo.setAttribute('position', new BufferAttribute(wheelTargets(NG, rnd), 3));
  gGeo.setAttribute('aStart', new BufferAttribute(gStart, 3));
  gGeo.setAttribute('aSeed', new BufferAttribute(gSeed, 1));
  const sparkFrag = /* glsl */`varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = exp(-dot(d, d) * 22.0) * vA; gl_FragColor = vec4(vC * a, a); }`;
  const gather = new Points(gGeo, new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false,
    uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uPR: { value: pr }, uSun: { value: SUN }, c1: { value: C.spark1 }, c2: { value: C.spark2 } },
    vertexShader: /* glsl */`
      attribute vec3 aStart; attribute float aSeed; uniform float uP, uTime, uPR; uniform vec3 uSun, c1, c2; varying float vA; varying vec3 vC;
      void main() {
        float d = clamp((uP - aSeed * 0.3) / 0.62, 0.0, 1.0), e = 1.0 - pow(1.0 - d, 3.0);
        vec3 p = mix(aStart, position, e);
        float ang = (1.0 - e) * (2.2 + aSeed * 2.0);
        vec2 r = p.xy - uSun.xy; p.xy = uSun.xy + mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * r;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float tw = 0.65 + 0.35 * sin(uTime * 9.0 + aSeed * 60.0);
        gl_PointSize = (8.0 + aSeed * 14.0) * (1.0 + (1.0 - e) * 1.2) * tw * uPR / -mv.z;
        vA = smoothstep(0.0, 0.08, uP) * (1.0 - smoothstep(0.82, 1.0, uP));
        vC = mix(c1, c2, step(0.55, fract(aSeed * 13.0)));
      }`,
    fragmentShader: sparkFrag
  }));
  gather.frustumCulled = false;
  scene.add(gather);

  /* Embers that keep rising off the water and around the wheel after the intro. */
  const NE = tier >= 2 ? 900 : tier === 1 ? 420 : 220;
  const eBase = new Float32Array(NE * 3);
  for (let i = 0; i < NE; i++) { eBase[i * 3] = (rnd() - 0.5) * 12; eBase[i * 3 + 1] = rnd(); eBase[i * 3 + 2] = -3 - rnd() * 8; }
  const eGeo = new BufferGeometry(); eGeo.setAttribute('position', new BufferAttribute(eBase, 3));
  const embers = new Points(eGeo, new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uOn: { value: 0 }, c1: { value: C.spark1 }, c2: { value: C.spark2 } },
    vertexShader: /* glsl */`
      uniform float uTime, uPR, uOn; uniform vec3 c1, c2; varying float vA; varying vec3 vC;
      void main() {
        float s = position.y, H = 5.5, y = mod(uTime * (0.12 + s * 0.25) + s * H, H);
        vec3 p = vec3(position.x + sin(uTime * 0.6 + s * 30.0) * 0.25, ${SEA.toFixed(2)} + y, position.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (5.0 + s * 9.0) * uPR / -mv.z * (0.7 + 0.3 * sin(uTime * 5.0 + s * 40.0));
        vA = sin(3.14159 * y / H) * uOn * 0.85;
        vC = mix(c1, c2, step(0.5, fract(s * 17.0)));
      }`,
    fragmentShader: sparkFrag
  }));
  embers.frustumCulled = false;
  scene.add(embers);

  /* ---------- layout, motion and the loop ---------- */
  let host = null, w = 1, h = 1, running = false, visible = true, io = null, ro = null;
  let t0 = performance.now(), introAt = -1, scroll = 0, introDone = false;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const ndc = new Vector3();

  function layout() {
    if (!host) return;
    const r = host.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens: widen the view so the whole wheel and both shores stay in frame.
    camera.fov = camera.aspect < 0.75 ? 58 : camera.aspect < 1.2 ? 48 : 40;
    LOOK.y = camera.aspect < 0.75 ? -0.35 : camera.aspect < 1.2 ? 0.1 : 0.5;
    camera.updateProjectionMatrix();
    sky.material.uniforms.uAsp.value = camera.aspect;
    // Pull the landmarks in towards the centre on narrow screens, so they stay visible.
    const k = Math.min(1, Math.max(0.42, camera.aspect / 1.55));
    layers.forEach(l => { l.m.position.x = l.x * k; });
    if (!running) frame(performance.now());
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    let p = 1;
    if (introAt >= 0) { p = Math.min(1, (now - introAt) / 2400); if (p >= 1 && !introDone) { introDone = true; gather.visible = false; } }
    const e = 1 - Math.pow(1 - p, 3);
    // The wheel fades in as the last sparks land, then starts turning.
    wheelMat.opacity = Math.min(1, Math.max(0, (p - 0.5) / 0.35));
    if (wheelMat.opacity >= 1 && wheelMat.transparent) { wheelMat.transparent = false; wheelMat.needsUpdate = true; }
    const ignite = Math.max(0, 1 - Math.abs(p - 0.86) / 0.14);
    const spinT = introDone ? t : 0;
    wheel.rotation.z = -spinT * 0.12 - scroll * 1.6;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    wheel.rotation.y = ptr.x * 0.22 + Math.sin(t * 0.4) * 0.05;
    wheel.rotation.x = -ptr.y * 0.15 + Math.cos(t * 0.33) * 0.04;
    wheel.scale.setScalar(SUN_R * (0.9 + 0.1 * e));
    // Camera: eases in during the intro, follows the pointer a little, sinks as the page scrolls.
    camera.position.set(ptr.x * 0.55, 0.35 + ptr.y * 0.2 - scroll * 0.9, 6.2 + (1 - e) * 3.2);
    camera.lookAt(LOOK.x, LOOK.y - scroll * 0.5, LOOK.z);
    // Lighthouse lamp turns; palms sway.
    beamPivot.position.set(lh.position.x, SEA + 2.07, lh.position.z);
    beamPivot.rotation.y = t * 0.9;
    beam.material.uniforms.uA.value = 0.32 + 0.25 * Math.max(0, Math.cos(t * 0.9));
    palms.forEach((m, i) => { m.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.025; });
    clock.material.color.copy(C.window).multiplyScalar(0.85 + 0.15 * Math.sin(t * 2));
    // Uniforms
    ndc.copy(SUN).project(camera);
    const su = sky.material.uniforms;
    su.uTime.value = t; su.uSun.value = [ndc.x * 0.5 + 0.5, ndc.y * 0.5 + 0.5]; su.uIgnite.value = ignite;
    sea.material.uniforms.uTime.value = t; sea.material.uniforms.uIgnite.value = ignite;
    winMat.uniforms.uTime.value = t;
    gather.material.uniforms.uP.value = p; gather.material.uniforms.uTime.value = t;
    embers.material.uniforms.uTime.value = t; embers.material.uniforms.uOn.value = Math.max(0, (p - 0.7) / 0.3);
    renderer.render(scene, camera);
  }

  /* Adaptive quality: if frames run long for a while, lower the pixel ratio; raise it again when there is headroom. */
  let last = 0, acc = 0, cnt = 0, settle = 0;
  function tick(now) {
    if (last) {
      const dt = now - last; acc += dt; cnt++;
      if (acc > 1200) {
        const avg = acc / cnt; acc = 0; cnt = 0;
        if (settle++ > 1) {
          if (avg > 24 && pr > minPR) setPR(pr - 0.25);
          else if (avg < 12 && pr < maxPR) setPR(pr + 0.25);
        }
      }
    }
    last = now;
    frame(now);
  }
  function setPR(v) {
    pr = Math.max(minPR, Math.min(maxPR, v));
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    gather.material.uniforms.uPR.value = pr; embers.material.uniforms.uPR.value = pr;
  }

  function sync() {
    const want = !!host && visible && !document.hidden && !calm();
    if (want && !running) { running = true; last = 0; renderer.setAnimationLoop(tick); }
    else if (!want && running) { running = false; renderer.setAnimationLoop(null); }
    if (!want && host) frame(performance.now());
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pointermove', e => { if (!host) return; ptr.tx = e.clientX / window.innerWidth - 0.5; ptr.ty = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; renderer.setAnimationLoop(null); document.documentElement.classList.add('no3d'); });

  // Compile every shader before the first frame that needs it, so the intro does not stutter.
  const ready = (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).catch(() => {});

  return {
    canvas, ready,
    get introPlayed() { return introAt >= 0; },
    attach(el) {
      if (host === el) return;
      host = el; el.prepend(canvas);
      if (io) io.disconnect(); if (ro) ro.disconnect();
      io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }); io.observe(el);
      ro = new ResizeObserver(layout); ro.observe(el);
      layout(); sync();
      requestAnimationFrame(() => el.classList.add('live'));
    },
    detach() {
      if (!host) return;
      host.classList.remove('live'); canvas.remove(); host = null;
      if (io) io.disconnect(); if (ro) ro.disconnect(); io = ro = null;
      sync();
    },
    intro() { if (introAt < 0) { introAt = performance.now(); if (calm()) introAt -= 5000; } },
    skip() { if (introAt >= 0) introAt = performance.now() - 5000; },
    setScroll(v) { scroll = v; if (!running && host) frame(performance.now()); },
    motion() { sync(); }
  };
}
