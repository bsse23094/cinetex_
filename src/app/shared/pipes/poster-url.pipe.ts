// poster-url.pipe.ts
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: 'posterUrl', standalone: true })
export class PosterUrlPipe implements PipeTransform {
    transform(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w185'): string {
        // Fallback for missing paths
        if (!path) {
            return 'assets/no-poster.svg';
        }

        // If the API already returned a full URL (rare), use it directly
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        // Ensure leading slash
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `https://image.tmdb.org/t/p/${size}${normalized}`;
    }
}
