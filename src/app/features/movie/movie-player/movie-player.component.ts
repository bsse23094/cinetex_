import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../movie.service';
import { PosterUrlPipe } from '../../../shared/pipes/poster-url.pipe';
import { combineLatest } from 'rxjs';
import { StorageService } from '../../../core/services/storage.service';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';


@Component({
  selector: 'app-movie-player',
  templateUrl: './movie-player.component.html',
  imports: [CommonModule, FormsModule, DatePipe, RatingStarsComponent],
  styleUrls: ['./movie-player.component.css']
})
export class MoviePlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoIframe') videoIframe!: ElementRef<HTMLIFrameElement>;

  movieId: string | null = null;
  mediaType: string = 'movie'; // 'movie' or 'tv'
  season: number = 1;
  episode: number = 1;
  trustedVideoUrl: SafeResourceUrl | null = null;

  // Movie/Show details
  mediaDetails: any = null;
  loading = true;

  // View toggle for TV shows
  showDetails = true; // Default to showing details

  // Skip intro / credits features
  showNextEpisode = false;
  creditsStart = 0; // will be calculated based on runtime
  videoCurrentTime = 0;
  videoDuration = 0;
  nextEpisodeCountdown = 10; // seconds before auto-play
  countdownInterval: any = null;
  videoProgressInterval: any = null;

  // Season/Episode info
  totalSeasons = 0;
  totalEpisodesInSeason = 0;
  seasonDetails: any = null;
  allSeasons: number[] = [];
  loadingEpisodes = false;

  // Watch progress tracking
  showContinueWatching = false;
  savedProgress: any = null;
  progressSaveInterval: any = null;

  // Movie actions
  isFavorite = false;
  userRating = 0;
  showRatingModal = false;
  showListModal = false;
  userLists: any[] = [];
  selectedListIds: string[] = [];
  newListTitle = '';
  showNewListForm = false;
  showSeasonDropdown = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private movieService: MovieService,
    private storage: StorageService
  ) { }

  ngOnInit(): void {
    // Combine both paramMap and queryParamMap to ensure we have all data before loading
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).subscribe(([params, queryParams]) => {
      this.movieId = params.get('id');
      this.mediaType = queryParams.get('type') || 'movie';
      this.season = parseInt(queryParams.get('season') || '1', 10);
      this.episode = parseInt(queryParams.get('episode') || '1', 10);

      // Check for saved progress
      this.checkSavedProgress();

      this.setVideoUrl();
      this.loadMediaDetails();
    });
  }

  ngAfterViewInit(): void {
    // Start monitoring video progress
    this.startVideoMonitoring();
    // Start auto-saving progress
    this.startProgressAutoSave();
    // Listen for messages from iframe (if embed supports postMessage)
    window.addEventListener('message', this.handleIframeMessage.bind(this));
  }

  ngOnDestroy(): void {
    // Clean up intervals
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.videoProgressInterval) {
      clearInterval(this.videoProgressInterval);
    }
    if (this.progressSaveInterval) {
      clearInterval(this.progressSaveInterval);
    }
    // Remove event listener
    window.removeEventListener('message', this.handleIframeMessage.bind(this));
    // Save progress one last time before leaving
    this.saveProgress();
  }

  getProgressKey(): string {
    return `cinetex_progress_${this.mediaType}_${this.movieId}`;
  }

  checkSavedProgress(): void {
    const progressKey = this.getProgressKey();
    const saved = localStorage.getItem(progressKey);

    if (saved) {
      try {
        this.savedProgress = JSON.parse(saved);

        // Check if saved progress is for a different episode/season
        if (this.mediaType === 'tv') {
          if (this.savedProgress.season !== this.season ||
            this.savedProgress.episode !== this.episode) {
            this.showContinueWatching = true;
          }
        } else {
          // For movies, show if there's saved progress and it's not at the beginning
          if (this.savedProgress.progress > 5) {
            this.showContinueWatching = true;
          }
        }
      } catch (e) {
        console.error('Error parsing saved progress:', e);
      }
    }
  }

  continueWatching(): void {
    if (!this.savedProgress) return;

    if (this.mediaType === 'tv') {
      // Navigate to saved episode
      this.season = this.savedProgress.season;
      this.episode = this.savedProgress.episode;
      this.videoCurrentTime = this.savedProgress.progress || 0;

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          type: this.mediaType,
          season: this.season,
          episode: this.episode
        },
        queryParamsHandling: 'merge'
      });

      this.setVideoUrl();
    } else {
      // For movies, just update the current time
      this.videoCurrentTime = this.savedProgress.progress || 0;
    }

    this.showContinueWatching = false;
  }

  startFromBeginning(): void {
    this.videoCurrentTime = 0;
    this.showContinueWatching = false;
    // Clear saved progress
    localStorage.removeItem(this.getProgressKey());
  }

  saveProgress(): void {
    if (!this.movieId) return;

    const progressData: any = {
      mediaType: this.mediaType,
      movieId: this.movieId,
      progress: this.videoCurrentTime,
      duration: this.videoDuration,
      timestamp: Date.now(),
      title: this.mediaDetails?.title || this.mediaDetails?.name || 'Unknown'
    };

    if (this.mediaType === 'tv') {
      progressData.season = this.season;
      progressData.episode = this.episode;
      progressData.seasonName = `S${this.season}:E${this.episode}`;
    }

    // Only save if there's meaningful progress (more than 30 seconds)
    // and not at the very end (last 2 minutes)
    if (this.videoCurrentTime > 30 &&
      (this.videoDuration === 0 || this.videoCurrentTime < this.videoDuration - 120)) {
      const progressKey = this.getProgressKey();
      localStorage.setItem(progressKey, JSON.stringify(progressData));
    }

    // If user finished watching (last 2 minutes), clear progress
    if (this.videoDuration > 0 && this.videoCurrentTime >= this.videoDuration - 120) {
      localStorage.removeItem(this.getProgressKey());
    }
  }

  startProgressAutoSave(): void {
    // Auto-save progress every 30 seconds
    this.progressSaveInterval = setInterval(() => {
      this.saveProgress();
    }, 30000);
  }

  handleIframeMessage(event: MessageEvent): void {
    // Handle postMessage from iframe if available
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'timeupdate') {
        this.videoCurrentTime = event.data.currentTime || 0;
        this.videoDuration = event.data.duration || 0;
      }
    }
  }

  startVideoMonitoring(): void {
    // For TV shows, show next episode prompt after estimated duration
    if (this.mediaType === 'tv') {
      // Typical TV episode is ~42-45 minutes, show prompt at ~40 minutes
      this.videoProgressInterval = setTimeout(() => {
        if (this.hasNextEpisode()) {
          this.showNextEpisode = true;
          this.startNextEpisodeCountdown();
        }
      }, 2400000); // 40 minutes in milliseconds
    }
  }

  checkVideoProgress(): void {
    // This method is now handled by time-based estimates
    // since we can't access iframe internals
  }

  hasNextEpisode(): boolean {
    if (this.mediaType !== 'tv' || !this.mediaDetails) return false;

    // Check if there's a next episode in current season
    if (this.episode < this.totalEpisodesInSeason) return true;

    // Check if there's a next season
    if (this.season < this.totalSeasons) return true;

    return false;
  }

  hasPreviousEpisode(): boolean {
    if (this.mediaType !== 'tv' || !this.mediaDetails) return false;

    // Check if there's a previous episode in current season
    if (this.episode > 1) return true;

    // Check if there's a previous season
    if (this.season > 1) return true;

    return false;
  }

  playPreviousEpisode(): void {
    if (!this.hasPreviousEpisode()) return;

    // Reset states
    this.showNextEpisode = false;
    this.videoCurrentTime = 0;
    this.videoDuration = 0;

    if (this.episode > 1) {
      // Previous episode in same season
      this.episode--;
    } else if (this.season > 1) {
      // Last episode of previous season
      this.season--;
      this.loadSeasonDetails(this.season);

      // We need to wait for season details to load to get the last episode number
      setTimeout(() => {
        this.episode = this.totalEpisodesInSeason;
        this.setVideoUrl();
        this.updateUrlParams();
      }, 500);
      return; // Exit early, we'll update URL after season loads
    }

    this.setVideoUrl();
    this.updateUrlParams();
  }

  updateUrlParams(): void {
    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        type: this.mediaType,
        season: this.season,
        episode: this.episode
      },
      queryParamsHandling: 'merge'
    });
  }

  startNextEpisodeCountdown(): void {
    this.nextEpisodeCountdown = 10;

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.nextEpisodeCountdown--;

      if (this.nextEpisodeCountdown <= 0) {
        clearInterval(this.countdownInterval);
        this.playNextEpisode();
      }
    }, 1000);
  }

  cancelNextEpisode(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.videoProgressInterval) {
      clearTimeout(this.videoProgressInterval);
    }
    this.showNextEpisode = false;
  }

  playNextEpisode(): void {
    if (!this.hasNextEpisode()) return;

    // Reset states
    this.showNextEpisode = false;
    this.videoCurrentTime = 0;
    this.videoDuration = 0;

    if (this.episode < this.totalEpisodesInSeason) {
      // Next episode in same season
      this.episode++;
    } else if (this.season < this.totalSeasons) {
      // First episode of next season
      this.season++;
      this.episode = 1;
      this.loadSeasonDetails(this.season);
    }

    this.setVideoUrl();
    this.updateUrlParams();
  }

  loadMediaDetails() {
    if (!this.movieId) return;

    this.loading = true;
    const id = parseInt(this.movieId, 10);

    console.log('Loading media details:', { id, mediaType: this.mediaType });

    if (this.mediaType === 'tv') {
      this.movieService.getTvDetails(id).subscribe({
        next: (data: any) => {
          console.log('TV details loaded:', data);
          this.mediaDetails = data;
          this.totalSeasons = data.number_of_seasons || 0;
          this.allSeasons = Array.from({ length: this.totalSeasons }, (_, i) => i + 1);
          this.loading = false;

          // Set backdrop image as CSS variable
          this.setBackdropImage(data.backdrop_path);

          // Load current season details to get episode count
          this.loadSeasonDetails(this.season);

          // Set video duration estimate (typical TV episode ~45 min)
          this.videoDuration = 2700; // 45 minutes in seconds
          this.creditsStart = this.videoDuration - 120; // Last 2 minutes

          // Check favorite status
          this.checkFavoriteStatus();
        },
        error: (err) => {
          console.error('Error loading TV details:', err);
          this.loading = false;
        }
      });
    } else {
      this.movieService.getMovieDetails(id).subscribe({
        next: (data: any) => {
          console.log('Movie details loaded:', data);
          this.mediaDetails = data;
          this.loading = false;

          // Set backdrop image as CSS variable
          this.setBackdropImage(data.backdrop_path);

          // Set video duration for movies
          if (data.runtime) {
            this.videoDuration = data.runtime * 60; // Convert minutes to seconds
            this.creditsStart = this.videoDuration - 300; // Last 5 minutes
          }

          // Check favorite status
          this.checkFavoriteStatus();
        },
        error: (err) => {
          console.error('Error loading movie details:', err);
          this.loading = false;
        }
      });
    }
  }

  loadSeasonDetails(seasonNumber: number): void {
    if (!this.movieId) return;

    this.loadingEpisodes = true;
    const id = parseInt(this.movieId, 10);
    this.movieService.getTvSeasonDetails(id, seasonNumber).subscribe({
      next: (data: any) => {
        console.log('Season details loaded:', data);
        this.seasonDetails = data;
        this.totalEpisodesInSeason = data.episodes?.length || 0;
        this.loadingEpisodes = false;
      },
      error: (err: any) => {
        console.error('Error loading season details:', err);
        this.loadingEpisodes = false;
      }
    });
  }

  onSeasonChange(newSeason: number): void {
    this.season = newSeason;
    this.episode = 1;
    this.loadSeasonDetails(newSeason);
    this.setVideoUrl();

    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        type: this.mediaType,
        season: this.season,
        episode: this.episode
      },
      queryParamsHandling: 'merge'
    });
  }

  selectEpisode(episodeNumber: number): void {
    this.episode = episodeNumber;
    this.videoCurrentTime = 0;
    this.videoDuration = 2700; // Reset duration
    this.setVideoUrl();

    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        type: this.mediaType,
        season: this.season,
        episode: this.episode
      },
      queryParamsHandling: 'merge'
    });

    // Scroll to top to show player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getEpisodeThumbnail(episode: any): string {
    if (episode.still_path) {
      return `https://image.tmdb.org/t/p/w300${episode.still_path}`;
    }
    return 'assets/no-image.jpg'; // Fallback image
  }

  getPosterUrl(path: string): string {
    if (!path) return 'assets/no-image.jpg';
    return `https://image.tmdb.org/t/p/w500${path}`;
  }

  playEpisode(episodeNumber: number): void {
    this.selectEpisode(episodeNumber);
  }

  setProvider(provider: string) {
    // No-op: single provider logic
  }

  setVideoUrl() {
    if (!this.movieId) return;
    if (!environment.embedBaseUrl) {
      this.trustedVideoUrl = null;
      return;
    }

    let url = '';

    // vidsrc-embed.ru uses tmdb id format
    // For movies: https://vidsrc-embed.ru/embed/movie/{tmdb_id}
    // For TV shows (series): https://vidsrc-embed.ru/embed/tv/{tmdb_id}
    // For TV episodes: https://vidsrc-embed.ru/embed/tv/{tmdb_id}/{season}-{episode}
    // For anime: Use alternative embed with gogoanime

    if (this.mediaType === 'anime') {
      // For anime, try to use gogoanime embed or fallback
      const animeTitle = this.mediaDetails?.title || this.mediaDetails?.name || '';
      const sanitizedTitle = animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      url = `https://gogoplay1.com/embedplus?id=${sanitizedTitle}-episode-${this.episode}`;
    } else if (this.mediaType === 'tv') {
      // TV show: include season and episode
      url = `${environment.embedBaseUrl}/embed/tv/${this.movieId}/${this.season}-${this.episode}`;
    } else {
      // Movie
      url = `${environment.embedBaseUrl}/embed/movie/${this.movieId}`;
    }

    this.trustedVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getProductionCompanies(): string {
    if (!this.mediaDetails?.production_companies || this.mediaDetails.production_companies.length === 0) {
      return 'N/A';
    }
    return this.mediaDetails.production_companies
      .slice(0, 3)
      .map((c: any) => c.name)
      .join(', ');
  }

  setBackdropImage(backdropPath: string | null): void {
    if (backdropPath) {
      const backdropUrl = `https://image.tmdb.org/t/p/original${backdropPath}`;
      document.documentElement.style.setProperty('--backdrop-image', `url('${backdropUrl}')`);
    } else {
      document.documentElement.style.setProperty('--backdrop-image', 'none');
    }
  }

  // Movie Actions
  checkFavoriteStatus(): void {
    if (this.movieId && this.mediaDetails) {
      const user = this.storage.getCurrentUser();
      const numericId = parseInt(this.movieId, 10);
      this.isFavorite = user.favoriteMovieIds.includes(numericId);

      // Check rating
      const ratings = this.storage.get<{ [key: number]: number }>('ratings') || {};
      this.userRating = ratings[numericId] || 0;
    }
  }

  toggleFavorite(): void {
    if (!this.mediaDetails) return;

    const movieObj = {
      id: parseInt(this.movieId!, 10),
      title: this.mediaDetails.title || this.mediaDetails.name,
      poster_path: this.mediaDetails.poster_path,
      backdrop_path: this.mediaDetails.backdrop_path,
      vote_average: this.mediaDetails.vote_average,
      release_date: this.mediaDetails.release_date || this.mediaDetails.first_air_date,
      overview: this.mediaDetails.overview,
      media_type: this.mediaType
    };

    if (this.isFavorite) {
      this.storage.removeMovieFromFavorites(movieObj.id);
      this.isFavorite = false;
    } else {
      this.storage.addMovieToFavorites(movieObj);
      this.isFavorite = true;
    }
  }

  openRatingModal(): void {
    this.showRatingModal = true;
  }

  closeRatingModal(): void {
    this.showRatingModal = false;
  }

  onRatingChange(rating: number): void {
    this.userRating = rating;
    const numericId = parseInt(this.movieId!, 10);

    // Save rating using storage service
    const ratings = this.storage.get<{ [key: number]: number }>('ratings') || {};
    ratings[numericId] = rating;
    this.storage.set('ratings', ratings);

    // Save movie object to storage so it appears in rated movies
    const movieObj = {
      id: numericId,
      title: this.mediaDetails.title || this.mediaDetails.name,
      poster_path: this.mediaDetails.poster_path,
      backdrop_path: this.mediaDetails.backdrop_path,
      vote_average: this.mediaDetails.vote_average,
      release_date: this.mediaDetails.release_date || this.mediaDetails.first_air_date,
      overview: this.mediaDetails.overview,
      media_type: this.mediaType
    };

    const movies = this.storage.getMovies();
    if (!movies.some((m: any) => m.id === numericId)) {
      movies.push(movieObj);
      this.storage.set('movies', movies);
    }

    // Close modal after rating
    setTimeout(() => {
      this.closeRatingModal();
    }, 500);
  }

  openListModal(): void {
    this.userLists = this.storage.getLists();
    this.selectedListIds = [];
    this.showNewListForm = false;
    this.newListTitle = '';
    this.showListModal = true;
  }

  closeListModal(): void {
    this.showListModal = false;
    this.showNewListForm = false;
    this.selectedListIds = [];
    this.newListTitle = '';
  }

  toggleListSelection(listId: string): void {
    const index = this.selectedListIds.indexOf(listId);
    if (index > -1) {
      this.selectedListIds.splice(index, 1);
    } else {
      this.selectedListIds.push(listId);
    }
  }

  isListSelected(listId: string): boolean {
    return this.selectedListIds.includes(listId);
  }

  toggleNewListForm(): void {
    this.showNewListForm = !this.showNewListForm;
    if (this.showNewListForm) {
      this.newListTitle = '';
    }
  }

  createNewList(): void {
    if (!this.newListTitle.trim()) return;

    const newList = {
      id: this.newListTitle.trim().toLowerCase().replace(/\s+/g, '-'),
      title: this.newListTitle.trim(),
      movies: [],
      created: new Date(),
      updated: new Date(),
      isPublic: false,
      userId: 'me'
    };

    this.storage.addList(newList);
    this.userLists = this.storage.getLists();
    this.selectedListIds.push(newList.id);
    this.newListTitle = '';
    this.showNewListForm = false;
  }

  addToSelectedLists(): void {
    if (!this.mediaDetails || this.selectedListIds.length === 0) return;

    const movieObj = {
      id: parseInt(this.movieId!, 10),
      title: this.mediaDetails.title || this.mediaDetails.name,
      poster_path: this.mediaDetails.poster_path,
      backdrop_path: this.mediaDetails.backdrop_path,
      vote_average: this.mediaDetails.vote_average,
      release_date: this.mediaDetails.release_date || this.mediaDetails.first_air_date,
      overview: this.mediaDetails.overview,
      media_type: this.mediaType
    };

    for (const listId of this.selectedListIds) {
      this.storage.addMovieToList(listId, movieObj);
    }

    this.closeListModal();
  }

  formatTime(seconds: number): string {
    if (!seconds || seconds === 0) return '0:00';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
