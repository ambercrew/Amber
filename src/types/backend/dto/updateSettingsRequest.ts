import { Theme } from "../model/settings";

export default interface UpdateSettingsRequest {
	databaseLocation: string | null;
	theme: Theme | null;
	zoomPercentage: number | null;
	autoSync: boolean | null;

	enableAi: boolean | null;
	ollamaModelName: string | null;
	ollamaEmbeddingsModelName: string | null;
}
