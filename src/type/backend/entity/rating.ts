export type Rating = "Again" | "Hard" | "Good" | "Easy";

export default interface Review {
	id: number;
	cellId: number;
	date: string;
	rating: Rating;
}
