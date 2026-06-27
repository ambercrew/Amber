import { Menu } from "@mantine/core";
import {
	BookOpenIcon,
	FolderPlusIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { ElementNodeType } from "../../../types/elements/elementNodeType";

function ElementTreeMenuItems({ type }: { type: ElementNodeType }) {
	return (
		<>
			{type === "folder" && (
				<>
					<Menu.Item leftSection={<FolderPlusIcon size={16} />}>
						New Folder
					</Menu.Item>
					<Menu.Item leftSection={<BookOpenIcon size={16} />}>
						New Reading
					</Menu.Item>
					<Menu.Divider />
				</>
			)}
			<Menu.Item leftSection={<PencilSimpleIcon size={16} />}>
				Rename
			</Menu.Item>
			<Menu.Divider />
			<Menu.Item leftSection={<TrashIcon size={16} />} color="red">
				Delete
			</Menu.Item>
		</>
	);
}

export default ElementTreeMenuItems;
