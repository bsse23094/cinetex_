// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovieSearchComponent } from './features/movie/movie-search/movie-search.component';
import { MovieDetailComponent } from './features/movie/movie-detail/movie-detail.component';
import { ListManagerComponent } from './features/lists/list-manager/list-manager.component';
import { FavoritesComponent } from './features/user/favorites/favorites.component';
import { ListDetailComponent } from './features/lists/list-detail/list-detail.component';
import { AboutComponent } from './pages/about/about.component';
import { PrivacyComponent } from './pages/privacy/privacy.component';
import { TermsComponent } from './pages/terms/terms.component';

const routes: Routes = [
  { path: '', redirectTo: '/search', pathMatch: 'full' },
  { path: 'search', component: MovieSearchComponent },
  { path: 'movie/:id', component: MovieDetailComponent },
  { path: 'lists', component: ListManagerComponent },
  { path: 'favorites', component: FavoritesComponent },
  { path: 'list/:id', component: ListDetailComponent }
  ,{ path: 'about', component: AboutComponent }
  ,{ path: 'privacy', component: PrivacyComponent }
  ,{ path: 'terms', component: TermsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }