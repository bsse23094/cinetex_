


import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
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
  newListId = '';
  newListTitle = '';

  constructor(
    private storage: StorageService,
    private renderer: Renderer2,
    private el: ElementRef
  ) {}

  ngOnInit() {
    this.lists = this.storage.getLists();
    this.setBackdropImage();
  }

  setBackdropImage() {
    const allMovies = this.storage.getMovies();
    if (allMovies && allMovies.length > 0) {
      const randomMovie = allMovies[Math.floor(Math.random() * allMovies.length)];
      if (randomMovie.backdrop_path) {
        const backdropUrl = randomMovie.backdrop_path.startsWith('http')
          ? randomMovie.backdrop_path
          : `https://image.tmdb.org/t/p/original${randomMovie.backdrop_path}`;
        this.renderer.setStyle(
          this.el.nativeElement,
          '--library-backdrop-image',
          `url(${backdropUrl})`
        );
      }
    }
  }

  addList() {
    if (!this.newListId.trim() || !this.newListTitle.trim()) return;
    const newList: MovieList = {
      id: this.newListId,
      title: this.newListTitle,
      movies: [],
      created: new Date(),
      updated: new Date(),
      isPublic: false,
      userId: 'me'
    };
    this.storage.addList(newList);
    this.lists = this.storage.getLists();
    this.newListId = '';
    this.newListTitle = '';
  }

  getMoviePoster(movieId: number): string {
    const movie = this.storage.getMovies().find((m: any) => m.id === movieId);
    if (!movie || !movie.poster_path) return 'https://via.placeholder.com/60x90';
    if (movie.poster_path.startsWith('http')) return movie.poster_path;
    return 'https://image.tmdb.org/t/p/w500' + movie.poster_path;
  }

  deleteList(listId: string) {
    this.storage.deleteList(listId);
    this.lists = this.storage.getLists();
  }
}
