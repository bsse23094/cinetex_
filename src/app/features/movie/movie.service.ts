


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

  getMovieDetails(id: number): Observable<any> {
    return this.tmdb.getMovieDetails(id);
  }
}
