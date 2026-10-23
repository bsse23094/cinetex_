


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MovieList } from '../../../core/models/list.model';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-list-manager',
  templateUrl: './list-manager.component.html',
  styleUrls: ['./list-manager.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class ListManagerComponent implements OnInit {
  lists: MovieList[] = [];
  newListTitle = '';

  constructor(
    private storage: StorageService
  ) {}

  ngOnInit() {
    this.lists = this.storage.getLists();
  }

  addList() {
    if (!this.newListTitle.trim()) return;
    const newList: MovieList = {
      id: this.newListTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36),
      title: this.newListTitle.trim(),
      movies: [],
      created: new Date(),
      updated: new Date(),
      isPublic: false,
      userId: 'me'
    };
    this.storage.addList(newList);
    this.lists = this.storage.getLists();
    this.newListTitle = '';
  }

  getMoviePoster(movieId: number): string {
    const movie = this.storage.getMovies().find((m: any) => m.id === movieId);
    if (!movie || !movie.poster_path) return 'assets/no-poster.svg';
    if (movie.poster_path.startsWith('http')) return movie.poster_path;
    return 'https://image.tmdb.org/t/p/w500' + movie.poster_path;
  }

  deleteList(listId: string) {
    this.storage.deleteList(listId);
    this.lists = this.storage.getLists();
  }
}
