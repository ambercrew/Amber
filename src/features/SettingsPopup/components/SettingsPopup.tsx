import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { mdiCog, mdiFolderOpenOutline } from "@mdi/js";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import Settings, { Theme } from "../../../types/backend/model/settings";
import useAppDispatch from "../../../hooks/useAppDispatch";
import errorToString from "../../../utils/errorToString";
import Dialog from "../../../components/Dialog/Dialog";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import CheckBox from "../../../components/Checkbox/Checkbox";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import { updateAndApplySettings } from "../../../stores/settings/settingsActions";

interface Props {
	onClose: () => void;
	onError: (error: string) => void;
}

function SettingsPopup({ onClose, onError }: Props) {
	const globalSettings = useAppSelector(selectSettings);
	const [settings, setSettings] = useState<Settings | null>(globalSettings);
	const dispatch = useAppDispatch();

	if (settings === null && globalSettings !== null) {
		setSettings(globalSettings);
	}

	const handleChangeDatabaseLocationClick = async () => {
		let location = await open({
			defaultPath: settings?.databaseLocation,
			directory: true,
		});
		if (!location) return;

		const pathCharacter = location.includes("/") ? "/" : "\\";
		if (!location.endsWith(pathCharacter)) location += pathCharacter;
		location += "brainy.db";

		setSettings({
			...settings!,
			databaseLocation: location,
		});
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!settings) return;

		try {
			await dispatch(updateAndApplySettings(settings));
			onClose();
		} catch (e) {
			console.error(e);
			onError(errorToString(e));
		}
	};

	return (
		<Dialog className={styles.box} onHide={onClose} focusTrap={true}>
			<Form onSubmit={e => void handleSubmit(e)}>
				<FormHeader icon={mdiCog} title="Settings" />
				{settings && (
					<FormRows
						rows={[
							{
								label: "Database Location",
								labelHtmlFor: "database-location",
								children: (
									<div className="row">
										<input
											id="database-location"
											type="text"
											value={settings.databaseLocation}
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
											<Icon
												path={mdiFolderOpenOutline}
												size={1}
											/>
										</button>
									</div>
								),
							},
							{
								label: "Theme",
								labelHtmlFor: "theme",
								children: (
									<select
										value={settings?.theme}
										id="theme"
										onChange={e =>
											setSettings({
												...settings,
												theme: e.target.value as Theme,
											})
										}>
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
										value={settings.zoomPercentage}
										onChange={e =>
											setSettings({
												...settings,
												zoomPercentage: Number(
													e.target.value,
												),
											})
										}
										min={50}
										max={400}
									/>
								),
							},
							{
								label: "Sync on startup and on close",
								labelHtmlFor: "auto-sync",
								children: (
									<div style={{ padding: "4px" }}>
										<CheckBox
											id="auto-sync"
											checked={settings.autoSync}
											onChange={e =>
												setSettings({
													...settings,
													autoSync: e.target.checked,
												})
											}
										/>
									</div>
								),
							},
						]}
					/>
				)}

				<FormButtons onClose={onClose} submitText="Save" />
			</Form>
		</Dialog>
	);
}

export default SettingsPopup;
