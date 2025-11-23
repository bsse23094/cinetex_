import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  get<T>(key: string): T | null {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  set(key: string, value: any): void {
    if (!this.isBrowser) return;
    if (value == null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  remove(key: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(key);
  }

  // --- List Management ---
  getLists(): any[] {
    return this.get<any[]>('lists') || [];
  }

  addList(list: any): void {
    const lists = this.getLists();
    lists.push(list);
    this.set('lists', lists);
  }

  deleteList(listId: string): void {
    let lists = this.getLists();
    lists = lists.filter(l => l.id !== listId);
    this.set('lists', lists);
  }

  getListById(listId: string): any | undefined {
    return this.getLists().find(l => l.id === listId);
  }

  // --- Movie Management ---
  getMovies(): any[] {
    return this.get<any[]>('movies') || [];
  }

  getMoviesByIds(ids: number[]): any[] {
    const movies = this.getMovies();
    return movies.filter(m => ids.includes(m.id));
  }

  // --- User Management ---
  getCurrentUser(): any {
    let user = this.get<any>('currentUser');
    if (!user) {
      user = {
        id: 'me',
        name: 'User',
        email: '',
        favoriteMovieIds: [],
        lists: [],
        joined: new Date()
      };
      this.set('currentUser', user);
    }
    if (!user.favoriteMovieIds) {
      user.favoriteMovieIds = [];
      this.set('currentUser', user);
    }
    return user;
  }

  addMovieToFavorites(movie: any): void {
    const user = this.getCurrentUser();
    if (!user) return;
    if (!user.favoriteMovieIds.includes(movie.id)) {
      user.favoriteMovieIds.push(movie.id);
      this.set('currentUser', user);
    }
    // Ensure the movie is saved in movies array
    const movies = this.getMovies();
    if (!movies.some((m: any) => m.id === movie.id)) {
      movies.push(movie);
      this.set('movies', movies);
    }
  }

  removeMovieFromFavorites(movieId: number): void {
    const user = this.getCurrentUser();
    if (!user) return;
    user.favoriteMovieIds = user.favoriteMovieIds.filter((id: number) => id !== movieId);
    this.set('currentUser', user);
  }

  addMovieToList(listId: string, movie: any): void {
    const lists = this.getLists();
    let list = lists.find(l => l.id === listId);
    if (!list) {
      // Optionally create the list if it doesn't exist
      list = {
        id: listId,
        title: listId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        movies: [],
        created: new Date(),
        updated: new Date(),
        isPublic: false,
        userId: 'me'
      };
      lists.push(list);
    }
    if (!list.movies.includes(movie.id)) {
      list.movies.push(movie.id);
      this.set('lists', lists);
    }
    // Ensure the movie is saved in movies array
    const movies = this.getMovies();
    if (!movies.some((m: any) => m.id === movie.id)) {
      movies.push(movie);
      this.set('movies', movies);
    }
  }

  ensureWatchedList(): any {
    let lists = this.getLists();
    let watched = lists.find(l => l.id === 'watched-movies');
    if (!watched) {
      watched = {
        id: 'watched-movies',
        title: 'Watched Movies',
        movies: [],
        created: new Date(),
        updated: new Date(),
        isPublic: false,
        userId: 'me'
      };
      lists.push(watched);
      this.set('lists', lists);
    }
    return watched;
  }

  removeMovieFromList(listId: string, movieId: number): void {
    const lists = this.getLists();
    const list = lists.find(l => l.id === listId);
    if (list) {
      list.movies = list.movies.filter((id: number) => id !== movieId);
      this.set('lists', lists);
    }
  }

}
