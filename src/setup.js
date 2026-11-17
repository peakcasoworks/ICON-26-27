// Hooks the motion layer and search into the app before it boots.
import { afterRender, loader, Flip } from './motion.js';
import { initSearch, openSearch } from './search.js';
import { motion as heroMotion } from './hero.js';

window.onAfter = afterRender;
window.MO = { loader, openSearch, Flip, heroMotion };
initSearch();
