export interface MovieList {
    id : string;
    title: string;
    description?: string;
    movies: number[];
    created: Date;
    updated: Date;
    isPublic: boolean;
    isFavorite?: boolean;
    isArchived?: boolean;
    isShared?: boolean;
    sharedWith?: string[];
    userId: string;
    userName?: string;
    userAvatar?: string | null;
    totalMovies?: number;
}