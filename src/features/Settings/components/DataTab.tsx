import { useNavigate } from "react-router";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { FolderOpenIcon } from "@phosphor-icons/react";
import { open } from "@tauri-apps/plugin-dialog";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import { changeDatabaseDirectory } from "../../../stores/app/appActions";

function DataTab() {
	const settings = useAppSelector(selectSettings);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	if (!settings) return null;

	async function handleChangeDirectory() {
		const selected = await open({
			directory: true,
			multiple: false,
			defaultPath: settings?.baseDatabaseDirectory,
		});

		if (typeof selected !== "string") return;

		await dispatch(changeDatabaseDirectory(selected, navigate));
	}

	return (
		<Stack gap="lg" pt="md">
			<Stack gap="xs">
				<Text size="sm">Database directory</Text>
				<Text size="xs" c="dimmed">
					Where your data is stored. Changing this reconnects the
					database.
				</Text>
				<Group align="flex-end" gap="sm" wrap="nowrap">
					<TextInput
						readOnly
						value={settings.baseDatabaseDirectory}
						style={{ flex: 1 }}
					/>
					<Button
						variant="default"
						leftSection={<FolderOpenIcon />}
						onClick={() => void handleChangeDirectory()}>
						Change…
					</Button>
				</Group>
			</Stack>
		</Stack>
	);
}

export default DataTab;
