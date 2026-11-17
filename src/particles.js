// Sparks that spiral in from the edges of the screen and settle on target
// points: every Rotaractor a spark, together they make the Rotary wheel.
// Plain 2D canvas, about 500 particles, additive blending for the glow.

const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function gather(canvas, targets, { duration = 1500, colors = ['#fff'], cx, cy } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const R = Math.hypot(W, H) * 0.6;
  const parts = targets.map(([tx, ty]) => {
    const a0 = Math.random() * Math.PI * 2;
    const r0 = R * (0.55 + Math.random() * 0.45);
    const at = Math.atan2(ty - cy, tx - cx), rt = Math.hypot(tx - cx, ty - cy);
    return { a0, r0, at, rt, d: Math.random() * 0.35, s: 0.8 + Math.random() * 1.8, c: colors[Math.floor(Math.random() * colors.length)], tw: Math.random() * 6 };
  });
  const t0 = performance.now();
  let raf = 0, alive = true;
  const frame = now => {
    if (!alive) return;
    const t = (now - t0) / duration;
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const k = easeInOut(Math.min(1, Math.max(0, (t - p.d) / (1 - 0.35))));
      // spiral in: radius and angle both ease, with an extra swirl that unwinds
      const r = p.r0 + (p.rt - p.r0) * k;
      let da = p.at - p.a0;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const a = p.a0 + da * k + (1 - k) * 2.2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const glow = k >= 1 ? 0.6 + 0.4 * Math.sin(now / 160 + p.tw) : 0.35 + 0.65 * k;
      g.globalAlpha = glow;
      g.fillStyle = p.c;
      g.beginPath(); g.arc(x, y, p.s * (1.6 - 0.6 * k), 0, Math.PI * 2); g.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return { stop() { alive = false; cancelAnimationFrame(raf); g.clearRect(0, 0, W, H); } };
}

// Points along every edge of the Rotary wheel (24 cogs, rim, 6 spokes, hub and keyway),
// in the loader wheel's own -64..64 coordinate space.
export function gearPoints() { return window.WHEEL.points(60, 1.5); }
