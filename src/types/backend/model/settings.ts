export type Theme = "FollowSystem" | "Light" | "Dark";

export default interface Settings {
	databaseLocation: string;
	theme: Theme;
	zoomPercentage: number;
}
