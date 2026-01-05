import Settings, { Theme } from "../../../../types/backend/model/settings";
import { FormRows } from "../../../../components/Form/Form";
import { TabProps } from "../SettingsPopup";

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
							<select
								value={state.localSettings?.theme}
								id="theme"
								onChange={e =>
									updateSettings({
										theme: e.target.value as Theme,
									})
								}
								autoFocus>
								<option value="FollowSystem">
									Follow system
								</option>
								<option value="Light">Light</option>
								<option value="Dark">Dark</option>
							</select>
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
