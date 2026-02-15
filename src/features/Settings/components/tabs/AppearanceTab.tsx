import Settings, { Theme } from "../../../../types/backend/model/settings";
import { FormRows } from "../../../../components/Form/Form";
import { TabProps } from "../../types/tabProps";
import Select from "../../../../components/Select/Select";

export default function AppearanceTab({ state, setState }: TabProps) {
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
						label: "Theme",
						labelHtmlFor: "theme",
						children: (
							<Select
								currentValue={state.localSettings?.theme}
								id="theme"
								onChangeValue={value =>
									updateSettings({
										theme: value as Theme,
									})
								}
								options={[
									{
										value: "FollowSystem",
										label: "Follow system",
									},
									{
										value: "Light",
										label: "Light",
									},
									{
										value: "Dark",
										label: "Dark",
									},
								]}
								autoFocus
							/>
						),
					},
					{
						label: "Zoom (%)",
						labelHtmlFor: "zoom",
						children: (
							<input
								id="zoom"
								type="number"
								value={state.localSettings.zoomPercentage}
								onChange={e =>
									updateSettings({
										zoomPercentage: Number(e.target.value),
									})
								}
							/>
						),
					},
				]}
			/>
		)
	);
}
