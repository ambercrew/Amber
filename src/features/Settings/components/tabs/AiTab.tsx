import { FormRows } from "../../../../components/Form/Form";
import CheckBox from "../../../../components/Checkbox/Checkbox";
import Settings from "../../../../types/backend/model/settings";
import { TabProps } from "../../types/tabProps";

export default function AiTab({ state, setState }: TabProps) {
	const updateSettings = (newSettings: Partial<Settings>) => {
		setState({
			...state,
			localSettings: {
				...state.localSettings!,
				...newSettings,
			},
		});
	};

	return (
		state.localSettings && (
			<FormRows
				rows={[
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
							/>
						),
					},
					{
						label: "Ollama model name",
						labelHtmlFor: "ollama-model-name",
						children: (
							<input
								id="ollama-model-name"
								type="text"
								value={
									state.localSettings.ollamaModelName ?? ""
								}
								onChange={e =>
									updateSettings({
										ollamaModelName: e.target.value,
									})
								}
								autoFocus
							/>
						),
					},
					{
						label: "Ollama embeddings model name",
						labelHtmlFor: "ollama-embeddings-model-name",
						children: (
							<input
								id="ollama-embeddings-model-name"
								type="text"
								value={
									state.localSettings
										.ollamaEmbeddingsModelName ?? ""
								}
								onChange={e =>
									updateSettings({
										ollamaEmbeddingsModelName:
											e.target.value,
									})
								}
								autoFocus
							/>
						),
					},
				]}
			/>
		)
	);
}
