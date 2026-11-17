import { defineConfig } from 'vite';

// Relative base so the built site works from any host or sub-folder
// (Cloudflare Pages, Netlify, GitHub Pages, a plain static server).
export default defineConfig({
  base: './',
  server: { port: 5173, open: true },
  build: { target: 'es2020', cssMinify: true }
});
