// backdrop-url.pipe.ts
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: 'backdropUrl', standalone: true })
export class BackdropUrlPipe implements PipeTransform {
    transform(path: string | null | undefined, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'): string {
        // Fallback for missing paths
        if (!path) {
            return 'assets/no-poster.jpg';
        }

        // If the API already returned a full URL (rare), use it directly
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        // Ensure leading slash
        const normalized = path.startsWith('/') ? path : `/${path}`;
        const url = `https://image.tmdb.org/t/p/${size}${normalized}`;
        return url;
    }
}
