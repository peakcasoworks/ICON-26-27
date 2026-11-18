// Loads the 3D start page on demand and hands its one canvas between the loader and the start page.
// Nothing here waits on the 3D code: until it arrives (or if it never can), a CSS gradient and the flat
// wheel stand in, so the page is complete on the slowest connection.

const conn = navigator.connection || {};
const small = Math.min(screen.width, screen.height) < 520;
const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
// 0: no 3D (data saver or a 2G link). 1: modest devices and phones. 2: everything else.
export const tier = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') ? 0 : cores <= 4 || mem <= 4 || small ? 1 : 2;

let stage = null, loading = null;

// Theme tokens are oklch; the browser converts them to sRGB for us by painting one pixel.
function tokens() {
  const css = getComputedStyle(document.documentElement), c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const read = name => { c.clearRect(0, 0, 1, 1); c.fillStyle = css.getPropertyValue(name).trim() || '#fff'; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255]; };
  const map = { bg: '--h-bg', edge: '--h-edge', blob: '--h-blob', blob2: '--h-blob2', floor: '--h-floor', shadow: '--h-shadow', envLow: '--h-env-low', envHigh: '--h-env-high', wheel: '--h-accent', pearl: '--h-pearl', rose: '--h-rose', spark1: '--h-accent', spark2: '--h-spark2' };
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, read(v)]));
}

function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

export function ensure() {
  if (stage) return Promise.resolve(stage);
  if (!loading) {
    loading = (tier === 0 || !webgl() ? Promise.reject(new Error('no 3D')) : import('./three/stage.js'))
      .then(m => { stage = m.createStage({ tier, colors: tokens(), calm: () => window.UI.calm() }); return stage.ready.then(() => stage); })
      .catch(e => { document.documentElement.classList.add('no3d'); throw e; });
  }
  return loading;
}

// Put the canvas into a host element. The intro plays the first time only.
export function mount(host, { intro = true } = {}) {
  return ensure().then(s => {
    if (!host.isConnected) return s;
    if (intro && !s.introPlayed) s.intro();
    s.attach(host);
    return s;
  });
}
export const unmount = () => { if (stage) stage.detach(); };
export const setScroll = v => { if (stage) stage.setScroll(v); };
export const skip = () => { if (stage) stage.skip(); };
export const motion = () => { if (stage) stage.motion(); };
export const current = () => stage;
// Light, dark or a new district pink: repaint the scene from the same tokens.
export const recolor = () => { if (stage) stage.recolor(tokens()); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
