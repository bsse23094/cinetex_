


import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { User } from '../../../core/models/user.model';
import { Movie } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { PosterUrlPipe } from '../../../shared/pipes/poster-url.pipe';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css'],
  standalone: true,
  imports: [CommonModule, RatingStarsComponent, PosterUrlPipe],
  providers: [DatePipe]
})
export class FavoritesComponent implements OnInit {
  user?: User;
  favoriteMovies: Movie[] = [];
  ratingMovieId: number | null = null;
  ratings: { [key: number]: number } = {};

  constructor(private storage: StorageService) {}

  ngOnInit() {
    this.reloadFavorites();
    this.ratings = this.storage.get<{ [key: number]: number }>('ratings') || {};
  }

  reloadFavorites() {
    this.user = this.storage.getCurrentUser();
    if (this.user) {
      this.favoriteMovies = this.storage.getMoviesByIds(this.user.favoriteMovieIds);
    } else {
      this.favoriteMovies = [];
    }
  }

  rateMovie(movie: Movie) {
    this.ratingMovieId = movie.id;
  }

  getMovieRating(movieId: number): number {
    return this.ratings[movieId] || 0;
  }

  onChangeRating(movieId: number, rating: number) {
    this.ratings[movieId] = rating;
    this.storage.set('ratings', this.ratings);
    this.ratingMovieId = null;
  }
}
