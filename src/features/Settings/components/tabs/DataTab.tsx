import { open } from "@tauri-apps/plugin-dialog";
import { FormRows, FormRowsProps } from "../../../../components/Form/Form";
import CheckBox from "../../../../components/Checkbox/Checkbox";
import { Icon } from "@mdi/react";
import { mdiFolderOpenOutline } from "@mdi/js";
import UpdateSettingsRequestDto from "../../../../api/settings/dto/updateSettingsRequestDto";
import { TabProps } from "../../types/tabProps";
import { isMobile } from "../../../../utils/tauriUtils";

export default function DataTab({ state, setState }: TabProps) {
	const updateSettings = (newSettings: Partial<UpdateSettingsRequestDto>) => {
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
			defaultPath: state.localSettings?.baseDatabaseDirectory,
			directory: true,
		});
		if (!location) return;

		const pathCharacter = location.includes("/") ? "/" : "\\";
		if (!location.endsWith(pathCharacter)) location += pathCharacter;

		updateSettings({
			baseDatabaseDirectory: location,
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
						checked={state.localSettings?.autoSync ?? false}
						onChange={e =>
							updateSettings({
								autoSync: e.target.checked,
							})
						}
						autoFocus
					/>
				),
			},
		],
	};

	if (!isMobile()) {
		formRowsProps.rows.push({
			label: "Database Directory",
			labelHtmlFor: "database-directory",
			children: (
				<div className="row">
					<input
						id="database-directory"
						type="text"
						value={state.localSettings?.baseDatabaseDirectory ?? ""}
						style={{ width: "100%" }}
						readOnly
					/>
					<button
						className="transparent"
						type="button"
						onClick={() => void handleChangeDatabaseLocationClick()}
						title="Change database directory">
						<Icon path={mdiFolderOpenOutline} size={1} />
					</button>
				</div>
			),
		});
	}

	return state.localSettings && <FormRows {...formRowsProps} />;
}
