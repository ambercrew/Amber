import { Menu } from "@mantine/core";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { ElementId } from "../../../../types/elements/elementId";
import CreateElementDropDown from "../CreateElementMenuDropDown";

function ElementTreeMenuItems({
	elementId,
	onRenameClick,
	onDeleteClick,
	onAfterCreate,
}: {
	elementId: ElementId;
	onRenameClick: () => void;
	onDeleteClick: () => void;
	onAfterCreate: () => void;
}) {
	return (
		<>
			<Menu.Sub openDelay={120} closeDelay={150}>
				<Menu.Sub.Target>
					<Menu.Sub.Item leftSection={<PlusIcon size={16} />}>
						New
					</Menu.Sub.Item>
				</Menu.Sub.Target>
				<CreateElementDropDown
					elementId={elementId}
					onAfterCreate={onAfterCreate}
				/>
			</Menu.Sub>
			<Menu.Divider />
			<Menu.Item
				leftSection={<PencilSimpleIcon size={16} />}
				onClick={onRenameClick}>
				Rename
			</Menu.Item>
			<Menu.Divider />
			<Menu.Item
				leftSection={<TrashIcon size={16} />}
				color="red"
				onClick={onDeleteClick}>
				Delete
			</Menu.Item>
		</>
	);
}

export default ElementTreeMenuItems;
