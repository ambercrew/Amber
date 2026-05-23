import {
	AiProvider,
	AiProviderSettings,
	Theme,
} from "../dto/updateSettingsRequestDto";

export default interface UpdateSettingsRequest {
	baseDatabaseDirectory: string | null;

	theme: Theme | null;
	zoomPercentage: number | null;
	autoSync: boolean | null;

	enableAi: boolean | null;
	aiProvider: AiProvider | null;
	ollama: AiProviderSettings | null;
	openai: AiProviderSettings | null;
	openaiApiKey: string | null;
}
