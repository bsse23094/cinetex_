import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AnimeService {
  private jikanBaseUrl = 'https://api.jikan.moe/v4';
  
  constructor(private http: HttpClient) {}

  // Search anime
  searchAnime(query: string, page = 1): Observable<any> {
    return this.http.get(`${this.jikanBaseUrl}/anime?q=${query}&page=${page}&limit=20`).pipe(
      map((res: any) => ({
        results: res.data.map((anime: any) => ({
          id: anime.mal_id,
          title: anime.title,
          name: anime.title,
          poster_path: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          release_date: anime.aired?.from || '',
          first_air_date: anime.aired?.from || '',
          vote_average: anime.score || 0,
          overview: anime.synopsis || '',
          media_type: 'anime',
          episodes: anime.episodes,
          status: anime.status,
          year: anime.year
        }))
      })),
      catchError(err => {
        console.error('Anime search error:', err);
        return of({ results: [] });
      })
    );
  }

  // Get popular/top anime
  getTopAnime(page = 1): Observable<any> {
    return this.http.get(`${this.jikanBaseUrl}/top/anime?page=${page}&limit=20`).pipe(
      map((res: any) => ({
        results: res.data.map((anime: any) => ({
          id: anime.mal_id,
          title: anime.title,
          name: anime.title,
          poster_path: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          release_date: anime.aired?.from || '',
          first_air_date: anime.aired?.from || '',
          vote_average: anime.score || 0,
          overview: anime.synopsis || '',
          media_type: 'anime',
          episodes: anime.episodes,
          status: anime.status,
          year: anime.year
        }))
      })),
      catchError(err => {
        console.error('Top anime error:', err);
        return of({ results: [] });
      })
    );
  }

  // Get anime details
  getAnimeDetails(id: number): Observable<any> {
    return this.http.get(`${this.jikanBaseUrl}/anime/${id}/full`).pipe(
      map((res: any) => {
        const anime = res.data;
        return {
          id: anime.mal_id,
          title: anime.title,
          name: anime.title,
          poster_path: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          backdrop_path: anime.trailer?.images?.maximum_image_url || anime.images?.jpg?.large_image_url,
          release_date: anime.aired?.from || '',
          first_air_date: anime.aired?.from || '',
          vote_average: anime.score || 0,
          overview: anime.synopsis || '',
          media_type: 'anime',
          episodes: anime.episodes,
          status: anime.status,
          year: anime.year,
          genres: anime.genres?.map((g: any) => g.name) || [],
          studios: anime.studios?.map((s: any) => s.name) || [],
          rating: anime.rating,
          duration: anime.duration,
          trailer_url: anime.trailer?.youtube_id ? `https://www.youtube.com/embed/${anime.trailer.youtube_id}` : null
        };
      }),
      catchError(err => {
        console.error('Anime details error:', err);
        return of(null);
      })
    );
  }

  // Get anime streaming links (fallback to embed players)
  getAnimeEmbedUrl(title: string, episode: number = 1): string {
    // Using gogoanime embed as fallback
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://gogoplay1.com/embedplus?id=${sanitizedTitle}-episode-${episode}`;
  }
}
