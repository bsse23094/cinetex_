import { Component , OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TMDBService } from '../../../core/services/tmdb.service';
import { StorageService } from '../../../core/services/storage.service';
import { MovieDetails } from '../../../core/models/movie.model';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';

import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [RatingStarsComponent, DatePipe],
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


  private loadUserData(movieId : number) {
    const ratings = this.storage.get<{[key: number] : number }>('ratings') || {};
    this.userRating = ratings[movieId] || 0;

    const favorites = this.storage.get<number[]>('favorites') || [];
    this.isFavorite = favorites.includes(movieId);
  }

  onChangeRating(rating:number){
    const ratings = this.storage.get<{[key : number] : number}>('ratings') || {};
    ratings[this.movie.id] = rating;
    this.storage.set('ratings', ratings);
    this.userRating = rating;
  }

  toggleFavourite() {
    const favorites = this.storage.get<number[]>('favourites') || [];
    if (this.isFavorite) {
      this.isFavorite = false;
      this.storage.set('favourites' , favorites.filter(id => id !== this.movie.id));
    }
    else {
      this.isFavorite = true;
      favorites.push(this.movie.id);
      this.storage.set('favorites' , favorites);
    }
  }
}
