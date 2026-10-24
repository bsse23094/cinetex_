# Search publishing

Run `npm run deploy:pages` to build, validate SEO output, and publish to GitHub Pages.
The build requires TMDB connectivity because public discovery and film pages contain real catalog content.
If required pages cannot render or metadata is missing, validation stops deployment.

`npm run build:production` generates the same output without publishing. It includes:

- Static HTML for public sections, with titles, descriptions, canonical URLs, Open Graph/Twitter cards and WebSite/WebPage structured data.
- Persistent film pages listed in `src/app/indexed-film-ids.ts`. Add more TMDB movie IDs there when expanding coverage. Retain existing IDs to preserve published URLs.
- `sitemap.xml` containing only canonical, indexable pages and `robots.txt` pointing to that sitemap.
- `noindex, follow` on account and personal-library pages. Query-based search results receive noindex when rendered.
- A separate noindex `404.html` client shell for dynamic playback and ungenerated routes. Deploy with `--no-notfound` so angular-cli-ghpages does not overwrite it with the homepage.

The film sitemap is generated from the actual rendered files. No fabricated modification dates, ratings, reviews or ranking promises are added. Movie descriptions are supplied by TMDB; unique editorial content and useful features remain necessary to compete for broad movie searches.

## Google Search Console

The site owner should verify `cinetex.app` in Google Search Console, then submit `https://cinetex.app/sitemap.xml`.
Inspect the homepage, `/shows/`, `/about/` and a rendered film URL after publication. Check indexing, crawl errors and Core Web Vitals over time.
No Search Console credentials or verification token were available during implementation; verification/submission is not claimed as complete.

GitHub Pages cannot dynamically serve HTTP 200 for every possible movie/player URL. Film IDs outside the committed render list and playback URLs continue to use the 404 client fallback. Expand the render list or move to server-capable hosting for full-catalog indexing.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
