import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { indexedFilmIds } from './indexed-film-ids';

// GitHub Pages serves files, not a Node server. Entry points need real HTML.
export const serverRoutes: ServerRoute[] = [
  ...['', 'search', 'shows', 'about', 'privacy', 'terms', 'auth', 'lists', 'favorites', 'rated', 'profile']
    .map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  {
    path: 'movie/:id', renderMode: RenderMode.Prerender, fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      return indexedFilmIds.map(id => ({ id: String(id) }));
    }
  },
  { path: '**', renderMode: RenderMode.Client }
];
