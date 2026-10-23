import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/search', pathMatch: 'full' },
  { path: 'search', loadComponent: () => import('./features/movie/movie-search/movie-search.component').then(m => m.MovieSearchComponent) },
  { path: 'shows', loadComponent: () => import('./features/movie/movie-search/movie-search.component').then(m => m.MovieSearchComponent) },
  { path: 'movie/:id', loadComponent: () => import('./features/movie/movie-detail/movie-detail.component').then(m => m.MovieDetailComponent) },
  { path: 'lists', loadComponent: () => import('./features/lists/list-manager/list-manager.component').then(m => m.ListManagerComponent) },
  { path: 'favorites', loadComponent: () => import('./features/user/favorites/favorites.component').then(m => m.FavoritesComponent) },
  { path: 'list/:id', loadComponent: () => import('./features/lists/list-detail/list-detail.component').then(m => m.ListDetailComponent) },
  { path: 'rated', loadComponent: () => import('./features/user/rated-movies/rated-movies.component').then(m => m.RatedMoviesComponent) },
  { path: 'watch/:id', loadComponent: () => import('./features/movie/movie-player/movie-player.component').then(m => m.MoviePlayerComponent) },
  { path: 'about', loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent) },
  { path: 'privacy', loadComponent: () => import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent) },
  { path: 'terms', loadComponent: () => import('./pages/terms/terms.component').then(m => m.TermsComponent) },
  { path: 'auth', loadComponent: () => import('./pages/auth/auth.component').then(m => m.AuthComponent) },
  { path: 'profile', loadComponent: () => import('./features/user/profile/profile.component').then(m => m.ProfileComponent) },
  { path: '**', redirectTo: '/search' }
];
