import { Theme } from "../dto/updateSettingsRequestDto";

export default interface UpdateSettingsRequest {
	baseDatabaseDirectory: string | null;

	theme: Theme | null;
	zoomPercentage: number | null;
	autoSync: boolean | null;

	enableAi: boolean | null;
	ollamaModelName: string | null;
	ollamaEmbeddingsModelName: string | null;
}
