import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MovieList } from '../../../core/models/list.model';
import { Movie } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';
@Component({
  selector: 'app-list-detail',
  templateUrl: './list-detail.component.html',
  styleUrls: ['./list-detail.component.css'],
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe]
})
export class ListDetailComponent implements OnInit {
  @Input() listId!: string;
  list?: MovieList;
  movies: Movie[] = [];

  constructor(private storage: StorageService) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.list = this.storage.getListById(this.listId);
    if (this.list) {
      this.movies = this.storage.getMoviesByIds(this.list.movies);
    }
  }


  getPosterUrl(posterPath: string | null): string {
    if (!posterPath) return 'https://via.placeholder.com/100x150';
    if (posterPath.startsWith('http')) return posterPath;
    return 'https://image.tmdb.org/t/p/w500' + posterPath;
  }

  addToFavorites(movieId: number) {
    this.storage.addMovieToFavorites(movieId);
    alert('Added to favorites!');
  }

  removeFromList(movieId: number) {
    if (this.list) {
      this.storage.removeMovieFromList(this.list.id, movieId);
      this.refresh();
    }
  }
}
