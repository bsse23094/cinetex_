import { RenderMode, ServerRoute } from '@angular/ssr';

// Configure SSR/prerender behavior per route.
// - Static routes: prerender
// - Dynamic (with params): render on server at request time
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'search', renderMode: RenderMode.Prerender },
  { path: 'shows', renderMode: RenderMode.Prerender },
  { path: 'lists', renderMode: RenderMode.Prerender },
  { path: 'favorites', renderMode: RenderMode.Prerender },
  { path: 'rated', renderMode: RenderMode.Prerender },

  // Dynamic parameterized routes: use Server (not Prerender)
  { path: 'movie/:id', renderMode: RenderMode.Server },
  { path: 'list/:id', renderMode: RenderMode.Server },
  { path: 'watch/:id', renderMode: RenderMode.Server },

  // Fallback: serve dynamically to avoid prerender param issues
  { path: '**', renderMode: RenderMode.Server },
];
