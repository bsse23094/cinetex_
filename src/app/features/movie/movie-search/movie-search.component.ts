import { Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FilmRailDirective } from '../../../shared/directives/film-rail.directive';
import { gsap } from 'gsap';
import { CinemaHoverDirective, MagneticDirective } from '../../../shared/directives/cinema-hover.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, merge, map, of, Subscription, switchMap, from, timeout } from 'rxjs';
import { MovieService } from '../movie.service';
import { Movie } from '../../../core/models/movie.model';
import { StorageService } from '../../../core/services/storage.service';
import { BackdropUrlPipe } from '../../../shared/pipes/backdrop-url.pipe';
import { PosterUrlPipe } from '../../../shared/pipes/poster-url.pipe';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { CinemaAtmosphereComponent } from '../../../shared/components/cinema-atmosphere/cinema-atmosphere.component';

type BrowseCategory = 'all' | 'movie' | 'tv' | 'anime';
type Mood = 'considered' | 'velocity' | 'afterhours';
type Media = Movie & { media_type?: 'movie' | 'tv'; name?: string; first_air_date?: string; genre_ids?: number[] };

@Component({
  selector: 'app-movie-search', standalone: true,
  templateUrl: './movie-search.component.html', styleUrls: ['./movie-search.component.css'],
  imports: [CommonModule, FormsModule, RouterLink, BackdropUrlPipe, PosterUrlPipe, CinemaAtmosphereComponent, CinemaHoverDirective, MagneticDirective, FilmRailDirective]
})
export class MovieSearchComponent implements OnDestroy {
  @ViewChild('featuredCopy') featuredCopy?: ElementRef<HTMLElement>;
  query = '';
  searchDraft = '';
  results: Movie[] = [];
  allResults: Movie[] = [];
  loading = false;
  searchError = false;
  discoveryLoading = true;
  discoveryError = false;
  activeFilter = 'all';
  sortOrder = 'relevance';
  resultsView: 'posters' | 'list' = 'posters';
  browseCategory: BrowseCategory = 'all';
  featuredMovie: Movie | null = null;
  featuredIndex = 0;
  isFeaturedFavorite = false;
  activeMood: Mood = 'considered';
  feedback = '';
  recommendedMovies: Movie[] = [];
  recommendedShows: Movie[] = [];
  recommendedAnime: Movie[] = [];
  topRatedMovies: Movie[] = [];
  actionMovies: Movie[] = [];
  thrillerMovies: Movie[] = [];
  personalizedMovies: Movie[] = [];
  readonly browseCategories: { key: BrowseCategory; label: string }[] = [
    { key: 'all', label: 'All titles' }, { key: 'movie', label: 'Films' },
    { key: 'tv', label: 'Series' }, { key: 'anime', label: 'Anime' }
  ];
  readonly searchFilters = [{ key: 'all', label: 'All titles' }, { key: 'movie', label: 'Films' }, { key: 'tv', label: 'Series' }];
  readonly moodOptions: { key: Mood; label: string }[] = [
    { key: 'considered', label: 'Slow down' }, { key: 'velocity', label: 'Feel the rush' }, { key: 'afterhours', label: 'After hours' }
  ];
  private subscriptions = new Subscription();
  private searchSubscription?: Subscription;
  private discoverySubscription?: Subscription;
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  constructor(private movieService: MovieService, private storage: StorageService, public router: Router, private route: ActivatedRoute, private auth: SupabaseAuthService) {
    this.subscriptions.add(this.route.queryParams.subscribe(params => {
      this.query = (params['query'] || '').trim();
      this.searchDraft = this.query;
      this.browseCategory = params['type'] === 'tv' || this.route.snapshot.routeConfig?.path === 'shows' ? 'tv' : 'all';
      this.searchSubscription?.unsubscribe();
      if (this.query) this.search();
      else { this.results = []; this.loading = false; }
    }));
    this.loadRecommendedContent();
    this.subscriptions.add(this.auth.user$.pipe(
      switchMap(user => user ? from(this.auth.getTasteProfile()).pipe(
        switchMap(profile => profile[0] ? this.movieService.discoverMoviesByGenre(profile[0].genre_id, 1) : of({ results: [] })),
        catchError(() => of({ results: [] }))
      ) : of({ results: [] }))
    ).subscribe(res => this.personalizedMovies = this.mapMovies(res.results || [], 'movie')));
  }

  get featuredChoices(): Movie[] {
    const candidates = this.recommendedMovies.length ? this.recommendedMovies : this.topRatedMovies;
    return candidates.filter(movie => movie.poster_path || movie.backdrop_path).slice(0, 4);
  }

  selectFeatured(index: number): void {
    const movie = this.featuredChoices[index];
    if (!movie) return;
    this.featuredIndex = index;
    this.featuredMovie = movie;
    this.checkFeaturedFavoriteStatus();
    if (this.featuredCopy && typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(this.featuredCopy.nativeElement, { y: 18, opacity: .2, filter: 'blur(5px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .75, ease: 'power3.out', overwrite: true });
    }
  }

  get contentRows(): { title: string; eyebrow: string; movies: Movie[] }[] {
    const rows = [
      { title: 'Selected for you', eyebrow: 'Inspired by your taste', movies: this.personalizedMovies, type: 'movie' },
      { title: 'In the conversation', eyebrow: 'Popular right now', movies: this.recommendedMovies, type: 'movie' },
      { title: 'One more episode', eyebrow: 'Series to settle into', movies: this.recommendedShows, type: 'tv' },
      { title: 'Beyond the ordinary', eyebrow: 'The anime collection', movies: this.recommendedAnime, type: 'anime' },
      { title: 'Worth coming back to', eyebrow: 'The most loved films', movies: this.topRatedMovies, type: 'movie' }
    ];
    const seen = new Set<string>();
    return rows.filter(row => this.browseCategory === 'all' || row.type === this.browseCategory)
      .map(row => ({ ...row, movies: row.movies.filter(movie => {
        const key = this.getMediaType(movie) + '-' + movie.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 12) })).filter(row => row.movies.length > 0);
  }

  trackMedia(_: number, movie: Movie): string { return ((movie as Media).media_type || 'movie') + '-' + movie.id; }

  trackRow(_: number, row: { title: string }): string { return row.title; }

  get moodFeature(): Movie | null {
    const movies = this.activeMood === 'considered' ? this.topRatedMovies : this.activeMood === 'velocity' ? this.actionMovies : this.thrillerMovies;
    return movies.find(movie => movie.backdrop_path) || movies[0] || null;
  }
  get moodLabel(): string { return this.moodOptions.find(mood => mood.key === this.activeMood)?.label || ''; }
  get moodNote(): string {
    return this.activeMood === 'considered' ? 'For a story that stays with you.'
      : this.activeMood === 'velocity' ? 'For a little more electricity in your evening.' : 'For the hours when the world goes quiet.';
  }
  moodAvailable(key: Mood): boolean {
    return (key === 'considered' ? this.topRatedMovies : key === 'velocity' ? this.actionMovies : this.thrillerMovies).length > 0;
  }
  setMood(key: Mood): void { if (this.moodAvailable(key)) this.activeMood = key; }

  loadRecommendedContent(): void {
    this.discoverySubscription?.unsubscribe();
    this.discoveryLoading = true;
    this.discoveryError = false;
    const requests = [
      { key: 'recommendedMovies', type: 'movie', request: this.movieService.getPopularMovies() },
      { key: 'recommendedShows', type: 'tv', request: this.movieService.getPopularTv() },
      { key: 'recommendedAnime', type: 'tv', request: this.movieService.getPopularAnime() },
      { key: 'topRatedMovies', type: 'movie', request: this.movieService.getTopRatedMovies() },
      { key: 'actionMovies', type: 'movie', request: this.movieService.discoverMoviesByGenre(28) },
      { key: 'thrillerMovies', type: 'movie', request: this.movieService.discoverMoviesByGenre(53) }
    ] as const;
    let completed = 0;
    this.discoverySubscription = merge(...requests.map(item => item.request.pipe(
      timeout(15000), catchError(() => of({ results: [] })),
      map(response => ({ key: item.key, type: item.type, results: response.results || [] }))
    ))).subscribe(data => {
      this[data.key] = this.mapMovies(data.results, data.type);
      completed++;
      const available = this.contentRows.length > 0;
      this.discoveryLoading = !available && completed < requests.length;
      this.discoveryError = !available && completed === requests.length;
      if (!this.featuredMovie || !this.featuredChoices.some(film => film.id === this.featuredMovie?.id)) this.selectFeatured(0);
      if (!this.featuredMovie) this.featuredMovie = this.topRatedMovies[0] || null;
      this.checkFeaturedFavoriteStatus();
      if (!this.moodAvailable(this.activeMood)) {
        const availableMood = this.moodOptions.find(mood => this.moodAvailable(mood.key));
        if (availableMood) this.activeMood = availableMood.key;
      }
    });
  }

  search(): void {
    if (!this.query.trim()) return;
    this.searchSubscription?.unsubscribe();
    this.loading = true;
    this.searchError = false;
    this.results = [];
    this.allResults = [];
    this.activeFilter = 'all';
    this.sortOrder = 'relevance';
    this.searchSubscription = this.movieService.multiSearch(this.query).pipe(
      timeout(15000),
      switchMap(res => {
        const direct = (res.results || []).filter((item: Media) => item.media_type === 'movie' || item.media_type === 'tv');
        const people = (res.results || []).filter((item: { media_type: string }) => item.media_type === 'person').slice(0, 3);
        if (!people.length) return of(direct);
        return forkJoin(people.map((person: { id: number }) => this.movieService.getPersonCredits(person.id).pipe(timeout(10000), catchError(() => of({ cast: [], crew: [] }))))).pipe(
          map((credits: any) => [...direct, ...credits.flatMap((credit: any) => [...(credit.cast || []), ...(credit.crew || []).filter((item: any) => item.job === 'Director')].slice(0, 15))])
        );
      }),
      catchError(() => { this.searchError = true; return of([]); })
    ).subscribe(items => {
      const seen = new Set<string>();
      this.allResults = this.mapMovies(items).filter(movie => {
        const key = this.getMediaType(movie) + '-' + movie.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      this.results = [...this.allResults];
      this.loading = false;
    });
  }

  submitSearch(): void {
    const query = this.searchDraft.trim();
    this.router.navigate(['/search'], { queryParams: query ? { query } : {} });
  }
  filterResults(type: string): void {
    this.activeFilter = type;
    this.sortResults();
  }
  watchMedia(movie: Movie): void {
    void this.auth.recordTasteSignal({ tmdbId: movie.id, mediaType: this.getMediaType(movie), genreIds: (movie as Media).genre_ids || [], signal: 'view', metadata: { title: this.getTitle(movie) } }).catch(() => {});
    this.router.navigate(['/watch', movie.id], { queryParams: this.getMediaType(movie) === 'tv' ? { type: 'tv', season: 1, episode: 1 } : {} });
  }
  addToFavorites(movie: Movie): void {
    const saved = this.storage.getCurrentUser()?.favoriteMovieIds?.includes(movie.id);
    if (saved) this.storage.removeMovieFromFavorites(movie.id);
    else this.storage.addMovieToFavorites(movie);
    this.checkFeaturedFavoriteStatus();
    this.feedback = saved ? 'Removed from favorites' : 'Saved to your favorites';
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => this.feedback = '', 3200);
  }
  checkFeaturedFavoriteStatus(): void { this.isFeaturedFavorite = !!this.featuredMovie && !!this.storage.getCurrentUser()?.favoriteMovieIds?.includes(this.featuredMovie.id); }
  getMediaType(movie: Movie): 'movie' | 'tv' { return (movie as Media).media_type || 'movie'; }
  getTitle(movie: Movie): string { return movie.title || (movie as Media).name || 'Untitled'; }
  getReleaseDate(movie: Movie): string { return movie.release_date || (movie as Media).first_air_date || ''; }
  filterCount(type: string): number {
    return type === 'all' ? this.allResults.length : this.allResults.filter(movie => this.getMediaType(movie) === type).length;
  }
  sortResults(): void {
    this.results = this.activeFilter === 'all' ? [...this.allResults] : this.allResults.filter(movie => this.getMediaType(movie) === this.activeFilter);
    if (this.sortOrder === 'rating') this.results.sort((a, b) => b.vote_average - a.vote_average);
    if (this.sortOrder === 'recent') this.results.sort((a, b) => this.getReleaseDate(b).localeCompare(this.getReleaseDate(a)));
  }
  private mapMovies(items: any[] = [], fallback?: 'movie' | 'tv'): Movie[] {
    return items.map(item => ({
      ...item, title: item.title || item.name || 'Untitled', release_date: item.release_date || item.first_air_date || '',
      poster_path: item.poster_path || null, backdrop_path: item.backdrop_path || null, overview: item.overview || '',
      vote_average: item.vote_average || 0, media_type: item.media_type || fallback || (item.first_air_date ? 'tv' : 'movie')
    }));
  }
  ngOnDestroy(): void {
    if (this.featuredCopy) gsap.killTweensOf(this.featuredCopy.nativeElement);
    this.subscriptions.unsubscribe();
    this.discoverySubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
  }
}
