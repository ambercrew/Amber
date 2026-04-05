import { open } from "@tauri-apps/plugin-dialog";
import { FormRows, FormRowsProps } from "../../../../components/Form/Form";
import CheckBox from "../../../../components/Checkbox/Checkbox";
import Icon from "@mdi/react";
import { mdiFolderOpenOutline } from "@mdi/js";
import Settings from "../../../../types/backend/model/settings";
import { TabProps } from "../../types/tabProps";
import { isMobile } from "../../../../utils/tauriUtils";

export default function DataTab({ state, setState }: TabProps) {
	const updateSettings = (newSettings: Partial<Settings>) => {
		setState({
			...state,
			localSettings: {
				...state.localSettings!,
				...newSettings,
			},
		});
	};

	const handleChangeDatabaseLocationClick = async () => {
		let location = await open({
			defaultPath: state.localSettings?.databaseLocation,
			directory: true,
		});
		if (!location) return;

		const pathCharacter = location.includes("/") ? "/" : "\\";
		if (!location.endsWith(pathCharacter)) location += pathCharacter;
		location += "brainy.db";

		updateSettings({
			databaseLocation: location,
		});
	};

	const formRowsProps: FormRowsProps = {
		rows: [
			{
				label: "Sync on startup and on close",
				labelHtmlFor: "auto-sync",
				children: (
					<CheckBox
						id="auto-sync"
						checked={state.localSettings?.autoSync}
						onChange={e =>
							updateSettings({
								autoSync: e.target.checked,
							})
						}
					/>
				),
			},
		],
	};

	if (!isMobile()) {
		formRowsProps.rows.push({
			label: "Database Location",
			labelHtmlFor: "database-location",
			children: (
				<div className="row">
					<input
						id="database-location"
						type="text"
						value={state.localSettings?.databaseLocation}
						style={{ width: "100%" }}
						readOnly
						autoFocus
					/>
					<button
						className="transparent"
						type="button"
						onClick={() =>
							void handleChangeDatabaseLocationClick()
						}>
						<Icon path={mdiFolderOpenOutline} size={1} />
					</button>
				</div>
			),
		});
	}

	return state.localSettings && <FormRows {...formRowsProps} />;
}
