// GitHub Pages has no server-side rewrites, so it returns a literal HTTP 404
// for any path that isn't a real file (the public/404.html redirect trick
// only fires for real browsers that execute its JS — Googlebot's initial
// fetch sees the raw 404 status and won't index the page, no matter what
// that JS would have eventually rendered). Every route in sitemap.xml other
// than "/" hit exactly this problem.
//
// Fix: after `vite build`, copy the built index.html to <route>/index.html
// for each sitemap route, so GitHub Pages serves a real HTTP 200 file at
// that exact URL. React Router still takes over client-side from there,
// identical to today — these copies only exist so the *first*, pre-JS
// fetch succeeds. Each copy also gets its own title/description/canonical
// patched in (rather than staying identical to the homepage's), since a
// canonical of "/" on every copy would tell Google they're all duplicates
// of the homepage and get them de-indexed rather than indexed.
//
// Keep this list's title/description in sync with each page's own
// useDocumentTitle(...) call — this file is what search engines see before
// JS runs; useDocumentTitle is what a real browser sees after.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE_URL = 'https://typeladder.com';
const DIST_DIR = join(import.meta.dirname, '..', 'dist');

const ROUTES = [
  {
    path: 'leaderboard',
    title: 'leaderboard',
    description: "See the fastest typists on typeladder's global typing leaderboard, ranked by WPM across every typing test mode.",
  },
  {
    path: 'duel',
    title: 'duel',
    description: 'Challenge a friend to a real-time typing duel on typeladder — race head-to-head and see who types faster and more accurately, live.',
  },
  {
    path: 'ranked',
    title: 'ranked',
    description: 'Compete in ranked typing races against real players on typeladder. Climb the elo ladder from Bronze to Legend in this competitive typing game.',
  },
  {
    path: 'learn',
    title: 'learn',
    description: 'Learn to type from scratch on typeladder with a keybr-style lesson mode — start on the home row and unlock new letters as your accuracy improves.',
  },
  {
    path: 'privacy',
    title: 'privacy policy',
    description: "typeladder's privacy policy — what data we collect, why, and how it's used.",
  },
  {
    path: 'contact',
    title: 'contact',
    description: 'Contact typeladder to report a bug or request a new feature.',
  },
];

const template = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');

const replaceTag = (html, pattern, replacement) => {
  if (!pattern.test(html)) throw new Error(`generate-static-routes: pattern not found in index.html: ${pattern}`);
  return html.replace(pattern, replacement);
};

for (const route of ROUTES) {
  const pageTitle = `${route.title} · typeladder`;
  // No trailing slash — matches both sitemap.xml's URL form and the app's
  // own React Router paths (e.g. <Route path="/duel">), so the canonical
  // here doesn't read as a different URL from what's actually navigated to
  // or submitted.
  const url = `${SITE_URL}/${route.path}`;

  let html = template;
  html = replaceTag(html, /<title>.*?<\/title>/, `<title>${pageTitle}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${route.description}" />`
  );
  html = replaceTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${pageTitle}" />`);
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${route.description}" />`
  );
  html = replaceTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${pageTitle}" />`);
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${route.description}" />`
  );

  const outDir = join(DIST_DIR, route.path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  console.log(`generate-static-routes: wrote dist/${route.path}/index.html`);
}
