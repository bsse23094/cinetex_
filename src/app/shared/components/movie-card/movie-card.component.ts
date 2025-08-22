import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PosterUrlPipe } from '../../pipes/poster-url.pipe';
import { Movie, MovieDetails } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule, PosterUrlPipe],
  templateUrl: './movie-card.component.html',
  styleUrls: ['./movie-card.component.css']
})
export class MovieCardComponent {
  @Input() movie!: Movie | MovieDetails;
  constructor(private router: Router, private storage: StorageService) {}

  isMovieDetails(m: Movie | MovieDetails): m is MovieDetails {
    return (m as MovieDetails).runtime !== undefined;
  }

  truncate(text?: string, limit = 100) {
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit).trim() + '…' : text;
  }

  addToWatchlist() {
    if (!this.movie) return;
    // create or add to a watchlist
    this.storage.addMovieToList('watchlist', this.movie);
    // simple UI feedback
    try { alert('Added to Watchlist'); } catch {}
  }

  viewDetails() {
    if (!this.movie) return;
    this.router.navigate(['/movie', this.movie.id]);
  }
}
