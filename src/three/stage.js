/* The 3D start page: a Rotaract pink metal wheel floating in a white studio, with thin rings turning around it
   and pearls hanging at different depths. Loaded on demand, so the rest of the site never waits for it. One
   renderer for the whole visit: the loader plays the intro on it, then the canvas moves into the start page.

   Everything is drawn from code, with no textures, models or HDR files to download. Cost is kept low on purpose:
   one backdrop quad, one floor plane, a three-part wheel, three rings, two instanced pearl sets and two point
   clouds. No post-processing. Pixel ratio adapts to the measured frame time, and the loop stops when nobody can see it. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Group, Points, PlaneGeometry, SphereGeometry, TorusGeometry,
  ExtrudeGeometry, BufferGeometry, BufferAttribute, Shape, Path, ShaderMaterial, MeshBasicMaterial, InstancedMesh,
  MeshStandardMaterial, MeshPhysicalMaterial, DirectionalLight, PMREMGenerator, Color, Fog, Vector3, Object3D,
  BackSide, SRGBColorSpace, NeutralToneMapping
} from 'three';

const TAU = Math.PI * 2;
const FLOOR = -1.25;                        // the studio floor
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
  // Neutral tone mapping keeps the studio white white, where ACES would grey it.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.className = 'stage-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  scene.fog = new Fog(C.edge, 12, 40);
  const camera = new PerspectiveCamera(38, 1, 0.1, 80);
  const LOOK = new Vector3(0, 0.5, -9);

  /* Backdrop: a full-screen quad drawn first. White around the wheel, a blush sweep at the edges, two soft pink lights drifting behind. */
  const sky = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: [0.5, 0.65] }, uAsp: { value: 1 }, uIgnite: { value: 0 }, cBg: { value: C.bg }, cEdge: { value: C.edge }, cBlob: { value: C.blob }, cBlob2: { value: C.blob2 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime, uAsp, uIgnite; uniform vec2 uSun; uniform vec3 cBg, cEdge, cBlob, cBlob2; varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 d = (vUv - uSun) * vec2(uAsp, 1.0);
        float r = length(d);
        vec3 col = mix(cBg, cEdge, smoothstep(0.18, 1.15, r));
        // Two large, slow, soft lights: a warm pink and a cooler pink, never sharper than a blur.
        vec2 p = vec2(vUv.x * uAsp, vUv.y);
        vec2 a = vec2(0.22 * uAsp + sin(uTime * 0.11) * 0.12 * uAsp, 0.78 + cos(uTime * 0.09) * 0.08);
        vec2 b = vec2(0.82 * uAsp + cos(uTime * 0.08) * 0.1 * uAsp, 0.28 + sin(uTime * 0.12) * 0.08);
        float n = noise(p * 2.2 + uTime * 0.04) * 0.25;
        col = mix(col, cBlob, (exp(-pow(length(p - a) * 2.1, 2.0)) * 0.42 + n * 0.08));
        col = mix(col, cBlob2, exp(-pow(length(p - b) * 2.4, 2.0)) * 0.55);
        // A soft white glow behind the wheel that flares as it lands.
        col = mix(col, cBg, exp(-r * 4.5) * (0.65 + uIgnite * 0.35));
        col = mix(col, cBlob, exp(-pow(r * 5.0, 2.0)) * uIgnite * 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        ${DITHER}
      }`
  }));
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  /* Floor: a pale blush surface that melts into the backdrop, with a soft contact shadow under the wheel. */
  const floor = new Mesh(new PlaneGeometry(60, 40, 1, 1), new ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uFoot: { value: [0, -9] }, uLift: { value: 0 }, uOn: { value: 0 }, cFloor: { value: C.floor }, cShadow: { value: C.shadow } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform vec2 uFoot; uniform float uLift, uOn; uniform vec3 cFloor, cShadow; varying vec3 vW;
      void main() {
        float fade = smoothstep(-19.0, -10.0, vW.z) * (1.0 - smoothstep(1.0, 6.0, vW.z)) * (1.0 - smoothstep(6.0, 14.0, abs(vW.x)));
        vec2 q = (vW.xz - uFoot) * vec2(1.0, 2.2);
        float sh = exp(-dot(q, q) * (0.55 + uLift)) * (0.32 - uLift * 0.6) * uOn;
        vec3 col = mix(cFloor, cShadow, sh);
        gl_FragColor = vec4(col, fade * 0.9);
        #include <colorspace_fragment>
      }`
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, -8);
  floor.renderOrder = -5;
  scene.add(floor);

  /* Environment for the reflections: a white studio with a pink bounce from below, rendered once into a prefiltered map. */
  const pmrem = new PMREMGenerator(renderer);
  const envScene = new Scene();
  envScene.add(new Mesh(new SphereGeometry(10, 32, 16), new ShaderMaterial({
    side: BackSide,
    uniforms: { cA: { value: C.envLow }, cB: { value: C.envHigh } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 cA, cB; varying vec3 vD; void main(){ gl_FragColor = vec4(mix(cA, cB, smoothstep(-0.5, 0.6, vD.y + vD.z * 0.25)), 1.0); }'
  })));
  const box = (w, h, x, y, z, k) => { const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(1, 1, 1).multiplyScalar(k), side: 2 })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m); };
  box(6, 2.5, -4, 5, 6, 6); box(2, 6, 6, 1, 4, 3.5); box(9, 0.8, 0, -4, 6, 1.6); box(1.2, 1.2, 3, 3, 7, 8);
  const envMap = pmrem.fromScene(envScene, 0.035).texture;
  envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();

  /* The wheel: rim and cogs, recessed spokes, a raised hub. Rotaract pink metal with a clear coat. */
  const sh = wheelShapes();
  const ext = (shapes, depth, z) => { const g = new ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: tier >= 2 ? 4 : 2, curveSegments: tier >= 2 ? 48 : 28 }); g.translate(0, 0, -depth / 2 + z); return g; };
  const metal = (color, o = {}) => tier >= 2
    ? new MeshPhysicalMaterial(Object.assign({ color, metalness: 0.8, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, envMap, envMapIntensity: 1.5, transparent: true, opacity: 0 }, o))
    : new MeshStandardMaterial(Object.assign({ color, metalness: 0.75, roughness: 0.22, envMap, envMapIntensity: 1.45, transparent: true, opacity: 0 }, o));
  const wheelMat = metal(C.wheel, { fog: false });
  const wheel = new Group();
  [ext(sh.ring, 0.16, 0), ext(sh.spokes, 0.1, -0.015), ext(sh.hub, 0.22, 0.01)].forEach(g => wheel.add(new Mesh(g, wheelMat)));
  wheel.position.copy(SUN); wheel.scale.setScalar(SUN_R);
  scene.add(wheel);
  const key = new DirectionalLight(0xffffff, 1.5); key.position.set(-3, 5, 6); key.target = wheel; scene.add(key);

  /* Three thin rings turning around the wheel like a gyroscope: one pink, two pearl. */
  const pearlMat = metal(C.pearl, { metalness: 0.1, roughness: 0.28, envMapIntensity: 1.1 });
  const ringMat = metal(C.rose, { metalness: 0.85, roughness: 0.16 });
  const seg = tier >= 2 ? 160 : 96;
  const rings = [[1.28, 0.014, ringMat, 1.15, 0.2], [1.42, 0.009, pearlMat, -0.4, -0.75], [1.56, 0.006, pearlMat, 0.35, 1.2]].map(([r, tube, mat, rx, ry]) => {
    const m = new Mesh(new TorusGeometry(r * SUN_R, tube * SUN_R * 1.6, 12, seg), mat);
    m.position.copy(SUN); m.rotation.set(rx, ry, 0); scene.add(m);
    return { m, rx, ry, sp: 0.06 + rnd() * 0.08 };
  });

  /* Pearls floating at different depths, so the camera's motion gives real parallax. One draw call per finish. */
  const sphere = new SphereGeometry(1, tier >= 2 ? 40 : 24, tier >= 2 ? 24 : 16);
  const pearls = [];
  const makeSet = (n, mat) => {
    const im = new InstancedMesh(sphere, mat, n); im.frustumCulled = false; scene.add(im);
    for (let i = 0; i < n; i++) {
      let x, y, z;
      do { x = (rnd() - 0.5) * 13; y = FLOOR + 0.4 + rnd() * 5.4; z = -14 + rnd() * 10; } while (Math.hypot(x - SUN.x, (y - SUN.y) * 1.1) < SUN_R * 2.05 && z < -6 && z > -12);
      pearls.push({ im, i, x, y, z, r: 0.05 + Math.pow(rnd(), 2.2) * 0.3, ph: rnd() * TAU, sp: 0.25 + rnd() * 0.35 });
    }
    return im;
  };
  const sets = [makeSet(tier >= 1 ? 16 : 10, pearlMat), makeSet(tier >= 1 ? 11 : 7, ringMat)];
  const dummy = new Object3D();

  /* Sparks that gather into the wheel during the intro. Normal blending, since added light vanishes on white. */
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
  const sparkFrag = /* glsl */`varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = exp(-dot(d, d) * 18.0) * vA; gl_FragColor = vec4(vC, a); }`;
  const gather = new Points(gGeo, new ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uPR: { value: pr }, uSun: { value: SUN }, c1: { value: C.spark1 }, c2: { value: C.spark2 } },
    vertexShader: /* glsl */`
      attribute vec3 aStart; attribute float aSeed; uniform float uP, uTime, uPR; uniform vec3 uSun, c1, c2; varying float vA; varying vec3 vC;
      void main() {
        float d = clamp((uP - aSeed * 0.3) / 0.62, 0.0, 1.0), e = 1.0 - pow(1.0 - d, 3.0);
        vec3 p = mix(aStart, position, e);
        float ang = (1.0 - e) * (2.2 + aSeed * 2.0);
        vec2 r = p.xy - uSun.xy; p.xy = uSun.xy + mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * r;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float tw = 0.7 + 0.3 * sin(uTime * 9.0 + aSeed * 60.0);
        gl_PointSize = (7.0 + aSeed * 11.0) * (1.0 + (1.0 - e) * 1.1) * tw * uPR / -mv.z;
        vA = smoothstep(0.0, 0.08, uP) * (1.0 - smoothstep(0.82, 1.0, uP)) * 0.9;
        vC = mix(c1, c2, step(0.6, fract(aSeed * 13.0)));
      }`,
    fragmentShader: sparkFrag
  }));
  gather.frustumCulled = false;
  scene.add(gather);

  /* Pink dust drifting slowly upward after the intro. */
  const NE = tier >= 2 ? 520 : tier === 1 ? 260 : 140;
  const eBase = new Float32Array(NE * 3);
  for (let i = 0; i < NE; i++) { eBase[i * 3] = (rnd() - 0.5) * 14; eBase[i * 3 + 1] = rnd(); eBase[i * 3 + 2] = -3 - rnd() * 10; }
  const eGeo = new BufferGeometry(); eGeo.setAttribute('position', new BufferAttribute(eBase, 3));
  const dust = new Points(eGeo, new ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uOn: { value: 0 }, c1: { value: C.spark1 }, c2: { value: C.spark2 } },
    vertexShader: /* glsl */`
      uniform float uTime, uPR, uOn; uniform vec3 c1, c2; varying float vA; varying vec3 vC;
      void main() {
        float s = position.y, H = 6.5, y = mod(uTime * (0.05 + s * 0.1) + s * H, H);
        vec3 p = vec3(position.x + sin(uTime * 0.4 + s * 30.0) * 0.3, ${FLOOR.toFixed(2)} + y, position.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (4.0 + s * 7.0) * uPR / -mv.z;
        vA = sin(3.14159 * y / H) * uOn * 0.55;
        vC = mix(c1, c2, step(0.4, fract(s * 17.0)));
      }`,
    fragmentShader: sparkFrag
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- layout, motion and the loop ---------- */
  let host = null, w = 1, h = 1, running = false, visible = true, io = null, ro = null;
  let t0 = performance.now(), introAt = -1, scroll = 0, introDone = false, spread = 1;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const ndc = new Vector3();
  const fadeIn = [wheelMat, pearlMat, ringMat];

  function layout() {
    if (!host) return;
    const r = host.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens: widen the view so the whole wheel and its rings stay in frame.
    camera.fov = camera.aspect < 0.75 ? 58 : camera.aspect < 1.2 ? 48 : 40;
    LOOK.y = camera.aspect < 0.75 ? -0.85 : camera.aspect < 1.2 ? 0.1 : 0.5;
    camera.updateProjectionMatrix();
    sky.material.uniforms.uAsp.value = camera.aspect;
    // Pull the pearls in towards the centre on narrow screens, so they stay visible.
    spread = Math.min(1, Math.max(0.45, camera.aspect / 1.55));
    if (!running) frame(performance.now());
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    let p = 1;
    if (introAt >= 0) { p = Math.min(1, (now - introAt) / 2400); if (p >= 1 && !introDone) { introDone = true; gather.visible = false; } }
    const e = 1 - Math.pow(1 - p, 3);
    // The wheel, rings and pearls fade in as the last sparks land, then the wheel starts turning.
    const op = Math.min(1, Math.max(0, (p - 0.5) / 0.35));
    fadeIn.forEach(m => { m.opacity = op; if (op >= 1 && m.transparent) { m.transparent = false; m.needsUpdate = true; } });
    const ignite = Math.max(0, 1 - Math.abs(p - 0.86) / 0.14);
    const spinT = introDone ? t : 0;
    const bob = Math.sin(t * 0.7) * 0.09 * op;
    wheel.position.y = SUN.y + bob;
    wheel.rotation.z = -spinT * 0.12 - scroll * 1.6;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    wheel.rotation.y = ptr.x * 0.22 + Math.sin(t * 0.4) * 0.06;
    wheel.rotation.x = -ptr.y * 0.15 + Math.cos(t * 0.33) * 0.05;
    wheel.scale.setScalar(SUN_R * (0.9 + 0.1 * e));
    rings.forEach((g, i) => {
      g.m.position.y = SUN.y + bob;
      g.m.rotation.x = g.rx + Math.sin(t * g.sp + i) * 0.25 + scroll * 0.6;
      g.m.rotation.y = g.ry + t * g.sp * (i % 2 ? -1 : 1);
      g.m.scale.setScalar(0.8 + 0.2 * e);
    });
    sets.forEach(im => {
      pearls.forEach(q => {
        if (q.im !== im) return;
        dummy.position.set(q.x * spread + Math.cos(t * q.sp * 0.6 + q.ph) * 0.12, q.y + Math.sin(t * q.sp + q.ph) * 0.18 - scroll * 0.8 * (q.z + 15) / 10, q.z);
        dummy.scale.setScalar(q.r * (0.3 + 0.7 * e));
        dummy.updateMatrix(); im.setMatrixAt(q.i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    });
    // Camera: eases in during the intro, follows the pointer a little, sinks as the page scrolls.
    camera.position.set(ptr.x * 0.55, 0.35 + ptr.y * 0.2 - scroll * 0.9, 6.2 + (1 - e) * 3.2);
    camera.lookAt(LOOK.x, LOOK.y - scroll * 0.5, LOOK.z);
    // Uniforms
    ndc.copy(wheel.position).project(camera);
    const su = sky.material.uniforms;
    su.uTime.value = t; su.uSun.value = [ndc.x * 0.5 + 0.5, ndc.y * 0.5 + 0.5]; su.uIgnite.value = ignite;
    const fu = floor.material.uniforms;
    fu.uFoot.value = [wheel.position.x, SUN.z]; fu.uLift.value = Math.max(0, bob) * 0.6; fu.uOn.value = op;
    gather.material.uniforms.uP.value = p; gather.material.uniforms.uTime.value = t;
    dust.material.uniforms.uTime.value = t; dust.material.uniforms.uOn.value = Math.max(0, (p - 0.7) / 0.3);
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
    gather.material.uniforms.uPR.value = pr; dust.material.uniforms.uPR.value = pr;
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
    recolor(colors) {
      Object.entries(colors).forEach(([k, v]) => { if (C[k]) C[k].setRGB(v[0], v[1], v[2], SRGBColorSpace); });
      wheelMat.color.copy(C.wheel); pearlMat.color.copy(C.pearl); ringMat.color.copy(C.rose); scene.fog.color.copy(C.edge);
      if (!running && host) frame(performance.now());
    },
    motion() { sync(); }
  };
}
