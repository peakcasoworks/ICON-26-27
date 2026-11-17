// Motion layer: the loader timeline, page reveals, the group race, landing
// parallax, card tilt and button ripples. GSAP drives transforms and opacity
// only; everything settles to a still, readable state.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gather, gearPoints } from './particles.js';

gsap.registerPlugin(ScrollTrigger);
const UI = () => window.UI;
const on = () => !window.UI.calm();
const REVEAL = '.stat, .card, .role-card, .ev-card, .init, .g-card, .slot-day, .comm, .role-group > h2';
let cleanups = [];

/* ---------- every render ---------- */
export function afterRender(root, opts = {}) {
  if (!root) return;
  const isSheet = root.id === 'sheetBody';
  const races = root.querySelectorAll('[data-race]');
  if (!on()) { races.forEach(r => r.style.setProperty('--p', Number(r.dataset.race) * 0.86)); return; }
  if (isSheet) {
    gsap.from(root.children, { y: 14, autoAlpha: 0, duration: 0.4, ease: 'power3.out', stagger: 0.05, clearProps: 'transform,opacity,visibility' });
    return;
  }
  // A small re-render after a tap (a stepper, a checkbox) should not replay the page.
  if (opts.keepScroll) { races.forEach(r => r.style.setProperty('--p', Number(r.dataset.race) * 0.86)); return; }

  cleanups.forEach(f => f()); cleanups = [];
  ScrollTrigger.getAll().forEach(t => t.kill());

  gsap.from(root.querySelectorAll('.ph, .g-band'), { y: 18, autoAlpha: 0, duration: 0.55, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity,visibility' });
  const items = [...root.querySelectorAll(REVEAL)].filter(el => !el.closest('.land'));
  gsap.set(items, { autoAlpha: 0, y: 26 });
  ScrollTrigger.batch(items, {
    start: 'top 96%', once: true,
    onEnter: b => gsap.to(b, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.055, clearProps: 'transform,opacity,visibility' })
  });

  races.forEach((r, i) => {
    const v = Number(r.dataset.race) * 0.86;
    r.classList.add('moving');
    gsap.fromTo(r, { '--p': 0 }, { '--p': v, duration: 1.3 + v / 110, delay: 0.35 + i * 0.08, ease: 'power2.out', onComplete: () => r.classList.remove('moving') });
  });

  const tiles = root.querySelectorAll('.wf');
  if (tiles.length) gsap.from(tiles, { scale: 0, autoAlpha: 0, duration: 0.45, ease: 'back.out(2.2)', stagger: { amount: 0.8, grid: 'auto', from: 'center' }, delay: 0.2, clearProps: 'transform,opacity,visibility' });

  const land = root.querySelector('.land');
  if (land) landing(land);
  ScrollTrigger.refresh();
}

/* ---------- start page ---------- */
function landing(land) {
  const tl = gsap.timeline({ delay: 0.05 });
  tl.from(land.querySelector('.land-gear'), { scale: 0, rotate: -200, duration: 1.1, ease: 'back.out(1.5)' }, 0)
    .from(land.querySelectorAll('.ltr'), { yPercent: 115, rotate: 10, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.15)
    .from(land.querySelectorAll('.wm-sub, .land-top .btn'), { y: 16, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0.55)
    .from(land.querySelectorAll('.scene .ly'), { y: 60, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.09 }, 0.1)
    .from(land.querySelector('.sun-rise'), { y: 90, duration: 1.4, ease: 'power2.out' }, 0.3);

  // Pointer parallax: near layers move more than far ones.
  const layers = [...land.querySelectorAll('[data-depth]')].map(el => ({ x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }), d: Number(el.dataset.depth) }));
  const move = e => { const nx = e.clientX / window.innerWidth - 0.5; layers.forEach(l => l.x(-nx * 34 * l.d)); };
  land.addEventListener('pointermove', move);
  cleanups.push(() => land.removeEventListener('pointermove', move));

  // Scroll: the brand lifts away and the city sinks slightly as the roles come up.
  gsap.to(land.querySelector('.land-top'), { yPercent: -35, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: land, start: 'top top', end: '70% top', scrub: true } });
  land.querySelectorAll('.scene [data-depth]').forEach(el => {
    gsap.to(el, { yPercent: Number(el.dataset.depth) * 10, ease: 'none', scrollTrigger: { trigger: land, start: 'top top', end: 'bottom top', scrub: true } });
  });
}

/* ---------- loader ---------- */
export function loader(done) {
  const L = document.getElementById('loader');
  let seen = false;
  try { seen = sessionStorage.getItem('icon-seen') === '1'; } catch (e) { /* storage blocked */ }
  if (seen || !on()) { L.hidden = true; done(); return; }
  const U = UI();
  const gearBox = document.getElementById('ldGear');
  const w = WHEEL.paths(0, 0, 60);
  // Drawn in this order as the sparks land: the window and hub outlines, the spokes, then the solid wheel fills in.
  gearBox.innerHTML = `<svg viewBox="-64 -64 128 128" aria-hidden="true"><path class="ld-ring" pathLength="1" d="${WHEEL.circle(0, 0, 60 * 0.7)}${WHEEL.circle(0, 0, 60 * 0.3)}"/><path class="ld-rose" pathLength="1" d="${w.spokes}"/><g class="ld-teeth"><path fill-rule="evenodd" d="${w.rim}"/><path fill-rule="evenodd" d="${w.hub}"/><path d="${w.spokes}"/></g></svg>`;
  document.getElementById('ldSky').innerHTML = U.scene('ld');
  const name = U.P.season === 'vibe' ? 'VIBE' : 'ICON';
  document.getElementById('ldName').innerHTML = name.split('').map(c => `<span class="ltr">${c}</span>`).join('');
  L.hidden = false;

  const css = getComputedStyle(document.documentElement);
  const colors = ['--accent', '--gold', '--sun1', '--star'].map(v => css.getPropertyValue(v).trim());
  const box = gearBox.getBoundingClientRect();
  const cx = box.left + box.width / 2, cy = box.top + box.height / 2, k = box.width / 128;
  const sp = gather(document.getElementById('ldCanvas'), gearPoints().map(([x, y]) => [cx + x * k, cy + y * k]), { duration: 1500, colors, cx, cy });

  const q = s => L.querySelectorAll(s);
  gsap.set(gearBox, { autoAlpha: 0, scale: 0.85 });
  gsap.set(q('.ld-name .ltr'), { yPercent: 120 });
  gsap.set(q('.ld-sub, #ldSkip'), { autoAlpha: 0 });
  gsap.set(q('.ld-scene .ly'), { y: 150, autoAlpha: 0 });
  gsap.set(q('.ld-scene .sun-rise'), { y: 120 });
  gsap.set(q('.ld-rose, .ld-ring'), { strokeDashoffset: 1 });
  gsap.set(q('.ld-teeth'), { autoAlpha: 0, rotate: -90, scale: 0.7, transformOrigin: '50% 50%' });

  let finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    try { sessionStorage.setItem('icon-seen', '1'); } catch (e) { /* ignore */ }
    sp.stop();
    gsap.to(L, { yPercent: -100, duration: 0.85, ease: 'expo.inOut', onComplete: () => { L.hidden = true; gsap.set(L, { clearProps: 'transform,opacity,visibility' }); } });
    done();
  };
  const tl = gsap.timeline({ onComplete: finish });
  tl.to('#ldSkip', { autoAlpha: 1, duration: 0.3 }, 0.2)
    .to(gearBox, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 1.25)
    .to('#ldCanvas', { autoAlpha: 0, duration: 0.5 }, 1.45)
    .to(q('.ld-rose'), { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 1.4)
    .to(q('.ld-ring'), { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 1.6)
    .to(q('.ld-teeth'), { autoAlpha: 1, rotate: 0, scale: 1, duration: 0.7, ease: 'back.out(1.8)' }, 1.7)
    .to(gearBox, { rotate: 200, y: -30, scale: 0.55, autoAlpha: 0, duration: 0.8, ease: 'power3.in' }, 2.45)
    .to(q('.ld-scene .ly'), { y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out', stagger: 0.09 }, 2.5)
    .to(q('.ld-scene .sun-rise'), { y: 0, duration: 1.3, ease: 'power2.out' }, 2.75)
    .to(q('.ld-name .ltr'), { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 }, 2.75)
    .to(q('.ld-sub'), { autoAlpha: 1, duration: 0.5 }, 3.1)
    .to({}, { duration: 0.9 });
  document.getElementById('ldSkip').onclick = () => { tl.progress(1); };
}

/* ---------- micro-interactions ---------- */
let tiltEl = null;
const TILT = '.role-card, .ev-card, .init, .g-card';
document.addEventListener('pointermove', e => {
  if (!on() || e.pointerType !== 'mouse') return;
  const el = e.target.closest(TILT);
  if (tiltEl && tiltEl !== el) { gsap.to(tiltEl, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power3.out' }); tiltEl = null; }
  if (!el) return;
  tiltEl = el;
  const r = el.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
  gsap.to(el, { rotationY: nx * 7, rotationX: -ny * 7, transformPerspective: 800, duration: 0.4, ease: 'power3.out' });
}, { passive: true });

document.addEventListener('pointerdown', e => {
  if (!on()) return;
  const b = e.target.closest('.btn, .chip, .role-card, .pg');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect();
  const s = document.createElement('span');
  s.className = 'ripple';
  const d = Math.max(r.width, r.height) * 2.2;
  Object.assign(s.style, { width: d + 'px', height: d + 'px', left: e.clientX - r.left - d / 2 + 'px', top: e.clientY - r.top - d / 2 + 'px' });
  b.appendChild(s);
  gsap.fromTo(s, { scale: 0, opacity: 0.35 }, { scale: 1, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => s.remove() });
}, { passive: true });

export { gsap };
