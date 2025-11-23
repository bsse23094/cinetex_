import { Component , OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TMDBService } from '../../../core/services/tmdb.service';
import { StorageService } from '../../../core/services/storage.service';
import { MovieDetails } from '../../../core/models/movie.model';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { PosterUrlPipe } from '../../../shared/pipes/poster-url.pipe';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, RatingStarsComponent, PosterUrlPipe, DatePipe, DecimalPipe],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.css',
  providers: [DatePipe]
})
export class MovieDetailComponent implements OnInit {
  movie! : MovieDetails;
  userRating: number = 0;
  isFavorite: boolean = false;

  constructor (
    private route : ActivatedRoute,
    private router: Router,
    private tmdb : TMDBService,
    private storage : StorageService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMovie(+id);
      this.loadUserData(+id);
    }
  }

  private loadMovie(id: number) {
    this.tmdb.getMovieDetails(id).subscribe((data: any) => {
      this.movie = data;
    });
  }

  playMovie() {
    if (this.movie) {
      this.router.navigate(['/watch', this.movie.id]);
    }
  }

  private loadUserData(movieId : number) {
    const ratings = this.storage.get<{[key: number] : number }>('ratings') || {};
    this.userRating = ratings[movieId] || 0;

    const favorites = this.storage.get<any[]>('favorites') || [];
    this.isFavorite = favorites.some(f => f.id === movieId);
  }

  onChangeRating(rating:number){
    const ratings = this.storage.get<{[key : number] : number}>('ratings') || {};
    ratings[this.movie.id] = rating;
    this.storage.set('ratings', ratings);
    this.userRating = rating;
  }

  toggleFavourite() {
    // Use storage service method if available, or implement here
    // The storage service seems to expect a Movie object, not just ID
    this.storage.addMovieToFavorites(this.movie);
    this.isFavorite = !this.isFavorite; // Optimistic update
  }
}
