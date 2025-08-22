// poster-url.pipe.ts
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: 'posterUrl', standalone: true })
export class PosterUrlPipe implements PipeTransform {
    transform(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w185'): string {
        console.log('Poster path received:', path); // Debug log
        // Fallback for missing paths
        if (!path) {
            console.log('Using fallback image'); // Debug log
            return 'assets/no-poster.jpg';
        }

        // If the API already returned a full URL (rare), use it directly
        if (path.startsWith('http://') || path.startsWith('https://')) {
            console.log('Using full URL from API:', path);
            return path;
        }

        // Ensure leading slash
        const normalized = path.startsWith('/') ? path : `/${path}`;
        const url = `https://image.tmdb.org/t/p/${size}${normalized}`;
        console.log('Generated URL:', url); // Debug log
        return url;
    }
}