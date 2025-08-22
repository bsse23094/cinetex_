// core/services/tmdb.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TMDBService {
  constructor(private http: HttpClient) {}

  searchMovies(query: string, page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/search/movie?api_key=${environment.tmdbApiKey}&query=${query}&page=${page}`
    );
  }

  getMovieDetails(id: number) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/movie/${id}?api_key=${environment.tmdbApiKey}&append_to_response=credits,reviews,similar`
    );
  }
}