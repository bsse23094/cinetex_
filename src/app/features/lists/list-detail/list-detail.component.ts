import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MovieList } from '../../../core/models/list.model';
import { Movie } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-list-detail',
  templateUrl: './list-detail.component.html',
  styleUrls: ['./list-detail.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink]
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
    this.list = this.storage.getListById(this.listId);
    if (this.list) {
      this.movies = this.storage.getMoviesByIds(this.list.movies);
      } else {
      console.warn('List not found with ID:', this.listId);
    }
  }


  getPosterUrl(posterPath: string | null): string {
    if (!posterPath) return 'assets/no-poster.svg';
    if (posterPath.startsWith('http')) return posterPath;
    return 'https://image.tmdb.org/t/p/w500' + posterPath;
  }

  removeFromList(movieId: number) {
    if (this.list) {
      this.storage.removeMovieFromList(this.list.id, movieId);
      this.refresh();
    }
  }
}
