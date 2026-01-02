import { Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../movie.service';
import { Movie } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { PosterUrlPipe } from '../../../shared/pipes/poster-url.pipe';
import { BackdropUrlPipe } from '../../../shared/pipes/backdrop-url.pipe';

@Component({
  selector: 'app-movie-search',
  templateUrl: './movie-search.component.html',
  styleUrls: ['./movie-search.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, PosterUrlPipe, BackdropUrlPipe],
  providers: [DatePipe]
})
export class MovieSearchComponent implements OnDestroy {
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

  isShowsMode = false;
  featuredMovie: Movie | null = null;
  isFeaturedFavorite = false;

  // Recommended content for sliders
  recommendedMovies: Movie[] = [];
  recommendedShows: Movie[] = [];
  recommendedAnime: Movie[] = [];
  allContent: Movie[] = []; // Combined content for unified slider
  
  @ViewChild('unifiedCarousel') carouselRef!: ElementRef;
  
  constructor(private movieService: MovieService, private storage: StorageService, public router: Router, private route: ActivatedRoute) {
    this.loadRatings();
    
    // Subscribe to query params for search and type switching
    this.route.queryParams.subscribe(params => {
      if (params['query']) {
        this.query = params['query'];
        this.search();
      } else {
        this.query = '';
        this.results = [];
      }
      
      if (params['type']) {
        this.isShowsMode = params['type'] === 'tv';
        // If we are just switching modes without a query, we might want to reload recommendations or just stay on home
      }
    });

    // Load recommended content
    this.loadRecommendedContent();
  }

  ngOnDestroy() {
    // No intervals to clear anymore
  }

  loadRecommendedContent() {
    // Fetch popular movies
    this.movieService.getPopularMovies(1).subscribe((res: any) => {
      this.recommendedMovies = (res.results || []).slice(0, 20).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        name: r.name,
        poster_path: r.poster_path ?? null,
        backdrop_path: r.backdrop_path ?? null,
        release_date: r.release_date ?? r.first_air_date ?? '',
        first_air_date: r.first_air_date,
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
        media_type: 'movie'
      } as Movie));
      
      if (this.recommendedMovies.length > 0) {
        this.featuredMovie = this.recommendedMovies[0];
        this.checkFeaturedFavoriteStatus();
      }
    });

    // Fetch popular TV shows
    this.movieService.getPopularTv(1).subscribe((res: any) => {
      this.recommendedShows = (res.results || []).slice(0, 20).map((r: any) => ({
        id: r.id,
        title: r.name ?? r.title,
        name: r.name,
        poster_path: r.poster_path ?? null,
        backdrop_path: r.backdrop_path ?? null,
        release_date: r.first_air_date ?? r.release_date ?? '',
        first_air_date: r.first_air_date,
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
        media_type: 'tv'
      } as Movie));
    });

    // Fetch popular anime
    this.movieService.getPopularAnime(1).subscribe((res: any) => {
      this.recommendedAnime = (res.results || []).slice(0, 20).map((r: any) => ({
        id: r.id,
        title: r.name ?? r.title,
        name: r.name,
        poster_path: r.poster_path ?? null,
        backdrop_path: r.backdrop_path ?? null,
        release_date: r.first_air_date ?? r.release_date ?? '',
        first_air_date: r.first_air_date,
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
        media_type: 'tv' as any
      } as Movie));
      
      // Combine all content for unified slider
      this.allContent = [
        ...this.recommendedMovies.slice(0, 10),
        ...this.recommendedShows.slice(0, 8),
        ...this.recommendedAnime.slice(0, 7)
      ];
    });
  }

  // Removed slider interval methods as we use CSS scrolling now

  playMovie(movie: Movie) {
    this.router.navigate(['/watch', movie.id]);
  }

  playShow(show: Movie) {
    this.router.navigate(['/watch', show.id], { queryParams: { type: 'tv', season: 1, episode: 1 } });
  }

  playAnime(anime: Movie) {
    this.router.navigate(['/watch', anime.id], { queryParams: { type: 'tv', season: 1, episode: 1 } });
  }

  setMediaType(type: 'movie' | 'tv') {
    this.isShowsMode = (type === 'tv');
    // Clear results when switching
    this.results = [];
    this.query = '';
  }

  loadRatings() {
    this.ratings = this.storage.get<{ [key: number]: number }>('ratings') || {};
  }

  search() {
    if (!this.query.trim()) return;
    this.loading = true;
    
    console.log('Starting search for:', this.query);
    
    // Use multi-search to find movies, TV shows, and people
    this.movieService.multiSearch(this.query).subscribe({
      next: (res: any) => {
        console.log('Multi-search raw results:', res);
        console.log('Multi-search results count:', res?.results?.length || 0);
        
        // Filter to only movies and TV shows (exclude people)
        this.results = (res?.results || [])
          .filter((r: any) => {
            const isValidMedia = r.media_type === 'movie' || r.media_type === 'tv';
            console.log('Item:', r.title || r.name, 'Type:', r.media_type, 'Valid:', isValidMedia);
            return isValidMedia;
          })
          .map((r: any) => ({
            id: r.id,
            title: r.title ?? r.name,
            name: r.name,
            poster_path: r.poster_path ?? null,
            backdrop_path: r.backdrop_path ?? null,
            release_date: r.release_date ?? r.first_air_date ?? '',
            first_air_date: r.first_air_date,
            vote_average: r.vote_average ?? 0,
            overview: r.overview ?? '',
            media_type: r.media_type
          }));
        
        console.log('Filtered search results:', this.results.length, 'items');
        console.log('Results:', this.results.map(r => ({ title: r.title, type: r.media_type })));
        this.loading = false;
        this.loadRatings();
      },
      error: (error) => {
        console.error('Search error:', error);
        this.loading = false;
      }
    });
  }

  rateMovie(movie: Movie) {
    this.ratingMovieId = movie.id;
  }

  watchMedia(movie: Movie) {
    // Check the actual media_type of the item
    const mediaType = this.getMediaType(movie);
    
    if (mediaType === 'tv') {
      this.router.navigate(['/watch', movie.id], { queryParams: { type: 'tv', season: 1, episode: 1 } });
    } else {
      this.router.navigate(['/watch', movie.id]);
    }
  }
  
  scrollSlider(direction: 'left' | 'right') {
    if (this.carouselRef) {
      const scrollAmount = 400;
      const element = this.carouselRef.nativeElement;
      if (direction === 'left') {
        element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }
  
  pauseScroll(event: Event) {
    const target = event.target as HTMLElement;
    const track = target.closest('.slider-track') as HTMLElement;
    if (track) {
      track.classList.add('paused');
    }
  }
  
  resumeScroll(event: Event) {
    const target = event.target as HTMLElement;
    const track = target.closest('.slider-track') as HTMLElement;
    if (track) {
      track.classList.remove('paused');
    }
  }
  
  scrollSliderLeft(event: Event) {
    const button = event.target as HTMLElement;
    const sliderRow = button.closest('.slider-row') as HTMLElement;
    const container = sliderRow?.querySelector('.slider-container') as HTMLElement;
    if (container) {
      container.scrollBy({ left: -600, behavior: 'smooth' });
    }
  }
  
  scrollSliderRight(event: Event) {
    const button = event.target as HTMLElement;
    const sliderRow = button.closest('.slider-row') as HTMLElement;
    const container = sliderRow?.querySelector('.slider-container') as HTMLElement;
    if (container) {
      container.scrollBy({ left: 600, behavior: 'smooth' });
    }
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
    this.checkFeaturedFavoriteStatus();
  }

  checkFeaturedFavoriteStatus() {
    if (!this.featuredMovie) {
      this.isFeaturedFavorite = false;
      return;
    }
    const currentUser = this.storage.getCurrentUser();
    if (currentUser && Array.isArray(currentUser.favoriteMovieIds)) {
      this.isFeaturedFavorite = currentUser.favoriteMovieIds.includes(this.featuredMovie.id);
    } else {
      this.isFeaturedFavorite = false;
    }
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
  
  // Helper methods for template to access extended properties
  getMediaType(movie: Movie): 'movie' | 'tv' {
    return (movie as any).media_type || 'movie';
  }
  
  getTitle(movie: Movie): string {
    return movie.title || (movie as any).name || '';
  }
  
  getReleaseDate(movie: Movie): string {
    return movie.release_date || (movie as any).first_air_date || '';
  }
}
