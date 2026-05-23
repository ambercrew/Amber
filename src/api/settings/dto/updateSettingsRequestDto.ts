export type Theme = "FollowSystem" | "Light" | "Dark";
export type AiProvider = "ollama" | "openAI";

export interface AiProviderSettings {
	modelName: string | null;
	embeddingsModelName: string | null;
}

export default interface UpdateSettingsRequestDto {
	baseDatabaseDirectory: string;

	theme: Theme;
	zoomPercentage: number;
	autoSync: boolean;

	enableAi: boolean;
	aiProvider: AiProvider;
	ollama: AiProviderSettings;
	openai: AiProviderSettings;
	openaiApiKeyIsSet: boolean;
}
