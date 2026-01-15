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

import { MovieHoverCardComponent } from '../movie-hover-card/movie-hover-card.component';

@Component({
  selector: 'app-movie-search',
  templateUrl: './movie-search.component.html',
  styleUrls: ['./movie-search.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, PosterUrlPipe, BackdropUrlPipe, MovieHoverCardComponent],
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

  // New category sliders
  actionMovies: Movie[] = [];
  topRatedMovies: Movie[] = [];
  nowPlayingMovies: Movie[] = [];
  thrillerMovies: Movie[] = [];

  allContent: Movie[] = []; // Combined content for unified slider

  // Search filter state
  activeFilter: string = 'all';
  allResults: Movie[] = []; // Store unfiltered results

  // Hover Card Logic
  hoveredMovie: Movie | null = null;
  hoverTimeout: any;
  hoverCardPosition = { top: 0, left: 0, width: 0 };
  containerWidth = 0;

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

    // Fetch Action Movies (genre 28)
    this.movieService.discoverMoviesByGenre(28, 1).subscribe((res: any) => {
      this.actionMovies = (res.results || []).slice(0, 15).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        name: r.name,
        poster_path: r.poster_path ?? null,
        backdrop_path: r.backdrop_path ?? null,
        release_date: r.release_date ?? '',
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
        media_type: 'movie'
      } as Movie));
    });

    // Fetch Top Rated Movies
    this.movieService.getTopRatedMovies(1).subscribe((res: any) => {
      this.topRatedMovies = (res.results || []).slice(0, 15).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        name: r.name,
        poster_path: r.poster_path ?? null,
        backdrop_path: r.backdrop_path ?? null,
        release_date: r.release_date ?? '',
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
        media_type: 'movie'
      } as Movie));
    });

    // Fetch Now Playing Movies
    this.movieService.getNowPlayingMovies(1).subscribe((res: any) => {
      this.nowPlayingMovies = (res.results || []).slice(0, 15).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        name: r.name,
        poster_path: r.poster_path ?? null,
        backdrop_path: r.backdrop_path ?? null,
        release_date: r.release_date ?? '',
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
        media_type: 'movie'
      } as Movie));
    });

    // Fetch Thriller Movies (genre 53)
    this.movieService.discoverMoviesByGenre(53, 1).subscribe((res: any) => {
      this.thrillerMovies = (res.results || []).slice(0, 15).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        name: r.name,
        poster_path: r.poster_path ?? null,
        backdrop_path: r.backdrop_path ?? null,
        release_date: r.release_date ?? '',
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
        media_type: 'movie'
      } as Movie));
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

    // Use multi-search to find movies, TV shows, and people
    this.movieService.multiSearch(this.query).subscribe({
      next: (res: any) => {
        const allResults = res?.results || [];

        // Separate movies/TV and people
        const mediaResults = allResults.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
        const personResults = allResults.filter((r: any) => r.media_type === 'person');

        // Map media results
        let mappedResults = mediaResults.map((r: any) => ({
          id: r.id,
          title: r.title ?? r.name,
          name: r.name,
          poster_path: r.poster_path ?? null,
          backdrop_path: r.backdrop_path ?? null,
          release_date: r.release_date ?? r.first_air_date ?? '',
          first_air_date: r.first_air_date,
          vote_average: r.vote_average ?? 0,
          overview: r.overview ?? '',
          media_type: r.media_type,
          genre_ids: r.genre_ids || []
        }));

        // If we found people (actors/directors), fetch their credits
        if (personResults.length > 0) {
          // Get credits for up to 3 people to avoid too many requests
          const personCreditsPromises = personResults.slice(0, 3).map((person: any) =>
            this.movieService.getPersonCredits(person.id).toPromise()
          );

          Promise.all(personCreditsPromises).then((creditsResults: any[]) => {
            creditsResults.forEach((credits: any) => {
              if (credits?.cast) {
                // Add cast credits (movies/shows the person acted in)
                const castCredits = credits.cast
                  .filter((c: any) => c.poster_path || c.backdrop_path)
                  .slice(0, 10)
                  .map((c: any) => ({
                    id: c.id,
                    title: c.title ?? c.name,
                    name: c.name,
                    poster_path: c.poster_path ?? null,
                    backdrop_path: c.backdrop_path ?? null,
                    release_date: c.release_date ?? c.first_air_date ?? '',
                    first_air_date: c.first_air_date,
                    vote_average: c.vote_average ?? 0,
                    overview: c.overview ?? '',
                    media_type: c.media_type || (c.title ? 'movie' : 'tv'),
                    genre_ids: c.genre_ids || []
                  }));
                mappedResults = [...mappedResults, ...castCredits];
              }
            });

            // Remove duplicates by ID
            const seen = new Set();
            this.results = mappedResults.filter((item: any) => {
              const key = `${item.media_type}-${item.id}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            this.loading = false;
            this.loadRatings();
          }).catch(() => {
            // If credits fetch fails, just show direct results
            this.results = mappedResults;
            this.allResults = [...mappedResults]; // Store for filtering
            this.activeFilter = 'all';
            this.loading = false;
            this.loadRatings();
          });
        } else {
          this.results = mappedResults;
          this.allResults = [...mappedResults]; // Store for filtering
          this.activeFilter = 'all';
          this.loading = false;
          this.loadRatings();
        }
      },
      error: (error) => {
        console.error('Search error:', error);
        this.loading = false;
      }
    });
  }

  // Filter results by media type
  filterResults(filterType: string) {
    this.activeFilter = filterType;

    if (filterType === 'all') {
      this.results = [...this.allResults];
    } else if (filterType === 'movie' || filterType === 'tv') {
      this.results = this.allResults.filter((item: any) => item.media_type === filterType);
    }
  }

  // Filter by genre ID
  filterByGenre(genreId: number) {
    const genreMap: { [key: number]: string } = {
      28: 'action',
      35: 'comedy',
      18: 'drama'
    };

    this.activeFilter = genreMap[genreId] || 'all';

    this.results = this.allResults.filter((item: any) => {
      const genres = item.genre_ids || [];
      return genres.includes(genreId);
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
    const button = event.currentTarget as HTMLElement;
    const sliderRow = button.closest('.slider-row') as HTMLElement;
    const container = sliderRow?.querySelector('.slider-container') as HTMLElement;
    if (container) {
      container.scrollBy({ left: -600, behavior: 'smooth' });
    }
  }

  scrollSliderRight(event: Event) {
    const button = event.currentTarget as HTMLElement;
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

  // Hover connection methods
  private hoveredSliderTrack: HTMLElement | null = null;

  onMouseEnter(movie: Movie, event: MouseEvent) {
    // Cancel any pending close
    clearTimeout(this.hoverTimeout);

    // If already showing this movie, don't restart
    if (this.hoveredMovie?.id === movie.id) return;

    // Capture rect and slider track synchronously before the timeout
    const target = event.currentTarget as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const capturedPosition = {
      top: rect.top,
      left: rect.left,
      width: rect.width
    };

    // Find the slider track to pause it
    const sliderTrack = target.closest('.slider-track') as HTMLElement;

    // Delay before showing to avoid flash on quick mouse movements
    this.hoverTimeout = setTimeout(() => {
      // Pause the slider
      if (sliderTrack) {
        sliderTrack.classList.add('paused');
        this.hoveredSliderTrack = sliderTrack;
      }

      this.hoverCardPosition = capturedPosition;
      this.containerWidth = window.innerWidth;
      this.hoveredMovie = movie;
    }, 350);
  }

  onMouseLeave() {
    // Cancel any pending open
    clearTimeout(this.hoverTimeout);

    // Delay before closing to allow mouse to move to hover card
    this.hoverTimeout = setTimeout(() => {
      this.closeHoverAndResumeSlider();
    }, 150);
  }

  // Called when mouse enters the hover card itself - cancels any pending close
  keepHoverOpen() {
    clearTimeout(this.hoverTimeout);
  }

  // Called when mouse leaves the hover card
  closeHover() {
    this.closeHoverAndResumeSlider();
  }

  private closeHoverAndResumeSlider() {
    this.hoveredMovie = null;
    // Resume the slider
    if (this.hoveredSliderTrack) {
      this.hoveredSliderTrack.classList.remove('paused');
      this.hoveredSliderTrack = null;
    }
  }
}
