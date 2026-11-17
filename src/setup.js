// Hooks the motion layer and search into the app before it boots.
import { afterRender, loader } from './motion.js';
import { initSearch, openSearch } from './search.js';

window.onAfter = afterRender;
window.MO = { loader, openSearch };
initSearch();
