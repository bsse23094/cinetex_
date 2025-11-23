import { MoviePlayerComponent } from './features/movie/movie-player/movie-player.component';
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { MovieSearchComponent } from './features/movie/movie-search/movie-search.component';
import { MovieDetailComponent } from './features/movie/movie-detail/movie-detail.component';
import { ListManagerComponent } from './features/lists/list-manager/list-manager.component';
import { FavoritesComponent } from './features/user/favorites/favorites.component';
import { ListDetailComponent } from './features/lists/list-detail/list-detail.component';

import { RatedMoviesComponent } from './features/user/rated-movies/rated-movies.component';

export const routes: Routes = [
  { path: '', redirectTo: '/search', pathMatch: 'full' },
  { path: 'search', component: MovieSearchComponent },
  { path: 'shows', component: MovieSearchComponent },
  { path: 'movie/:id', component: MovieDetailComponent },
  { path: 'lists', component: ListManagerComponent },
  { path: 'favorites', component: FavoritesComponent },
  { path: 'list/:id', component: ListDetailComponent },
  { path: 'rated', component: RatedMoviesComponent },
  { path: 'watch/:id', component: MoviePlayerComponent },
  // optional Profile route
   //{ path: 'profile', component: ProfileComponent }
];
