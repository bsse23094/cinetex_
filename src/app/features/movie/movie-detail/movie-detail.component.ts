import { Component, OnInit, Optional } from '@angular/core';
import { SeoService } from '../../../core/services/seo.service';
import { timeout } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TMDBService } from '../../../core/services/tmdb.service';
import { StorageService } from '../../../core/services/storage.service';
import { MovieDetails } from '../../../core/models/movie.model';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { BackdropUrlPipe } from '../../../shared/pipes/backdrop-url.pipe';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, RatingStarsComponent, BackdropUrlPipe, DatePipe, DecimalPipe],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.css',
  providers: [DatePipe]
})
export class MovieDetailComponent implements OnInit {
  movie! : MovieDetails;
  loading = true;
  loadError = false;
  userRating: number = 0;
  isFavorite: boolean = false;

  constructor (
    private route : ActivatedRoute,
    private router: Router,
    private tmdb : TMDBService,
    private storage : StorageService,
    @Optional() private seo: SeoService | null = null,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMovie(+id);
      this.loadUserData(+id);
    }
  }

  private loadMovie(id: number) {
    this.loading = true;
    this.loadError = false;
    this.tmdb.getMovieDetails(id).pipe(timeout(15000)).subscribe({
      next: (data: any) => {
        this.movie = data; this.loading = false;
        this.seo?.setMetadata(`${data.title}${data.release_date ? ' (' + data.release_date.slice(0, 4) + ')' : ''} | Cinetex`, (data.overview || `Explore ${data.title} on Cinetex. Browse movie details, discover its genres and save it to your collection.`).slice(0, 160), `/movie/${id}`, false,
          data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : undefined);
      },
      error: () => { this.loading = false; this.loadError = true; }
    });
  }

  retry(): void { this.ngOnInit(); }

  playMovie() {
    if (this.movie) {
      this.router.navigate(['/watch', this.movie.id]);
    }
  }

  private loadUserData(movieId : number) {
    const ratings = this.storage.get<{[key: number] : number }>('ratings') || {};
    this.userRating = ratings[movieId] || 0;

    this.isFavorite = !!this.storage.getCurrentUser()?.favoriteMovieIds?.includes(movieId);
  }

  onChangeRating(rating:number){
    const ratings = this.storage.get<{[key : number] : number}>('ratings') || {};
    ratings[this.movie.id] = rating;
    this.storage.set('ratings', ratings);
    this.userRating = rating;
    const movies = this.storage.getMovies();
    if (!movies.some(movie => movie.id === this.movie.id)) this.storage.set('movies', [...movies, this.movie]);
  }

  toggleFavourite() {
    if (this.isFavorite) this.storage.removeMovieFromFavorites(this.movie.id);
    else this.storage.addMovieToFavorites(this.movie);
    this.isFavorite = !this.isFavorite;
  }
}
