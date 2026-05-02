export type Theme = "FollowSystem" | "Light" | "Dark";

export default interface UpdateSettingsRequestDto {
	baseDatabaseDirectory: string;

	theme: Theme;
	zoomPercentage: number;
	autoSync: boolean;

	enableAi: boolean;
	ollamaModelName: string | null;
	ollamaEmbeddingsModelName: string | null;
}
