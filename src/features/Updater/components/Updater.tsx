import styles from "./styles.module.css";
import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";
import Dialog from "../../../components/Dialog/Dialog";
import Spinner from "../../../components/Spinner/Spinner";

function Updater() {
	const [isUpdating, setIsUpdating] = useState(false);
	const [updatePercentage, setUpdatePercentage] = useState("0");

	useEffect(() => {
		void (async () => {
			const update = await check();
			if (!update) return;

			const confirm = await ask(
				"Do you want to update the application to the latest version?",
			);
			if (!confirm) return;

			setIsUpdating(true);

			let downloaded = 0;
			let contentLength = 0;
			await update.downloadAndInstall(event => {
				switch (event.event) {
					case "Started":
						contentLength = event.data.contentLength ?? 0;
						break;
					case "Progress":
						downloaded += event.data.chunkLength;
						setUpdatePercentage(
							((100 * downloaded) / contentLength).toFixed(1),
						);
						break;
					case "Finished":
						console.log("Download finished");
						break;
				}
			});

			alert("Restarting the application to install the update!");
			await relaunch();
		})();
	}, []);

	return (
		<>
			{isUpdating && (
				<Dialog focusTrap={false}>
					<div
						className={`${styles.box}`}
						onClick={e => e.stopPropagation()}>
						<p>
							Updating the application ({updatePercentage}%),
							please wait...
						</p>
						<Spinner />
					</div>
				</Dialog>
			)}
		</>
	);
}

export default Updater;
