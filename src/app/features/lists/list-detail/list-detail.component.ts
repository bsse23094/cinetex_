import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MovieList } from '../../../core/models/list.model';
import { Movie } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-list-detail',
  templateUrl: './list-detail.component.html',
  styleUrls: ['./list-detail.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ListDetailComponent implements OnInit {
  listId: string = '';
  list?: MovieList;
  movies: Movie[] = [];

  constructor(
    private storage: StorageService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get listId from route parameters
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.listId = id;
        this.refresh();
      }
    });
  }

  refresh() {
    console.log('Loading list with ID:', this.listId);
    this.list = this.storage.getListById(this.listId);
    console.log('Found list:', this.list);
    if (this.list) {
      this.movies = this.storage.getMoviesByIds(this.list.movies);
      console.log('Movies in list:', this.movies);
    } else {
      console.warn('List not found with ID:', this.listId);
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
