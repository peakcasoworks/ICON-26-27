// Motion layer: the loader timeline, page reveals, the group race, landing
// parallax, card tilt and button ripples. GSAP drives transforms and opacity
// only; everything settles to a still, readable state.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import * as Hero from './hero.js';

gsap.registerPlugin(ScrollTrigger, Flip);
const UI = () => window.UI;
const on = () => !window.UI.calm();
const REVEAL = '.stat, .card, .role-card, .ev-card, .init, .g-card, .slot-day, .comm, .role-group > h2';
let cleanups = [];

/* ---------- every render ---------- */
export function afterRender(root, opts = {}) {
  if (!root) return;
  const isSheet = root.id === 'sheetBody';
  const races = root.querySelectorAll('[data-race]');
  if (!isSheet && window.UI.galMarquee) window.UI.galMarquee();
  if (!on()) {
    races.forEach(r => r.style.setProperty('--p', Number(r.dataset.race) * 0.86));
    // With animations off the start page still gets the 3D scene, as one still frame.
    const still = !isSheet && root.querySelector('.land');
    if (still) Hero.mount(still.querySelector('.stage-host')).catch(() => {});
    else if (!isSheet) Hero.unmount();
    return;
  }
  if (isSheet) {
    gsap.from(root.children, { y: 14, autoAlpha: 0, duration: 0.4, ease: 'power3.out', stagger: 0.05, clearProps: 'transform,opacity,visibility' });
    return;
  }
  // A small re-render after a tap (a stepper, a checkbox) should not replay the page.
  if (opts.keepScroll) { races.forEach(r => r.style.setProperty('--p', Number(r.dataset.race) * 0.86)); return; }

  cleanups.forEach(f => f()); cleanups = [];
  ScrollTrigger.getAll().forEach(t => t.kill());

  const heads = root.querySelectorAll('.ph, .g-band');
  if (heads.length) gsap.from(heads, { y: 18, autoAlpha: 0, duration: 0.55, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity,visibility' });
  const items = [...root.querySelectorAll(REVEAL)].filter(el => !el.closest('.land'));
  if (items.length) gsap.set(items, { autoAlpha: 0, y: 26 });
  if (items.length) ScrollTrigger.batch(items, {
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
  else { const s = Hero.current(); if (s && !s.canvas.closest('#loader')) Hero.unmount(); }
  ScrollTrigger.refresh();
}

/* ---------- start page ---------- */
function landing(land) {
  // The 3D scene loads on its own; the type and button never wait for it.
  Hero.mount(land.querySelector('.stage-host')).catch(() => {});
  const tl = gsap.timeline({ delay: 0.05 });
  tl.from(land.querySelectorAll('.ltr'), { yPercent: 115, rotate: 8, duration: 0.95, ease: 'expo.out', stagger: 0.08 }, 0.1)
    .from(land.querySelectorAll('.wm-sub, .land-top .btn'), { y: 16, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0.5);
  // Scroll: the brand lifts away, the camera sinks and the wheel turns as the roles come up.
  gsap.to(land.querySelector('.land-top'), { yPercent: -30, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: land, start: 'top top', end: '70% top', scrub: true } });
  ScrollTrigger.create({ trigger: land, start: 'top top', end: 'bottom top', onUpdate: st => Hero.setScroll(st.progress) });
}

/* ---------- loader ---------- */
// First visit in a session: sparks gather into the 3D wheel while ICON rises. If the 3D code is slow to
// arrive, the loader gives up waiting after 1.4 s and the start page picks the scene up when it lands.
export function loader(done) {
  const L = document.getElementById('loader');
  let seen = false;
  try { seen = sessionStorage.getItem('icon-seen') === '1'; } catch (e) { /* storage blocked */ }
  if (seen || !on()) { L.hidden = true; done(); return; }
  const U = UI(), host = document.getElementById('ldStage');
  const name = U.P.season === 'vibe' ? 'VIBE' : 'ICON';
  document.getElementById('ldName').innerHTML = name.split('').map(c => `<span class="ltr">${c}</span>`).join('');
  L.hidden = false;
  const q = s => L.querySelectorAll(s);
  gsap.set(q('.ld-name .ltr'), { yPercent: 120 });
  gsap.set(q('.ld-sub, #ldSkip'), { autoAlpha: 0 });
  gsap.to(q('.ld-name .ltr'), { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: 0.2 });
  gsap.to(q('.ld-sub'), { autoAlpha: 1, duration: 0.5, delay: 0.6 });
  gsap.to('#ldSkip', { autoAlpha: 1, duration: 0.3, delay: 0.4 });

  let finished = false, st = null, end = 0;
  const finish = () => {
    if (finished) return; finished = true;
    clearTimeout(slow); clearTimeout(end);
    try { sessionStorage.setItem('icon-seen', '1'); } catch (e) { /* ignore */ }
    // On the start page, the canvas moves under the loader first, so fading the loader reveals the same scene.
    const land = document.querySelector('.land .stage-host');
    if (st && land) Hero.mount(land);
    gsap.to(L, { autoAlpha: 0, duration: 0.7, ease: 'power2.out', onComplete: () => {
      L.hidden = true; gsap.set(L, { clearProps: 'opacity,visibility' });
      if (st && st.canvas.parentNode === host) Hero.unmount();
    } });
    done();
  };
  const slow = setTimeout(() => { if (!st) finish(); }, 1400);
  Hero.ensure().then(s => {
    if (finished) return;
    st = s; clearTimeout(slow);
    if (!s.introPlayed) s.intro();
    s.attach(host);
    end = setTimeout(finish, 2700);
  }).catch(() => {});
  document.getElementById('ldSkip').onclick = () => { Hero.skip(); finish(); };
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

export { gsap, Flip };
