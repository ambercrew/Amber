import { ActionIcon, Alert, Group, Menu, Stack, Text } from "@mantine/core";
import { PlusSquareIcon } from "@phosphor-icons/react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { clearTreeError } from "../../../stores/elements/elementsReducer";
import CreateElementDropDown from "./CreateElementMenuDropDown";
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
				<Menu position="bottom-end">
					<Menu.Target>
						<ActionIcon
							variant="subtle"
							size="md"
							title="New element">
							<PlusSquareIcon size={20} />
						</ActionIcon>
					</Menu.Target>
					<CreateElementDropDown elementId={null} />
				</Menu>
			</Group>
			<ElementTree tree={tree} />
		</Stack>
	);
}

export default ElementTreePanel;
