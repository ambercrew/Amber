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
import { useDispatch } from "react-redux";
import {
	createCardAction,
	createExtractAction,
	createFolderAction,
	createReadingAction,
} from "../../../../stores/elements/elementsActions";
import { AppDispatch } from "../../../../stores/store";
import { ElementId } from "../../../../types/elements/elementId";

import { defaultElementName } from "./elementTreeUtils";

function useCreateHandlers(elementId: ElementId, onAfterCreate: () => void) {
	const dispatch = useDispatch<AppDispatch>();

	function run(action: (dispatch: AppDispatch) => Promise<void>) {
		void (async () => {
			await dispatch(action);
			onAfterCreate();
		})();
	}

	return {
		folder: () =>
			run(
				createFolderAction({
					meta: {
						name: defaultElementName("Folder"),
						parent: elementId,
					},
				}),
			),
		reading: () =>
			run(
				createReadingAction({
					meta: {
						name: defaultElementName("Reading"),
						parent: elementId,
					},
					source: { type: "clipboard" },
					body: "",
				}),
			),
		extract: () =>
			run(
				createExtractAction({
					meta: {
						name: defaultElementName("Extract"),
						parent: elementId,
					},
					text: "",
				}),
			),
		card: () =>
			run(
				createCardAction({
					meta: {
						name: defaultElementName("Card"),
						parent: elementId,
					},
					front: "",
					back: "",
				}),
			),
	};
}

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
	const handlers = useCreateHandlers(elementId, onAfterCreate);

	return (
		<>
			<Menu.Sub openDelay={120} closeDelay={150}>
				<Menu.Sub.Target>
					<Menu.Sub.Item leftSection={<PlusIcon size={16} />}>
						New
					</Menu.Sub.Item>
				</Menu.Sub.Target>
				<Menu.Sub.Dropdown>
					<Menu.Item
						leftSection={<FolderPlusIcon size={16} />}
						onClick={handlers.folder}>
						Folder
					</Menu.Item>
					<Menu.Item
						leftSection={<BookOpenIcon size={16} />}
						onClick={handlers.reading}>
						Reading
					</Menu.Item>
					<Menu.Item
						leftSection={<QuotesIcon size={16} />}
						onClick={handlers.extract}>
						Extract
					</Menu.Item>
					<Menu.Item
						leftSection={<CardsIcon size={16} />}
						onClick={handlers.card}>
						Card
					</Menu.Item>
				</Menu.Sub.Dropdown>
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
