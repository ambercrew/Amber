import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";
import { Loader, Modal, Stack, Text } from "@mantine/core";
import { CallApiFn } from "../../../hooks/useApi";
import { isStoreInstalled } from "../../../api/appInfo/api/appInfoApi";

interface Props {
	callApi: CallApiFn;
}

function Updater({ callApi }: Props) {
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
		<Modal
			opened={isUpdating}
			onClose={() => {
				/* Empty */
			}}
			withCloseButton={false}
			closeOnClickOutside={false}
			closeOnEscape={false}
			centered>
			<Stack align="center">
				<Loader size="lg" />
				<Text>
					Updating the application ({updatePercentage}%), please
					wait...
				</Text>
			</Stack>
		</Modal>
	);
}

export default Updater;
