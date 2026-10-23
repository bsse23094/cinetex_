import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { buildEmbedUrl } from './embed-url';
import { environment } from '../../../../environments/environment';
import { FocusTrapDirective } from '../../../shared/directives/focus-trap.directive';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../movie.service';
import { combineLatest, Subscription, timeout } from 'rxjs';
import { FilmRailDirective } from '../../../shared/directives/film-rail.directive';
import { GuideSelectComponent, GuideOption } from '../../../shared/components/guide-select/guide-select.component';
import { StorageService } from '../../../core/services/storage.service';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';


@Component({
  selector: 'app-movie-player',
  templateUrl: './movie-player.component.html',
  imports: [CommonModule, FormsModule, DatePipe, RatingStarsComponent, RouterLink, FocusTrapDirective, FilmRailDirective, GuideSelectComponent],
  styleUrls: ['./movie-player.component.css']
})
export class MoviePlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoIframe') videoIframe!: ElementRef<HTMLIFrameElement>;
  @ViewChild('playerScreen') playerScreen?: ElementRef<HTMLElement>;
  @ViewChild('episodeTrack') episodeTrack?: ElementRef<HTMLElement>;

  movieId: string | null = null;
  mediaType: string = 'movie'; // 'movie' or 'tv'
  season: number = 1;
  episode: number = 1;
  trustedVideoUrl: SafeResourceUrl | null = null;

  // Movie/Show details
  mediaDetails: any = null;
  loading = true;
  detailsError = false;
  theaterMode = false;
  playerConnecting = true;
  playerSlow = false;
  playerFeedback = '';
  readonly playerSources = [environment.embedBaseUrl, ...environment.embedFallbackBaseUrls].filter((url, index, urls) => !!url && urls.indexOf(url) === index);
  playerSourceIndex = 0;
  guideSeason = 1;
  guideDetails: any = null;
  loadingGuide = false;
  guideError = false;
  private routeSubscription?: Subscription;
  private detailsSubscription?: Subscription;
  private seasonSubscription?: Subscription;
  private guideSubscription?: Subscription;
  private navigationSubscription?: Subscription;
  episodeNavigationPending = false;
  private playerTimer?: ReturnType<typeof setTimeout>;
  private playbackKey = '';
  private reloadTimer?: ReturnType<typeof setTimeout>;


  // View toggle for TV shows
  showDetails = false; // Series open on the episode guide.

  // Skip intro / credits features
  showNextEpisode = false;
  autoplayNext = false;
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
  private readonly boundIframeMessage = (event: MessageEvent) => this.handleIframeMessage(event);

  // Movie actions
  isFavorite = false;
  userRating = 0;
  showRatingModal = false;
  showListModal = false;
  userLists: any[] = [];
  selectedListIds: string[] = [];
  newListTitle = '';
  showNewListForm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private movieService: MovieService,
    private storage: StorageService
  ) { }

  onPlayerLoaded(): void {
    this.playerConnecting = false;
    this.playerSlow = false;
    clearTimeout(this.playerTimer);
  }
  reloadPlayer(): void {
    clearTimeout(this.playerTimer);
    this.playerConnecting = true;
    this.playerSlow = false;
    this.trustedVideoUrl = null;
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.setVideoUrl(this.videoCurrentTime), 30);
  }
  tryAlternatePlayer(): void {
    if (this.playerSources.length < 2) return;
    this.playerSourceIndex = (this.playerSourceIndex + 1) % this.playerSources.length;
    this.reloadPlayer();
  }
  onPlayerError(): void {
    clearTimeout(this.playerTimer);
    this.playerConnecting = false;
    this.playerSlow = true;
  }
  async enterFullscreen(): Promise<void> {
    this.playerFeedback = '';
    try {
      if (this.playerScreen?.nativeElement.requestFullscreen) await this.playerScreen.nativeElement.requestFullscreen();
      else this.playerFeedback = 'Use the fullscreen control inside the video on this device.';
    } catch { this.playerFeedback = 'Use the fullscreen control inside the video on this device.'; }
  }
  loadGuideSeason(value: number): void {
    if (!Number.isInteger(Number(value)) || Number(value) < 0) return;
    this.guideSeason = Number(value);
    this.episodeTrack?.nativeElement.scrollTo({ left: 0, behavior: 'instant' });
    this.guideError = false;
    this.guideSubscription?.unsubscribe();
    if (this.guideSeason === this.season && this.seasonDetails) {
      this.guideDetails = this.seasonDetails;
      this.loadingGuide = false;
      return;
    }
    this.loadingGuide = true;
    this.guideDetails = null;
    this.guideSubscription = this.movieService.getTvSeasonDetails(Number(this.movieId), this.guideSeason).pipe(timeout(15000)).subscribe({
      next: data => {
        this.guideDetails = data;
        this.loadingGuide = false;
        if (this.guideSeason === this.season) {
          this.seasonDetails = data;
          this.totalEpisodesInSeason = data.episodes?.length || 0;
        }
      },
      error: () => { this.guideError = true; this.loadingGuide = false; }
    });
  }
  playGuideEpisode(number: number): void {
    if (this.loadingGuide || !this.guideDetails?.episodes?.some((ep: any) => ep.episode_number === Number(number))) return;
    if (this.guideSeason === this.season && Number(number) === this.episode) return;
    this.season = this.guideSeason;
    this.playEpisode(Number(number));
  }

  get currentEpisode(): any {
    return this.seasonDetails?.episodes?.find((ep: any) => ep.episode_number === this.episode);
  }

  seasonLabel(number: number): string {
    return this.mediaDetails?.seasons?.find((item: any) => item.season_number === number)?.name
      || (number === 0 ? 'Specials' : `Season ${number}`);
  }

  get guideSeasonOptions(): GuideOption[] {
    return this.allSeasons.map(value => {
      const count = this.mediaDetails?.seasons?.find((item: any) => item.season_number === value)?.episode_count;
      return { value, label: this.seasonLabel(value), detail: count == null ? '' : `${count} ${count === 1 ? 'episode' : 'episodes'}` };
    });
  }

  get guideEpisodeOptions(): GuideOption[] {
    return (this.guideDetails?.episodes || []).map((ep: any) => ({
      value: ep.episode_number,
      label: ep.name || `Episode ${ep.episode_number}`,
      marker: `E${String(ep.episode_number).padStart(2, '0')}`,
      detail: [ep.runtime ? `${ep.runtime} min` : '', this.guideSeason === this.season && ep.episode_number === this.episode ? 'On screen' : ''].filter(Boolean).join(' / ')
    }));
  }

  toggleAutoplay(): void {
    this.autoplayNext = !this.autoplayNext;
    if (!this.autoplayNext) this.cancelNextEpisode();
  }

  trackEpisode(_: number, ep: any): number { return ep.episode_number; }

  ngOnInit(): void {
    // Combine both paramMap and queryParamMap to ensure we have all data before loading
    this.routeSubscription = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).subscribe(([params, queryParams]) => {
      this.movieId = params.get('id');
      this.mediaType = queryParams.get('type') || 'movie';
      this.season = Math.max(0, parseInt(queryParams.get('season') || '1', 10) || 0);
      this.episode = Math.max(1, parseInt(queryParams.get('episode') || '1', 10) || 1);
      const key = `${this.mediaType}:${this.movieId}:${this.season}:${this.episode}`;
      if (key !== this.playbackKey) { this.videoCurrentTime = 0; this.videoDuration = 0; this.playbackKey = key; }
      clearTimeout(this.reloadTimer);

      this.guideSeason = this.season;
      this.guideDetails = null;
      this.loadingGuide = this.mediaType === 'tv';
      this.guideError = false;
      this.guideSubscription?.unsubscribe();
      this.seasonSubscription?.unsubscribe();
      this.navigationSubscription?.unsubscribe();
      this.episodeNavigationPending = false;
      this.mediaDetails = null;
      this.allSeasons = [];
      this.totalSeasons = 0;
      this.seasonDetails = null;
      this.totalEpisodesInSeason = 0;
      this.showContinueWatching = false;
      this.savedProgress = null;
      this.cancelNextEpisode();
      // Check for saved progress
      this.checkSavedProgress();

      this.setVideoUrl();
      this.loadMediaDetails();
      this.startVideoMonitoring();
    });
  }

  ngAfterViewInit(): void {
    // Start auto-saving progress
    this.startProgressAutoSave();
    // Listen for messages from iframe (if embed supports postMessage)
    window.addEventListener('message', this.boundIframeMessage);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe(); this.detailsSubscription?.unsubscribe();
    this.seasonSubscription?.unsubscribe(); this.guideSubscription?.unsubscribe();
    this.navigationSubscription?.unsubscribe();
    clearTimeout(this.playerTimer); clearTimeout(this.reloadTimer);
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
    window.removeEventListener('message', this.boundIframeMessage);
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
        } // The embedded player owns movie resume; only offer episode navigation here.
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

    } else {
      // For movies, just update the current time
      this.videoCurrentTime = this.savedProgress.progress || 0;
    }

    this.showContinueWatching = false;
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
    const iframe = this.videoIframe?.nativeElement;
    if (!iframe || event.source !== iframe.contentWindow) return;
    let allowedOrigin: string;
    try { allowedOrigin = new URL(iframe.src).origin; } catch { return; }
    if (event.origin !== allowedOrigin || !event.data || typeof event.data !== 'object') return;
    const payload = event.data.type === 'PLAYER_EVENT' ? event.data.data : event.data;
    if (!payload || typeof payload !== 'object') return;
    const modern = event.data.type === 'PLAYER_EVENT';
    const status = modern ? payload.player_status : payload.type;
    if (modern || status === 'timeupdate') {
      const current = Number(modern ? payload.player_progress : payload.currentTime);
      const duration = Number(modern ? payload.player_duration : payload.duration);
      if (Number.isFinite(current) && current >= 0) this.videoCurrentTime = current;
      if (Number.isFinite(duration) && duration >= 0) this.videoDuration = duration;
    }
    if (['playing', 'paused', 'seeked', 'timeupdate', 'completed', 'ended'].includes(status)) this.onPlayerLoaded();
    if ((status === 'ended' || status === 'completed') && this.autoplayNext && this.hasNextEpisode() && !this.showNextEpisode) {
      this.showNextEpisode = true;
      this.startNextEpisodeCountdown();
    }
  }

  startVideoMonitoring(): void {
    // Advance only after a verified player completion event, never a guessed runtime.
    if (this.videoProgressInterval) clearTimeout(this.videoProgressInterval);
  }

  private adjacentSeason(direction: number): number | undefined {
    const seasons = this.allSeasons.length ? this.allSeasons : Array.from({ length: Math.max(this.totalSeasons, this.season) }, (_, i) => i + 1);
    const index = seasons.indexOf(this.season);
    return index < 0 ? undefined : seasons[index + direction];
  }

  hasNextEpisode(): boolean {
    return this.mediaType === 'tv' && !!this.mediaDetails && !this.loadingEpisodes && !this.episodeNavigationPending
      && (this.episode < this.totalEpisodesInSeason || this.adjacentSeason(1) !== undefined);
  }

  hasPreviousEpisode(): boolean {
    return this.mediaType === 'tv' && !!this.mediaDetails && !this.loadingEpisodes && !this.episodeNavigationPending
      && (this.episode > 1 || this.adjacentSeason(-1) !== undefined);
  }

  private navigateSeason(direction: number): void {
    const target = this.adjacentSeason(direction);
    if (target === undefined || !this.movieId) return;
    this.episodeNavigationPending = true;
    this.playerFeedback = '';
    this.navigationSubscription?.unsubscribe();
    this.navigationSubscription = this.movieService.getTvSeasonDetails(Number(this.movieId), target).pipe(timeout(15000)).subscribe({
      next: data => {
        this.episodeNavigationPending = false;
        const episodes = data.episodes || [];
        const targetEpisode = direction > 0 ? episodes[0] : episodes[episodes.length - 1];
        if (!targetEpisode) { this.playerFeedback = 'No episodes are available in that season yet.'; return; }
        this.cancelNextEpisode();
        this.season = target;
        this.episode = targetEpisode.episode_number;
        this.updateUrlParams();
      },
      error: () => {
        this.episodeNavigationPending = false;
        this.playerFeedback = 'That season could not load. Please try again.';
      }
    });
  }

  playPreviousEpisode(): void {
    if (!this.hasPreviousEpisode()) return;
    if (this.episode === 1) { this.navigateSeason(-1); return; }
    this.cancelNextEpisode();
    this.episode--;
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
    if (this.episode >= this.totalEpisodesInSeason) { this.navigateSeason(1); return; }
    this.cancelNextEpisode();
    this.episode++;
    this.updateUrlParams();
  }

  loadMediaDetails() {
    if (!this.movieId) return;

    this.loading = true;
    this.detailsError = false;
    this.detailsSubscription?.unsubscribe();
    const id = parseInt(this.movieId, 10);

    if (this.mediaType === 'tv') {
      this.detailsSubscription = this.movieService.getTvDetails(id).pipe(timeout(15000)).subscribe({
        next: (data: any) => {
          this.mediaDetails = data;
          this.totalSeasons = data.number_of_seasons || 0;
          this.allSeasons = data.seasons?.length
            ? data.seasons.filter((item: any) => item.episode_count > 0 || item.season_number === this.season).map((item: any) => item.season_number).sort((a: number, b: number) => a - b)
            : Array.from({ length: this.totalSeasons }, (_, i) => i + 1);
          this.loading = false;

          // Load current season details to get episode count
          this.loadSeasonDetails(this.season);

          // Set video duration estimate (typical TV episode ~45 min)
          this.videoDuration = 2700; // 45 minutes in seconds
          this.creditsStart = this.videoDuration - 120; // Last 2 minutes

          // Check favorite status
          this.checkFavoriteStatus();
        },
        error: (err) => {
          this.detailsError = true;
          this.loadingGuide = false;
          this.loading = false;
        }
      });
    } else {
      this.detailsSubscription = this.movieService.getMovieDetails(id).pipe(timeout(15000)).subscribe({
        next: (data: any) => {
          this.mediaDetails = data;
          this.loading = false;

          // Set video duration for movies
          if (data.runtime) {
            this.videoDuration = data.runtime * 60; // Convert minutes to seconds
            this.creditsStart = this.videoDuration - 300; // Last 5 minutes
          }

          // Check favorite status
          this.checkFavoriteStatus();
        },
        error: (err) => {
          this.detailsError = true;
          this.loading = false;
        }
      });
    }
  }

  loadSeasonDetails(seasonNumber: number, onLoaded?: () => void): void {
    if (!this.movieId) return;

    this.loadingEpisodes = true;
    const id = parseInt(this.movieId, 10);
    this.seasonSubscription?.unsubscribe();
    this.seasonSubscription = this.movieService.getTvSeasonDetails(id, seasonNumber).pipe(timeout(15000)).subscribe({
      next: (data: any) => {
        this.seasonDetails = data;
        this.totalEpisodesInSeason = data.episodes?.length || 0;
        this.loadingEpisodes = false;
        if (this.guideSeason === seasonNumber) { this.guideDetails = data; this.loadingGuide = false; }
        onLoaded?.();
      },
      error: (err: any) => {
        if (this.guideSeason === seasonNumber) { this.guideError = true; this.loadingGuide = false; }
        this.loadingEpisodes = false;
      }
    });
  }

  selectEpisode(episodeNumber: number): void {
    this.cancelNextEpisode();
    this.episode = episodeNumber;
    this.videoCurrentTime = 0;
    this.videoDuration = 2700; // Reset duration
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
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  getEpisodeThumbnail(episode: any): string {
    if (episode.still_path) {
      return `https://image.tmdb.org/t/p/w300${episode.still_path}`;
    }
    return 'assets/no-poster.svg'; // Fallback image
  }

  getPosterUrl(path: string): string {
    if (!path) return 'assets/no-poster.svg';
    return `https://image.tmdb.org/t/p/w500${path}`;
  }

  playEpisode(episodeNumber: number): void {
    this.selectEpisode(episodeNumber);
  }

  setVideoUrl(resumeAt = 0): void {
    clearTimeout(this.playerTimer);
    const url = buildEmbedUrl(this.playerSources[this.playerSourceIndex], this.mediaType, this.movieId, this.season, this.episode, resumeAt);
    if (!url) { this.trustedVideoUrl = null; this.playerConnecting = false; return; }
    this.playerConnecting = true;
    this.playerSlow = false;
    this.playerFeedback = '';
    this.playerTimer = setTimeout(() => this.onPlayerError(), 12000);
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
