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

  // TV endpoints
  searchTv(query: string, page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/search/tv?api_key=${environment.tmdbApiKey}&query=${query}&page=${page}`
    );
  }

  getTvDetails(id: number) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/tv/${id}?api_key=${environment.tmdbApiKey}&append_to_response=credits,reviews,similar`
    );
  }
  
  getTvSeasonDetails(tvId: number, seasonNumber: number) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${environment.tmdbApiKey}`
    );
  }

  // Get popular movies
  getPopularMovies(page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/movie/popular?api_key=${environment.tmdbApiKey}&page=${page}`
    );
  }

  // Get popular TV shows
  getPopularTv(page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/tv/popular?api_key=${environment.tmdbApiKey}&page=${page}`
    );
  }

  // Get popular anime (TV shows with animation genre from Japan)
  getPopularAnime(page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/discover/tv?api_key=${environment.tmdbApiKey}&with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=${page}`
    );
  }
}