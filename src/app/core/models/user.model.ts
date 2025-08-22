export interface User {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string | null;
	favoriteMovieIds: number[];
	lists: string[]; // list IDs
	bio?: string;
	joined: Date;
}
