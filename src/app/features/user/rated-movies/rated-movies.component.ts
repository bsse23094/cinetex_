import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PosterUrlPipe } from '../../../shared/pipes/poster-url.pipe';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { StorageService } from '../../../core/services/storage.service';
import { Movie } from '../../../core/models/movie.model';

@Component({
  selector: 'app-rated-movies',
  standalone: true,
  imports: [CommonModule, PosterUrlPipe],
  templateUrl: './rated-movies.component.html',
  styleUrls: ['./rated-movies.component.css']
})
export class RatedMoviesComponent implements OnInit {
  ratedMovies: { movie: Movie, rating: number }[] = [];

  constructor(private storage: StorageService) {}

  ngOnInit() {
    const ratings = this.storage.get<{ [key: number]: number }>('ratings') || {};
    const ratedIds = Object.keys(ratings).map(id => +id).filter(id => ratings[id] > 0);
  const movies: Movie[] = this.storage.getMoviesByIds(ratedIds);
  this.ratedMovies = movies.map((movie: Movie) => ({ movie, rating: ratings[movie.id] }));
  }
}
