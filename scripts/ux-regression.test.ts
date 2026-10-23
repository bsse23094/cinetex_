import '@angular/compiler';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildEmbedUrl } from '../src/app/features/movie/movie-player/embed-url';
import { nearestReelPhase, reelPose } from '../src/app/shared/components/cinema-atmosphere/reel-motion';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TMDBService } from '../src/app/core/services/tmdb.service';
import { ChatbotService } from '../src/app/core/services/chatbot.service';
import { ChatbotComponent } from '../src/app/shared/components/chatbot/chatbot.component';
import { railPosition } from '../src/app/shared/directives/film-rail.directive';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { MovieSearchComponent } from '../src/app/features/movie/movie-search/movie-search.component';
import { MoviePlayerComponent } from '../src/app/features/movie/movie-player/movie-player.component';
import { ListManagerComponent } from '../src/app/features/lists/list-manager/list-manager.component';
import { MovieDetailComponent } from '../src/app/features/movie/movie-detail/movie-detail.component';

const film = (id: number, type = 'movie') => ({ id, title: 'Film ' + id, media_type: type, backdrop_path: '/art.jpg', poster_path: '/poster.jpg', vote_average: 8, release_date: '2025-01-01', overview: 'A story.' });
function fixture(overrides = {}) {
  const params = new BehaviorSubject<Record<string, string>>({});
  const user = { favoriteMovieIds: [] as number[] };
  const lists: any[] = [];
  const storage: any = {
    getCurrentUser: () => user,
    addMovieToFavorites: (movie: any) => user.favoriteMovieIds.push(movie.id),
    removeMovieFromFavorites: (id: number) => user.favoriteMovieIds = user.favoriteMovieIds.filter(value => value !== id),
    getLists: () => lists,
    addList: (list: any) => lists.push(list)
  };
  const service: any = {
    getPopularMovies: () => of({ results: [film(1), film(2)] }),
    getPopularTv: () => of({ results: [film(1, 'tv'), film(3, 'tv')] }),
    getPopularAnime: () => of({ results: [film(3, 'tv'), film(4, 'tv')] }),
    getTopRatedMovies: () => of({ results: [film(1), film(5)] }),
    discoverMoviesByGenre: () => of({ results: [film(6)] }),
    multiSearch: () => of({ results: [] }),
    getPersonCredits: () => of({ cast: [], crew: [] }),
    ...overrides
  };
  const navigations: any[] = [];
  const router: any = { navigate: (...args: any[]) => { navigations.push(args); return Promise.resolve(true); } };
  const auth: any = { user$: of(null), recordTasteSignal: () => Promise.resolve() };
  const component = new MovieSearchComponent(service, storage, router, { queryParams: params, snapshot: {} } as any, auth);
  return { component, params, storage, user, router, navigations, service };
}

test('discovery removes repeated titles while preserving distinct films and series with the same ID', () => {
  const { component } = fixture();
  try {
    const keys = component.contentRows.flatMap(row => row.movies.map(movie => component.getMediaType(movie) + '-' + movie.id));
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.includes('movie-1') && keys.includes('tv-1'));
    component.browseCategory = 'anime';
    assert.equal(component.contentRows.length, 1);
    assert.equal(component.contentRows[0].title, 'Beyond the ordinary');
    component.selectFeatured(1);
    assert.equal(component.featuredMovie?.id, 2);
  } finally { component.ngOnDestroy(); }
});

test('a late search response cannot replace results for the current query', () => {
  const first = new Subject<any>();
  const second = new Subject<any>();
  const { component, params } = fixture({ multiSearch: (query: string) => query === 'first' ? first : second });
  try {
    params.next({ query: 'first' });
    params.next({ query: 'second' });
    second.next({ results: [film(9), film(9), film(9, 'tv')] });
    first.next({ results: [film(1)] });
    assert.equal(component.query, 'second');
    assert.deepEqual(component.results.map(movie => movie.id), [9, 9]);
    component.filterResults('tv');
    assert.equal(component.results.length, 1);
    assert.equal(component.getMediaType(component.results[0]), 'tv');
  } finally { component.ngOnDestroy(); }
});

test('search failure exposes a retry state and recovery clears it', () => {
  let failed = true;
  const { component, params } = fixture({ multiSearch: () => failed ? throwError(() => new Error('offline')) : of({ results: [film(1)] }) });
  try {
    params.next({ query: 'test' });
    assert.equal(component.searchError, true);
    assert.equal(component.loading, false);
    failed = false;
    component.search();
    assert.equal(component.searchError, false);
    assert.equal(component.results.length, 1);
  } finally { component.ngOnDestroy(); }
});

test('saved-state feedback reflects actual favorite additions and removals', () => {
  const { component, user } = fixture();
  try {
    component.addToFavorites(component.featuredMovie!);
    assert.equal(component.isFeaturedFavorite, true);
    assert.deepEqual(user.favoriteMovieIds, [1]);
    component.addToFavorites(component.featuredMovie!);
    assert.equal(component.isFeaturedFavorite, false);
    assert.deepEqual(user.favoriteMovieIds, []);
    assert.equal(component.feedback, 'Removed from favorites');
  } finally { component.ngOnDestroy(); }
});

test('a partial catalog outage preserves the other shelves', () => {
  const { component } = fixture({ getPopularMovies: () => throwError(() => new Error('offline')) });
  try {
    assert.equal(component.discoveryLoading, false);
    assert.equal(component.discoveryError, false);
    assert.ok(component.contentRows.length > 0);
    assert.ok(component.featuredMovie);
  } finally { component.ngOnDestroy(); }
});

test('collection creation only requires a human-readable name', () => {
  const { component, storage } = fixture();
  try {
    const library = new ListManagerComponent(storage);
    library.newListTitle = '  Sunday cinema  ';
    library.addList();
    assert.equal(library.lists.length, 1);
    assert.equal(library.lists[0].title, 'Sunday cinema');
    assert.match(library.lists[0].id, /^sunday-cinema-/);
    assert.equal(library.newListTitle, '');
  } finally { component.ngOnDestroy(); }
});

test('title details remove favorites from storage when toggled off', () => {
  const { component, storage, user } = fixture();
  try {
    const detail = new MovieDetailComponent({} as any, {} as any, {} as any, storage);
    detail.movie = film(12) as any;
    detail.toggleFavourite();
    detail.toggleFavourite();
    assert.equal(detail.isFavorite, false);
    assert.deepEqual(user.favoriteMovieIds, []);
  } finally { component.ngOnDestroy(); }
});

test('episode progression requires an opted-in, verified completion event', () => {
  const player = new MoviePlayerComponent({} as any, {} as any, {} as any, {} as any, {} as any);
  const source = {};
  player.videoIframe = { nativeElement: { src: 'https://example.com/embed', contentWindow: source } } as any;
  player.mediaType = 'tv';
  player.mediaDetails = {};
  player.totalEpisodesInSeason = 2;
  let countdowns = 0;
  player.startNextEpisodeCountdown = () => { countdowns++; };
  const message = (origin = 'https://example.com', sender = source) => ({ origin, source: sender, data: { type: 'ended' } } as any);
  player.handleIframeMessage(message());
  assert.equal(countdowns, 0);
  player.autoplayNext = true;
  player.handleIframeMessage(message('https://untrusted.example'));
  player.handleIframeMessage(message('https://example.com', {}));
  assert.equal(countdowns, 0);
  player.handleIframeMessage(message());
  assert.equal(countdowns, 1);
  player.handleIframeMessage(message());
  assert.equal(countdowns, 1);
});

test('previous season navigation waits for the actual episode count', () => {
  const response = new Subject<any>();
  const navigations: any[] = [];
  const player = new MoviePlayerComponent({} as any, { navigate: (...args: any[]) => navigations.push(args) } as any, {} as any,
    { getTvSeasonDetails: () => response } as any, {} as any);
  player.movieId = '1';
  player.mediaType = 'tv';
  player.mediaDetails = {};
  player.season = 2;
  player.episode = 1;
  player.totalEpisodesInSeason = 20;
  player.setVideoUrl = () => {};
  player.playPreviousEpisode();
  assert.equal(navigations.length, 0);
  response.next({ episodes: Array.from({ length: 8 }, (_, index) => ({ episode_number: index + 1 })) });
  assert.equal(player.season, 1);
  response.complete();
  assert.equal(player.episode, 8);
  assert.equal(navigations.length, 1);
});


test('search sorting keeps filter counts and restores relevance without mutating source results', () => {
  const { component, params } = fixture({ multiSearch: () => of({ results: [
    { ...film(1), vote_average: 6, release_date: '2024-01-01' },
    { ...film(2, 'tv'), vote_average: 9, release_date: '2023-01-01' },
    { ...film(3), vote_average: 8, release_date: '2025-01-01' }
  ] }) });
  try {
    params.next({ query: 'space' });
    component.sortOrder = 'rating'; component.sortResults();
    assert.deepEqual(component.results.map(item => item.id), [2, 3, 1]);
    component.filterResults('movie');
    assert.deepEqual(component.results.map(item => item.id), [3, 1]);
    assert.equal(component.filterCount('tv'), 1);
    component.sortOrder = 'relevance'; component.filterResults('all');
    assert.deepEqual(component.results.map(item => item.id), [1, 2, 3]);
  } finally { component.ngOnDestroy(); }
});

test('rail boundaries handle short shelves, fractional scrolling and overscroll', () => {
  assert.deepEqual(railPosition(0, 600, 500), { atStart: true, atEnd: true, progress: 1 });
  assert.equal(railPosition(1, 600, 1800).atStart, true);
  assert.equal(railPosition(1199.5, 600, 1800).atEnd, true);
  assert.equal(railPosition(600, 600, 1800).progress, .5);
  assert.equal(railPosition(1600, 600, 1800).progress, 1);
});

test('browsing seasons preserves playback and ignores late guide responses', () => {
  const first = new Subject<any>(); const second = new Subject<any>();
  const player = new MoviePlayerComponent({} as any, {} as any, {} as any,
    { getTvSeasonDetails: (_: number, season: number) => season === 2 ? first : second } as any, {} as any);
  player.movieId = '1'; player.mediaType = 'tv'; player.season = 1; player.episode = 4;
  player.totalEpisodesInSeason = 10;
  player.loadGuideSeason(2); player.loadGuideSeason(3);
  second.next({ episodes: [{ name: 'Third season' }] }); second.complete();
  first.next({ episodes: [{ name: 'Stale second season' }] }); first.complete();
  assert.equal(player.guideDetails.episodes[0].name, 'Third season');
  assert.equal(player.season, 1); assert.equal(player.episode, 4);
  assert.equal(player.totalEpisodesInSeason, 10);
  assert.equal(player.loadingGuide, false);
});

function chatFixture(post: () => any) {
  const injector = Injector.create({ providers: [ChatbotService,
    { provide: HttpClient, useValue: { post } },
    { provide: TMDBService, useValue: { searchMovies: () => of({ results: [] }) } }
  ] });
  const service = injector.get(ChatbotService);
  const component = runInInjectionContext(injector, () => new ChatbotComponent());
  component.ngOnInit();
  return { component, service };
}

test('concierge renders the user message immediately and cancels a cleared conversation', () => {
  const response = new Subject<any>();
  const { component, service } = chatFixture(() => response);
  try {
    component.userMessage = 'A clever thriller'; component.sendMessage();
    assert.equal(component.messages[0].content, 'A clever thriller');
    assert.equal(component.isLoading, true);
    component.clearChat();
    response.next({ response: 'A stale answer' });
    assert.deepEqual(service.getConversationHistory(), []);
    assert.equal(component.isLoading, false);
  } finally { component.ngOnDestroy(); }
});

test('concierge connection failures are honest and retry does not duplicate the prompt', () => {
  let fail = true;
  const { component, service } = chatFixture(() => fail ? throwError(() => new Error('offline')) : of({ response: 'Try a mystery tonight.' }));
  try {
    component.sendQuickAction('A mystery please');
    assert.equal(component.messages[1].failed, true);
    fail = false; component.retry();
    const history = service.getConversationHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].content, 'A mystery please');
    assert.equal(history[1].content, 'Try a mystery tonight.');
    assert.equal(component.isLoading, false);
  } finally { component.ngOnDestroy(); }
});

test('concierge text is escaped before applying simple bold formatting', () => {
  const { component } = chatFixture(() => of({ response: 'Hello' }));
  try {
    assert.equal(component.formatMessage('<img src=x> **Arrival**'), '&lt;img src=x&gt; <strong>Arrival</strong>');
  } finally { component.ngOnDestroy(); }
});


test('hero reel takes the short continuous path across the final poster', () => {
  assert.equal(nearestReelPhase(0, 3, 4), 4);
  assert.equal(nearestReelPhase(3, 0, 4), -1);
  assert.equal(nearestReelPhase(1, 8, 4), 9);
  for (let index = 0; index < 4; index++) {
    const before = reelPose(index, 3.99, 4);
    const after = reelPose(index, 4.01, 4);
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) < .12);
    const wrapped = reelPose(index, 0, 4);
    const fullTurn = reelPose(index, 4, 4);
    assert.ok(Math.hypot(wrapped.x - fullTurn.x, wrapped.z - fullTurn.z) < 1e-10);
  }
});


test('the first catalog response renders while slower shelves are still pending', () => {
  const films = new Subject<any>(); const shows = new Subject<any>();
  const { component } = fixture({ getPopularMovies: () => films, getPopularTv: () => shows,
    getPopularAnime: () => of({ results: [] }), getTopRatedMovies: () => of({ results: [] }), discoverMoviesByGenre: () => of({ results: [] }) });
  try {
    assert.equal(component.discoveryLoading, true);
    films.next({ results: [film(17)] }); films.complete();
    assert.equal(component.discoveryLoading, false);
    assert.equal(component.featuredMovie?.id, 17);
    assert.equal(component.contentRows[0].movies[0].id, 17);
    shows.error(new Error('offline'));
    assert.equal(component.discoveryError, false);
    assert.equal(component.featuredMovie?.id, 17);
  } finally { component.ngOnDestroy(); }
});

test('every referenced UI icon has an embedded SVG definition without a font request', () => {
  function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : /\.(html|ts)$/.test(entry.name) ? [join(directory, entry.name)] : []);
  }
  const css = readFileSync('src/assets/icons/icons.css', 'utf8');
  const names = new Set(sourceFiles('src/app').flatMap(file => readFileSync(file, 'utf8').match(/\bfa-[a-z0-9-]+/g) || []));
  for (const name of names) assert.ok(css.includes('.' + name + '{--icon:'), `Missing SVG for ${name}`);
  assert.ok(css.includes('data:image/svg+xml,'));
  assert.ok(!css.includes('@font-face'));
  assert.ok(readFileSync('src/styles.css', 'utf8').includes("@import './assets/icons/icons.css'"));
});

test('embed URLs use the documented episode path and preserve resume position', () => {
  const movie = new URL(buildEmbedUrl('https://vidsrc.sh', 'movie', '157336')!);
  assert.equal(movie.pathname, '/embed/movie/157336');
  const episode = new URL(buildEmbedUrl('https://vidsrc.sh', 'tv', '1399', 2, 4, 135.5)!);
  assert.equal(episode.pathname, '/embed/tv/1399/2/4');
  assert.equal(episode.searchParams.get('startAt'), '135');
  assert.equal(episode.searchParams.get('autonext'), '0');
  assert.equal(buildEmbedUrl('https://vidsrc.sh', 'tv', '1399', -1, 4), null);
  assert.equal(buildEmbedUrl('https://vidsrc.sh', 'movie', '../invalid'), null);
});

test('documented player events update progress only from the active frame', () => {
  const player = new MoviePlayerComponent({} as any, {} as any, {} as any, {} as any, {} as any);
  const source = {};
  player.videoIframe = { nativeElement: { src: 'https://vidsrc.sh/embed/movie/157336', contentWindow: source } } as any;
  const data = { type: 'PLAYER_EVENT', data: { player_status: 'playing', player_progress: 125, player_duration: 7200 } };
  player.handleIframeMessage({ origin: 'https://untrusted.example', source, data } as any);
  assert.equal(player.videoCurrentTime, 0);
  player.handleIframeMessage({ origin: 'https://vidsrc.sh', source, data } as any);
  assert.equal(player.videoCurrentTime, 125);
  assert.equal(player.videoDuration, 7200);
  assert.equal(player.playerConnecting, false);
});

test('alternate player keeps the selected title and episode', () => {
  const player = new MoviePlayerComponent({} as any, {} as any, {} as any, {} as any, {} as any);
  player.movieId = '1399'; player.mediaType = 'tv'; player.season = 3; player.episode = 5; player.videoCurrentTime = 240;
  let reloads = 0; player.reloadPlayer = () => { reloads++; };
  player.tryAlternatePlayer();
  assert.equal(player.playerSourceIndex, 1); assert.equal(reloads, 1);
  assert.equal(player.movieId, '1399'); assert.equal(player.season, 3); assert.equal(player.episode, 5); assert.equal(player.videoCurrentTime, 240);
});

test('failed cross-season navigation preserves the current episode and can be retried', () => {
  let failed = true;
  const navigations: any[] = [];
  const player = new MoviePlayerComponent({} as any, { navigate: (...args: any[]) => navigations.push(args) } as any, {} as any,
    { getTvSeasonDetails: () => failed ? throwError(() => new Error('offline')) : of({ episodes: [{ episode_number: 7 }] }) } as any, {} as any);
  player.movieId = '1'; player.mediaType = 'tv'; player.mediaDetails = {};
  player.season = 3; player.episode = 1; player.allSeasons = [1, 3];
  player.playPreviousEpisode();
  assert.equal(player.season, 3); assert.equal(player.episode, 1);
  assert.equal(player.episodeNavigationPending, false);
  assert.equal(navigations.length, 0);
  assert.match(player.playerFeedback, /could not load/);
  failed = false;
  player.playPreviousEpisode();
  assert.equal(player.season, 1); assert.equal(player.episode, 7);
  assert.equal(navigations.length, 1);
});

test('empty next seasons do not change playback or navigate to a nonexistent episode', () => {
  const player = new MoviePlayerComponent({} as any, { navigate: () => assert.fail('must not navigate') } as any, {} as any,
    { getTvSeasonDetails: () => of({ episodes: [] }) } as any, {} as any);
  player.movieId = '1'; player.mediaType = 'tv'; player.mediaDetails = {};
  player.season = 1; player.episode = 8; player.totalEpisodesInSeason = 8; player.allSeasons = [1, 2];
  player.playNextEpisode();
  assert.equal(player.season, 1); assert.equal(player.episode, 8);
  assert.equal(player.episodeNavigationPending, false);
  assert.match(player.playerFeedback, /No episodes/);
});

test('guide retry restores active-season navigation and rejects invalid episode selections', () => {
  const player = new MoviePlayerComponent({} as any, {} as any, {} as any,
    { getTvSeasonDetails: () => of({ episodes: [{ episode_number: 1, name: 'One' }, { episode_number: 2, name: 'Two' }] }) } as any, {} as any);
  player.movieId = '1'; player.mediaType = 'tv'; player.mediaDetails = {};
  player.season = 1; player.episode = 1; player.guideError = true;
  player.loadGuideSeason(1);
  assert.equal(player.guideError, false);
  assert.equal(player.currentEpisode.name, 'One');
  assert.equal(player.hasNextEpisode(), true);
  let selected = 0; player.playEpisode = value => { selected = value; };
  player.playGuideEpisode(99); assert.equal(selected, 0);
  player.playGuideEpisode(1); assert.equal(selected, 0);
  player.playGuideEpisode(2); assert.equal(selected, 2);
});
