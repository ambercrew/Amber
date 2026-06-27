import { Menu } from "@mantine/core";
import {
	BookOpenIcon,
	CardsIcon,
	FolderPlusIcon,
	PencilSimpleIcon,
	PlusIcon,
	QuotesIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { ElementId } from "../../../types/elements/elementId";
import { ElementNodeType } from "../../../types/elements/elementNodeType";

const CREATE_ITEMS: Partial<Record<ElementNodeType, React.ReactNode>> = {
	folder: (
		<>
			<Menu.Item leftSection={<FolderPlusIcon size={16} />}>
				Folder
			</Menu.Item>
			<Menu.Item leftSection={<BookOpenIcon size={16} />}>
				Reading
			</Menu.Item>
			<Menu.Item leftSection={<QuotesIcon size={16} />}>
				Extract
			</Menu.Item>
			<Menu.Item leftSection={<CardsIcon size={16} />}>Card</Menu.Item>
		</>
	),
	reading: (
		<>
			<Menu.Item leftSection={<QuotesIcon size={16} />}>
				Extract
			</Menu.Item>
			<Menu.Item leftSection={<CardsIcon size={16} />}>Card</Menu.Item>
		</>
	),
	extract: <Menu.Item leftSection={<CardsIcon size={16} />}>Card</Menu.Item>,
};

function ElementTreeMenuItems({
	elementId,
	onDeleteClick,
}: {
	elementId: ElementId;
	onDeleteClick: () => void;
}) {
	const createItems = CREATE_ITEMS[elementId.type];

	return (
		<>
			{createItems && (
				<>
					<Menu.Sub openDelay={120} closeDelay={150}>
						<Menu.Sub.Target>
							<Menu.Sub.Item leftSection={<PlusIcon size={16} />}>
								New
							</Menu.Sub.Item>
						</Menu.Sub.Target>
						<Menu.Sub.Dropdown>{createItems}</Menu.Sub.Dropdown>
					</Menu.Sub>
					<Menu.Divider />
				</>
			)}
			<Menu.Item leftSection={<PencilSimpleIcon size={16} />}>
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
