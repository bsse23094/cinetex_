import type { Movie } from '../../../core/models/movie.model';

export function reelArtworkUrls(film: Movie): string[] {
  const urls: string[] = [];
  if (film.poster_path) {
    if (film.poster_path.startsWith('http')) urls.push(film.poster_path);
    else {
      urls.push('https://image.tmdb.org/t/p/w500' + film.poster_path);
      // A separate, smaller request also avoids reusing a failed browser cache entry.
      urls.push('https://image.tmdb.org/t/p/w342' + film.poster_path + '?reel=1');
    }
  }
  if (film.backdrop_path) urls.push(film.backdrop_path.startsWith('http')
    ? film.backdrop_path : 'https://image.tmdb.org/t/p/w780' + film.backdrop_path + '?reel=1');
  return [...new Set(urls)];
}

interface DisposableArtwork { dispose(): void; }
interface ArtworkLoader<T> {
  load(url: string, loaded: (texture: T) => void, progress: undefined, failed: () => void): unknown;
}

/** Failed or stalled requests must not strand a reel frame; discard late results after navigation. */
export async function loadReelArtwork<T extends DisposableArtwork>(
  urls: string[], loader: ArtworkLoader<T>, isCurrent: () => boolean, timeoutMs = 6000
): Promise<T | undefined> {
  for (const url of urls) {
    if (!isCurrent()) return undefined;
    const texture = await new Promise<T | undefined>(resolve => {
      let settled = false;
      const finish = (value?: T) => {
        if (settled) { value?.dispose(); return; }
        settled = true;
        clearTimeout(timer);
        if (!isCurrent()) { value?.dispose(); resolve(undefined); }
        else resolve(value);
      };
      const timer = setTimeout(() => finish(), timeoutMs);
      try { loader.load(url, value => finish(value), undefined, () => finish()); }
      catch { finish(); }
    });
    if (texture) return texture;
  }
  return undefined;
}
