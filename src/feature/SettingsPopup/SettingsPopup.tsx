import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { mdiCog, mdiFolderOpenOutline } from "@mdi/js";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import Settings, { Theme } from "../../type/backend/model/settings";
import { getSettings, updateSettings } from "../../api/settingsApi";
import useOutsideClick from "../../hooks/useOutsideClick";
import useGlobalKey from "../../hooks/useGlobalKey";
import useAppDispatch from "../../hooks/useAppDispatch";
import { fetchFiles } from "../../store/actions/fileSystemActions";
import errorToString from "../../util/errorToString";
import applySettings from "../../util/applySettings";
import { useNavigate } from "react-router";

interface Props {
	onClose: () => void;
	onError: (error: string) => void;
}

function SettingsPopup({ onClose, onError }: Props) {
	const [settings, setSettings] = useState<Settings | null>(null);
	const boxRef = useRef<HTMLFormElement>(null);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	useOutsideClick(boxRef as React.RefObject<HTMLElement>, onClose);

	useEffect(() => {
		void (async () => {
			try {
				const settings = await getSettings();
				setSettings(settings);
			} catch (e) {
				console.error(e);
				onError(errorToString(e));
			}
		})();
	}, [onError]);

	const handleChangeDatabaseLocationClick = async () => {
		let location = await open({
			defaultPath: settings?.databaseLocation,
			directory: true,
		});
		if (!location) return;

		const pathCharacer = location.includes("/") ? "/" : "\\";
		if (!location.endsWith(pathCharacer)) location += pathCharacer;
		location += "brainy.db";

		setSettings({
			...settings!,
			databaseLocation: location,
		});
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		try {
			await updateSettings({
				...settings!,
			});
			applySettings(settings!);
			await dispatch(fetchFiles());
			void navigate("/");
			onClose();
		} catch (e) {
			console.error(e);
			onError(errorToString(e));
		}
	};

	useGlobalKey((e: KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose();
		}
	});

	return (
		<div className="overlay">
			<form
				className={styles.box}
				ref={boxRef}
				onSubmit={e => void handleSubmit(e)}>
				<div className={`row ${styles.header}`}>
					<Icon path={mdiCog} size={1.2} />
					<p>Settings</p>
				</div>
				<div className={styles.settingsRows}>
					<div className={styles.settingsRow}>
						<p>Database Location:</p>
						<div className="row">
							<input
								type="text"
								value={settings?.databaseLocation ?? ""}
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
					</div>
					<div className={styles.settingsRow}>
						<p>Theme:</p>
						<select
							value={settings?.theme}
							onChange={e =>
								setSettings({
									...settings!,
									theme: e.target.value as Theme,
								})
							}>
							<option value="FollowSystem">Follow system</option>
							<option value="Light">Light</option>
							<option value="Dark">Dark</option>
						</select>
					</div>
					<div className={styles.settingsRow}>
						<p>Zoom (%):</p>
						<input
							type="number"
							value={settings?.zoomPercentage ?? ""}
							onChange={e =>
								setSettings({
									...settings!,
									zoomPercentage: Number(e.target.value),
								})
							}
							min={50}
							max={400}
						/>
					</div>
				</div>
				<div className={styles.buttons}>
					<button
						className="transparent"
						type="button"
						onClick={onClose}>
						Cancel
					</button>
					<button className="primary" type="submit">
						Save
					</button>
				</div>
			</form>
		</div>
	);
}

export default SettingsPopup;
