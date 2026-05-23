import { FormRows, FormRowsProps } from "../../../../components/Form/Form";
import CheckBox from "../../../../components/Checkbox/Checkbox";
import Select from "../../../../components/Select/Select";
import UpdateSettingsRequestDto, {
	AiProvider,
} from "../../../../api/settings/dto/updateSettingsRequestDto";
import { TabProps } from "../../types/tabProps";

interface AiProviderOption {
	label: string;
	value: AiProvider;
}

interface TextInputConfig {
	id: string;
	label: string;
	placeholder?: string;
	value: string | null;
	onChange: (value: string) => void;
}

interface ApiKeyConfig {
	id: string;
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
}

interface ProviderRowsConfig {
	modelName: TextInputConfig;
	embeddingsModelName: TextInputConfig;
	apiKey?: ApiKeyConfig;
}

const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
	{ label: "Ollama", value: "ollama" },
	{ label: "OpenAI", value: "openAI" },
];

function buildProviderRows(config: ProviderRowsConfig): FormRowsProps["rows"] {
	const rows: FormRowsProps["rows"] = [
		{
			label: config.modelName.label,
			labelHtmlFor: config.modelName.id,
			children: (
				<input
					id={config.modelName.id}
					type="text"
					placeholder={config.modelName.placeholder}
					value={config.modelName.value ?? ""}
					onChange={e => config.modelName.onChange(e.target.value)}
				/>
			),
		},
		{
			label: config.embeddingsModelName.label,
			labelHtmlFor: config.embeddingsModelName.id,
			children: (
				<input
					id={config.embeddingsModelName.id}
					type="text"
					placeholder={config.embeddingsModelName.placeholder}
					value={config.embeddingsModelName.value ?? ""}
					onChange={e =>
						config.embeddingsModelName.onChange(e.target.value)
					}
				/>
			),
		},
	];

	if (config.apiKey) {
		const apiKey = config.apiKey;
		rows.push({
			label: apiKey.label,
			labelHtmlFor: apiKey.id,
			children: (
				<input
					id={apiKey.id}
					type="password"
					placeholder={apiKey.placeholder}
					value={apiKey.value}
					onChange={e => apiKey.onChange(e.target.value)}
				/>
			),
		});
	}

	return rows;
}

export default function AiTab({ state, setState }: TabProps) {
	const updateSettings = (newSettings: Partial<UpdateSettingsRequestDto>) => {
		setState({
			...state,
			localSettings: {
				...state.localSettings!,
				...newSettings,
			},
		});
	};

	if (!state.localSettings) return;

	const aiProvider = state.localSettings.aiProvider;

	const formProps: FormRowsProps = {
		rows: [
			{
				label: "Enable AI",
				labelHtmlFor: "enable-ai",
				children: (
					<CheckBox
						id="enable-ai"
						checked={state.localSettings.enableAi}
						onChange={e =>
							updateSettings({
								enableAi: e.target.checked,
							})
						}
						autoFocus
					/>
				),
			},
			{
				label: "AI provider",
				labelHtmlFor: "ai-provider",
				children: (
					<Select
						id="ai-provider"
						options={AI_PROVIDER_OPTIONS}
						currentValue={aiProvider}
						onChangeValue={v =>
							updateSettings({
								aiProvider: v as AiProvider,
							})
						}
					/>
				),
			},
		],
	};

	if (aiProvider === "ollama") {
		formProps.rows = formProps.rows.concat(
			buildProviderRows({
				modelName: {
					id: "ollama-model-name",
					label: "Ollama model name",
					placeholder: "e.g. qwen3:8b",
					value: state.localSettings.ollama.modelName,
					onChange: value =>
						updateSettings({
							ollama: {
								...state.localSettings!.ollama,
								modelName: value,
							},
						}),
				},
				embeddingsModelName: {
					id: "ollama-embeddings-model-name",
					label: "Ollama embeddings model name",
					placeholder: "e.g. qwen3-embedding:4b",
					value: state.localSettings.ollama.embeddingsModelName,
					onChange: value =>
						updateSettings({
							ollama: {
								...state.localSettings!.ollama,
								embeddingsModelName: value,
							},
						}),
				},
			}),
		);
	} else if (aiProvider === "openAI") {
		formProps.rows = formProps.rows.concat(
			buildProviderRows({
				modelName: {
					id: "openai-model-name",
					label: "OpenAI model name",
					placeholder: "e.g. gpt-5.4-mini",
					value: state.localSettings.openai.modelName,
					onChange: value =>
						updateSettings({
							openai: {
								...state.localSettings!.openai,
								modelName: value,
							},
						}),
				},
				embeddingsModelName: {
					id: "openai-embeddings-model-name",
					label: "OpenAI embeddings model name",
					placeholder: "e.g. text-embedding-3-small",
					value: state.localSettings.openai.embeddingsModelName,
					onChange: value =>
						updateSettings({
							openai: {
								...state.localSettings!.openai,
								embeddingsModelName: value,
							},
						}),
				},
				apiKey: {
					id: "openai-api-key",
					label: "OpenAI API key",
					placeholder: state.localSettings.openaiApiKeyIsSet
						? "API key is set"
						: "",
					value: state.openaiApiKey ?? "",
					onChange: value =>
						setState({ ...state, openaiApiKey: value }),
				},
			}),
		);
	}

	return <FormRows {...formProps} />;
}
