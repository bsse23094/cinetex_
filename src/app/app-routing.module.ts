// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovieSearchComponent } from './features/movie/movie-search/movie-search.component';
import { MovieDetailComponent } from './features/movie/movie-detail/movie-detail.component';
import { ListManagerComponent } from './features/lists/list-manager/list-manager.component';
import { FavoritesComponent } from './features/user/favorites/favorites.component';
import { ListDetailComponent } from './features/lists/list-detail/list-detail.component';

const routes: Routes = [
  { path: '', redirectTo: '/search', pathMatch: 'full' },
  { path: 'search', component: MovieSearchComponent },
  { path: 'movie/:id', component: MovieDetailComponent },
  { path: 'lists', component: ListManagerComponent },
  { path: 'favorites', component: FavoritesComponent },
  { path: 'list/:id', component: ListDetailComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }