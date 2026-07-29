import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";
import { Loader, Stack, Text } from "@mantine/core";
import AppModal from "../../../components/AppModal/AppModal";
import { isStoreInstalled } from "../../../api/appInfo/api/appInfoApi";
import useApi from "../../../hooks/useApi";

function Updater() {
	const { callApi, errorMessage, clearErrorMessage } = useApi();

	const [isUpdating, setIsUpdating] = useState(false);
	const [updatePercentage, setUpdatePercentage] = useState("0");

	useEffect(() => {
		void callApi(
			async () => {
				if (await isStoreInstalled()) return;

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
							break;
					}
				});

				// eslint-disable-next-line no-alert
				alert("Restarting the application to install the update!");
				await relaunch();
			},
			() => {
				setIsUpdating(false);
				return Promise.resolve();
			},
		);
	}, [callApi]);

	return (
		<>
			<AppModal
				opened={isUpdating}
				onClose={() => {
					/* Empty */
				}}
				withCloseButton={false}
				closeOnClickOutside={false}
				closeOnEscape={false}>
				<Stack align="center">
					<Loader size="lg" />
					<Text>
						Updating the application ({updatePercentage}%), please
						wait...
					</Text>
				</Stack>
			</AppModal>

			<AppModal
				opened={!!errorMessage}
				onClose={clearErrorMessage}
				title="Update failed">
				<Text>{errorMessage}</Text>
			</AppModal>
		</>
	);
}

export default Updater;
