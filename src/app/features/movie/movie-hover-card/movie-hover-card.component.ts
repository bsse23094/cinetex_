import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Movie } from '../../../core/models/movie.model';
import { BackdropUrlPipe } from '../../../shared/pipes/backdrop-url.pipe';

// TMDB genre ID to name mapping
const GENRE_MAP: { [key: number]: string } = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    // TV genres
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics'
};

@Component({
    selector: 'app-movie-hover-card',
    templateUrl: './movie-hover-card.component.html',
    styleUrls: ['./movie-hover-card.component.css'],
    standalone: true,
    imports: [CommonModule, BackdropUrlPipe]
})
export class MovieHoverCardComponent implements OnInit, AfterViewInit {
    @Input() movie!: Movie;
    @Input() position!: { top: number; left: number; width: number };
    @Input() containerWidth!: number;

    @Output() play = new EventEmitter<void>();
    @Output() addToList = new EventEmitter<void>();
    @Output() rate = new EventEmitter<void>();
    @Output() close = new EventEmitter<void>();

    @ViewChild('card') cardRef!: ElementRef;

    adjustedLeft = 0;
    adjustedTop = 0;
    scaleOrigin = 'center top';
    isVisible = false;

    constructor() { }

    ngOnInit() {
        this.calculatePosition();
    }

    ngAfterViewInit() {
        // Small delay to trigger animation after render
        requestAnimationFrame(() => {
            setTimeout(() => this.isVisible = true, 20);
        });
    }

    calculatePosition() {
        const CARD_WIDTH = 380;
        const CARD_HEIGHT = 340; // Approximate height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // position.top and position.left are from getBoundingClientRect() 
        // which are already viewport-relative, no need to adjust for scroll
        const itemCenterX = this.position.left + (this.position.width / 2);
        const itemTopViewport = this.position.top;

        // Initial positioning: center horizontally over item
        let targetLeft = itemCenterX - (CARD_WIDTH / 2);

        // Edge detection with padding
        const padding = 16;

        if (targetLeft < padding) {
            targetLeft = padding;
            this.scaleOrigin = 'left top';
        } else if (targetLeft + CARD_WIDTH > viewportWidth - padding) {
            targetLeft = viewportWidth - CARD_WIDTH - padding;
            this.scaleOrigin = 'right top';
        } else {
            this.scaleOrigin = 'center top';
        }

        // Vertical positioning: align card top with item top, but ensure it fits in viewport
        let targetTop = itemTopViewport;

        // If card would go off bottom of viewport, move it up
        if (targetTop + CARD_HEIGHT > viewportHeight - padding) {
            targetTop = viewportHeight - CARD_HEIGHT - padding;
            this.scaleOrigin = this.scaleOrigin.replace('top', 'bottom');
        }

        // If card would go off top of viewport, move it down
        if (targetTop < padding) {
            targetTop = padding;
        }

        this.adjustedLeft = targetLeft;
        this.adjustedTop = targetTop;
    }

    // Get formatted runtime
    get formattedRuntime(): string {
        const movie = this.movie as any;
        if (movie.runtime) {
            const hours = Math.floor(movie.runtime / 60);
            const minutes = movie.runtime % 60;
            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
        // For TV shows, use episode_run_time if available
        if (movie.episode_run_time && movie.episode_run_time.length > 0) {
            const avg = movie.episode_run_time[0];
            return `${avg}m per ep`;
        }
        // Default based on media type
        if (movie.media_type === 'tv' || movie.first_air_date) {
            return 'TV Series';
        }
        return '';
    }

    // Get age rating (certification)
    get ageRating(): string {
        const movie = this.movie as any;
        // Only show if we have actual certification data
        if (movie.certification) {
            return movie.certification;
        }
        if (movie.adult) {
            return '18+';
        }
        // Don't show any rating if we don't have data
        return '';
    }

    // Get quality badge
    get qualityBadge(): string {
        // Check if movie is recent and popular
        const movie = this.movie as any;
        const releaseDate = movie.release_date || movie.first_air_date;
        if (releaseDate) {
            const year = new Date(releaseDate).getFullYear();
            if (year >= 2020) {
                return 'HD';
            }
        }
        return movie.vote_average >= 8 ? 'HD' : 'SD';
    }

    // Get genres from genre_ids or genres array
    get genres(): string[] {
        const movie = this.movie as any;

        // If we have full genre objects (from details endpoint)
        if (movie.genres && Array.isArray(movie.genres)) {
            return movie.genres.slice(0, 3).map((g: any) => g.name);
        }

        // If we have genre_ids (from list endpoints)
        if (movie.genre_ids && Array.isArray(movie.genre_ids)) {
            return movie.genre_ids
                .slice(0, 3)
                .map((id: number) => GENRE_MAP[id] || 'Unknown')
                .filter((name: string) => name !== 'Unknown');
        }

        // Fallback based on vote average mood
        if (movie.vote_average >= 8) {
            return ['Critically Acclaimed'];
        }
        return ['Popular'];
    }

    // Get movie title (handles both movies and TV shows)
    get title(): string {
        return this.movie.title || this.movie.name || '';
    }
}
