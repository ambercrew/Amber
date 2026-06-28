import { ActionIcon, Alert, Group, Stack, Text } from "@mantine/core";
import { FolderPlusIcon } from "@phosphor-icons/react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { createFolderAction } from "../../../stores/elements/elementsActions";
import { defaultElementName } from "./ElementTree/elementTreeUtils";
import { clearTreeError } from "../../../stores/elements/elementsReducer";
import {
	selectElementTree,
	selectElementTreeError,
} from "../../../stores/elements/elementsSelectors";
import ElementTree from "./ElementTree/ElementTree";

function ElementTreePanel() {
	const dispatch = useAppDispatch();
	const tree = useAppSelector(selectElementTree);
	const error = useAppSelector(selectElementTreeError);

	return (
		<Stack p="md" gap="xs">
			{error && (
				<Alert
					color="red"
					title={error}
					withCloseButton
					onClose={() => dispatch(clearTreeError())}
				/>
			)}
			<Group justify="space-between" align="center">
				<Text size="sm" fw={600} c="dimmed" tt="uppercase">
					Folders
				</Text>
				<ActionIcon
					variant="subtle"
					size="md"
					title="New root folder"
					onClick={() =>
						void dispatch(
							createFolderAction({
								name: defaultElementName("Folder"),
								position: Date.now(),
								parentFolderId: null,
							}),
						)
					}>
					<FolderPlusIcon size={20} />
				</ActionIcon>
			</Group>
			<ElementTree tree={tree} />
		</Stack>
	);
}

export default ElementTreePanel;
