// core/services/tmdb.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TMDBService {
  constructor(private http: HttpClient) { }

  searchMovies(query: string, page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/search/movie?api_key=${environment.tmdbApiKey}&query=${query}&page=${page}`
    );
  }

  // Multi-search: searches across movies, TV shows, and people
  multiSearch(query: string, page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/search/multi?api_key=${environment.tmdbApiKey}&query=${query}&page=${page}`
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

  // Get top rated movies
  getTopRatedMovies(page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/movie/top_rated?api_key=${environment.tmdbApiKey}&page=${page}`
    );
  }

  // Discover movies by genre (28=Action, 35=Comedy, 27=Horror, 53=Thriller, 878=Sci-Fi, 10749=Romance)
  discoverMoviesByGenre(genreId: number, page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/discover/movie?api_key=${environment.tmdbApiKey}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
    );
  }

  // Get now playing movies
  getNowPlayingMovies(page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/movie/now_playing?api_key=${environment.tmdbApiKey}&page=${page}`
    );
  }

  // Get upcoming movies
  getUpcomingMovies(page = 1) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/movie/upcoming?api_key=${environment.tmdbApiKey}&page=${page}`
    );
  }

  // Get person (actor/crew) combined credits
  getPersonCredits(personId: number) {
    return this.http.get(
      `${environment.tmdbBaseUrl}/person/${personId}/combined_credits?api_key=${environment.tmdbApiKey}`
    );
  }
}