import { readFile, writeFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { join } from 'node:path';

const root = 'dist/cinetex/browser';
const origin = 'https://cinetex.app';
const publicPaths = ['', 'shows', 'about', 'privacy', 'terms'];
for (const entry of await readdir(join(root, 'movie'), { withFileTypes: true })) {
  if (entry.isDirectory() && /^\d+$/.test(entry.name)) publicPaths.push('movie/' + entry.name);
}
const entries = [];
for (const path of publicPaths) {
  const html = await readFile(join(root, path, 'index.html'), 'utf8');
  assert.match(html, /<h1[\s>]/, `${path || '/'} must contain rendered content`);
  assert.match(html, /<link[^>]+rel="canonical"[^>]+href="https:\/\/cinetex.app/, 'Missing canonical URL');
  assert.match(html, /name="description" content="[^"]{40,}/, 'Missing useful description');
  assert.doesNotMatch(html, /name="robots" content="noindex/, 'Public page marked noindex');
  assert.match(html, /application\/ld\+json/, 'Missing structured data');
  const canonical = `${origin}/${path ? path + '/' : ''}`;
  assert.ok(html.includes(`href="${canonical}"`), `Incorrect canonical for ${path}`);
  entries.push(`  <url><loc>${canonical}</loc></url>`);
}
for (const path of ['auth', 'profile', 'lists', 'favorites', 'rated']) {
  assert.match(await readFile(join(root, path, 'index.html'), 'utf8'), /name="robots" content="noindex, follow"/, `${path} must not be indexed`);
}
await writeFile(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
await writeFile(join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
const shell = (await readFile(join(root, 'index.csr.html'), 'utf8'))
  .replace('</head>', '<meta name="robots" content="noindex, follow"></head>');
await writeFile(join(root, 'index.csr.html'), shell);
await writeFile(join(root, '404.html'), shell.replace(/<title>[^<]*<\/title>/, '<title>Page not found | Cinetex</title>'));
console.log('SEO checks passed: public HTML, metadata, private-page exclusions, sitemap, robots.txt and SPA 404 fallback.');
