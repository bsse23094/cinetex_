import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AniwatchService {
  private apiUrl = 'http://localhost:4000';

  constructor(private http: HttpClient) {}

  // Example: Get streaming links for an anime episode
  getEpisodeStream(animeId: string, episodeNumber: number): Observable<any> {
    // Adjust endpoint as per Aniwatch API docs
    return this.http.get(`${this.apiUrl}/anime/${animeId}/episodes/${episodeNumber}/stream`);
  }
}
