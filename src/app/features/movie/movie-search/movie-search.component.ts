import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../movie.service';
import { Movie } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { PosterUrlPipe } from '../../../shared/pipes/poster-url.pipe';

@Component({
  selector: 'app-movie-search',
  templateUrl: './movie-search.component.html',
  styleUrls: ['./movie-search.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RatingStarsComponent, PosterUrlPipe],
  providers: [DatePipe]
})
export class MovieSearchComponent {
  query = '';
  results: Movie[] = [];
  loading = false;
  showListPrompt = false;
  selectedMovieId: number | null = null;
  selectedMovieObj: Movie | null = null;
  selectedListIds: string[] = [];
  userLists: any[] = [];
  newListTitle: string = '';

  ratings: { [key: number]: number } = {};
  ratingMovieId: number | null = null;

  constructor(private movieService: MovieService, private storage: StorageService, public router: Router) {
    this.loadRatings();
  }

  loadRatings() {
    this.ratings = this.storage.get<{ [key: number]: number }>('ratings') || {};
  }

  search() {
    if (!this.query.trim()) return;
    this.loading = true;
    this.movieService.searchMovies(this.query).subscribe((res: any) => {
  this.results = res.results;
  // debug: log poster paths to help diagnose missing posters in search
  console.log('Search results poster_path samples:', this.results.slice(0, 5).map(r => ({ id: r.id, poster_path: r.poster_path })));
      this.loading = false;
      this.loadRatings();
    });
  }

  rateMovie(movie: Movie) {
    this.ratingMovieId = movie.id;
  }

  onChangeRating(movieId: number, rating: number) {
    this.ratings[movieId] = rating;
    this.storage.set('ratings', this.ratings);
    this.ratingMovieId = null;
    // Ensure the movie is saved in movies array for watched/rated list
    const movies = this.storage.getMovies();
    let movieObj = this.results.find(m => m.id === movieId);
    if (!movieObj) {
      // fallback: try to get from storage
      movieObj = movies.find(m => m.id === movieId);
    }
    if (movieObj && !movies.some((m: any) => m.id === movieId)) {
      movies.push(movieObj);
      this.storage.set('movies', movies);
    }
    // Add to watched list
    if (movieObj) {
      this.storage.ensureWatchedList();
      this.storage.addMovieToList('watched-movies', movieObj);
    }
  }

  addToFavorites(movie: Movie) {
    this.storage.addMovieToFavorites(movie);
    alert('Added to favorites!');
    // Optionally reload favorites in UI if needed
  }

  addToListPrompt(movie: Movie) {
    this.userLists = this.storage.getLists();
    this.selectedMovieId = movie.id;
    this.selectedMovieObj = movie;
    this.selectedListIds = [];
    this.newListTitle = '';
    this.showListPrompt = true;
  }

  confirmAddToList() {
    if (this.selectedMovieId && this.selectedMovieObj) {
      for (const listId of this.selectedListIds) {
        this.storage.addMovieToList(listId, this.selectedMovieObj);
      }
      if (this.selectedListIds.length) {
        alert('Movie added to selected lists!');
      }
    }
    this.showListPrompt = false;
    this.selectedMovieId = null;
    this.selectedMovieObj = null;
    this.selectedListIds = [];
    this.newListTitle = '';
  }

  addNewListInline() {
    if (!this.newListTitle.trim() || !this.selectedMovieObj) return;
    const newList = {
      id: this.newListTitle.trim().toLowerCase().replace(/\s+/g, '-'),
      title: this.newListTitle.trim(),
      movies: this.selectedMovieId ? [this.selectedMovieId] : [],
      created: new Date(),
      updated: new Date(),
      isPublic: false,
      userId: 'me'
    };
    this.storage.addList(newList);
    this.storage.addMovieToList(newList.id, this.selectedMovieObj);
    this.userLists = this.storage.getLists();
    this.selectedListIds.push(newList.id);
    this.newListTitle = '';
    alert('New list created and movie added!');
  }

  cancelAddToList() {
    this.showListPrompt = false;
    this.selectedMovieId = null;
    this.selectedListIds = [];
    this.newListTitle = '';
  }
}
