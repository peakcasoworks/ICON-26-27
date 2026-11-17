# ICON, Rotaract District 3233

A clickable concept demo of the district platform. It has no backend and no login, and every screen works on sample data.

## Run it

```
npm install
npm run dev        # http://localhost:5173
```

- `npm run build`: production build into `dist/`.
- `npm run preview`: serves the build locally.

## Deploy

The build is a static site with no server code.

- **Cloudflare Workers (Git build):** build command `npm run build`, deploy command `npx wrangler deploy`. `wrangler.jsonc` points Wrangler at `dist/`, so it skips its own Vite setup step.
- **Cloudflare Pages:** build command `npm run build`, output directory `dist`. Or from the terminal: `npx wrangler pages deploy dist`.
- **Netlify, Vercel or GitHub Pages:** the same build command and the `dist` folder. `base: './'` in `vite.config.js` makes it work from any path.

## Structure

```
index.html          page shell, icon sprite, loader markup
src/main.js         entry: loads styles, data, views and app in order
src/styles.css      colour tokens (light: Marina morning, dark: dusk), layout, components, scene animation
src/motion.js       GSAP: loader timeline, page and card reveals, group race, card tilt, ripples, DRC row moves
src/hero.js         loads the 3D scene on demand, picks a quality tier, hands one canvas between loader and start page
src/three/stage.js  Three.js start page: pink metal Rotaract wheel as the sun over Chennai, sky and sea shaders, sparks
src/search.js       district search (Cmd or Ctrl+K, or /): pages, clubs, 5,839 people, events, initiatives, posts
src/setup.js        connects motion and search to the app
src/core/data.js    sample data: 70 clubs (49 college, 21 community), 7 groups, members, events, initiatives, posts
src/core/ui.js      state, router, drawings (gear, Chennai scene, auto, rings, pager)
src/core/views-*.js every screen, by role
src/core/views-e.js seats, group desk, roster tools, export, bank matching, colours, start page sections
src/wheel.js        the Rotary wheel, used by the logo and the loader sparks
src/core/app.js     click, input and form handlers, boot
```

## Motion

The start page and loader are a Three.js scene in its own chunk (about 146 KB gzipped). The rest of the site never waits for it: a CSS gradient and the flat wheel show until it arrives, the loader gives up waiting after 1.4 s, and devices with data saver or a 2G link, or without WebGL, keep the flat version. Pixel ratio adapts to the measured frame time, and the scene stops drawing when it is scrolled away, the tab is hidden, or you leave the start page.


Animations are on by default. The yellow sparkle button in the top bar turns them off; the choice is saved in the browser. If the device asks for reduced motion, the demo shows a one-time note explaining where the button is.

## Notes

- Every person and club name is made up. The only real figures are the VIBE totals and check-ins, from November 2026.
- The Rotary wheel (24 cogs, rim, 6 spokes, keyway) is redrawn from its published proportions in `src/wheel.js`. The real site must use the artwork from the Rotary Brand Center.
- Group colours are placeholders. Change them on the Season page.
- Changes you make in the demo are saved in localStorage. "Reset demo" clears them.

## Review links

Open a seat directly: `/?role=pres`, `/?role=gco`, `/?role=landing`. Extras: `&club=college`, `&theme=dark`, `&accent=royal`, `&motion=off`, `&skip=1` (skip the loader).
