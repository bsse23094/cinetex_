


import { Injectable } from '@angular/core';
import { TMDBService } from '../../core/services/tmdb.service';
import { Observable } from 'rxjs';
import { Movie, MovieDetails } from '../../core/models/movie.model';

@Injectable({ providedIn: 'root' })
export class MovieService {
  constructor(private tmdb: TMDBService) {}

  searchMovies(query: string, page = 1): Observable<any> {
    return this.tmdb.searchMovies(query, page);
  }
  
  multiSearch(query: string, page = 1): Observable<any> {
    return this.tmdb.multiSearch(query, page);
  }

  getMovieDetails(id: number): Observable<any> {
    return this.tmdb.getMovieDetails(id);
  }

  // TV helpers
  searchTv(query: string, page = 1): Observable<any> {
    return this.tmdb.searchTv(query, page);
  }

  getTvDetails(id: number): Observable<any> {
    return this.tmdb.getTvDetails(id);
  }
  
  getTvSeasonDetails(tvId: number, seasonNumber: number): Observable<any> {
    return this.tmdb.getTvSeasonDetails(tvId, seasonNumber);
  }

  // Get popular/recommended content
  getPopularMovies(page = 1): Observable<any> {
    return this.tmdb.getPopularMovies(page);
  }

  getPopularTv(page = 1): Observable<any> {
    return this.tmdb.getPopularTv(page);
  }

  getPopularAnime(page = 1): Observable<any> {
    return this.tmdb.getPopularAnime(page);
  }
}
