export interface Movie {
    id : number;
    title: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
    overview?: string;
    tagline?: string;
    homepage?: string;
    backdrop_path?: string | null;
    vote_count?: number;
    production_companies?: { id: number; name: string; logo_path: string | null }[];
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