export interface Movie {
    id : number;
    title: string;
    name?: string; // For TV shows
    poster_path: string | null;
    release_date: string;
    first_air_date?: string; // For TV shows
    vote_average: number;
    overview?: string;
    tagline?: string;
    homepage?: string;
    backdrop_path?: string | null;
    vote_count?: number;
    production_companies?: { id: number; name: string; logo_path: string | null }[];
    media_type?: 'movie' | 'tv'; // To distinguish between movies and TV shows
}

export interface MovieDetails extends Movie {
    runtime: number;
    genres: { id: number; name: string }[];
    credits : {
        cast: { id: number; name: string; character: string; profile_path: string | null }[];
        crew: { id: number; name: string; job: string; profile_path: string | null }[];
    };
    reviews: {
        results: {
            author: string;
            content: string;
            created_at: string;
    }
}}