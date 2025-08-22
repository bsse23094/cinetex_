import { Injectable } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { MovieList } from '../../core/models/list.model';
import { v4 as uuidv4 } from 'uuid';


@Injectable({
  providedIn: 'root'
})

export class ListsService {

  private readonly storageKey = 'movieLists';

  constructor( private storage : StorageService ) {}

  getLists(): MovieList[] {
    return this.storage.get<MovieList[]>(this.storageKey) || [];
  }

  createList(name: string, description?: string): MovieList {
  const newList: MovieList = {
    id: uuidv4(),
    title: name,  // ✅ use parameter instead of undefined variable
    description: description || '', // ✅ fallback if no description provided
    movies: [],
    created: new Date(),
    updated: new Date(),   // ✅ add required field
    isPublic: false,       // ✅ default value (you can change logic later)
    userId: 'guest',     // ✅ placeholder, replace with real user id if available
  };

  const lists = this.getLists();
  lists.push(newList);
  this.storage.set(this.storageKey, lists);

  return newList;
}

  addMovieToList(listId : string , movieId : number) {
    const lists = this.getLists();
    const list = lists.find(l=>l.id === listId);
    if (list) {
      if (!list.movies.includes(movieId)) {
        list.movies.push(movieId);
        list.updated = new Date();
        this.storage.set(this.storageKey, lists);
      }
    }
  }
}
