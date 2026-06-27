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
import { ElementNodeType } from "../../../../types/elements/elementNodeType";

import { defaultElementName } from "./elementTreeUtils";

function useCreateHandlers(elementId: ElementId, onAfterCreate: () => void) {
	const dispatch = useDispatch<AppDispatch>();
	const { type, id } = elementId;

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
					name: defaultElementName("Folder"),
					position: Date.now(),
					parentFolderId: type === "folder" ? id : null,
				}),
			),
		reading: () =>
			run(
				createReadingAction({
					name: defaultElementName("Reading"),
					position: Date.now(),
					folderId: id,
					source: { type: "clipboard" },
					body: "",
				}),
			),
		extract: () =>
			run(
				createExtractAction({
					name: defaultElementName("Extract"),
					position: Date.now(),
					parent: {
						type: type as "reading" | "extract" | "folder",
						id,
					},
					text: "",
				}),
			),
		card: () =>
			run(
				createCardAction({
					name: defaultElementName("Card"),
					position: Date.now(),
					parent: {
						type: type as "reading" | "extract" | "folder",
						id,
					},
					front: "",
					back: "",
				}),
			),
	};
}

const CREATE_ITEMS: Partial<
	Record<
		ElementNodeType,
		(handlers: ReturnType<typeof useCreateHandlers>) => React.ReactNode
	>
> = {
	folder: h => (
		<>
			<Menu.Item
				leftSection={<FolderPlusIcon size={16} />}
				onClick={h.folder}>
				Folder
			</Menu.Item>
			<Menu.Item
				leftSection={<BookOpenIcon size={16} />}
				onClick={h.reading}>
				Reading
			</Menu.Item>
			<Menu.Item
				leftSection={<QuotesIcon size={16} />}
				onClick={h.extract}>
				Extract
			</Menu.Item>
			<Menu.Item leftSection={<CardsIcon size={16} />} onClick={h.card}>
				Card
			</Menu.Item>
		</>
	),
	reading: h => (
		<>
			<Menu.Item
				leftSection={<QuotesIcon size={16} />}
				onClick={h.extract}>
				Extract
			</Menu.Item>
			<Menu.Item leftSection={<CardsIcon size={16} />} onClick={h.card}>
				Card
			</Menu.Item>
		</>
	),
	extract: h => (
		<Menu.Item leftSection={<CardsIcon size={16} />} onClick={h.card}>
			Card
		</Menu.Item>
	),
};

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
	const createItemsFn = CREATE_ITEMS[elementId.type];

	return (
		<>
			{createItemsFn && (
				<>
					<Menu.Sub openDelay={120} closeDelay={150}>
						<Menu.Sub.Target>
							<Menu.Sub.Item leftSection={<PlusIcon size={16} />}>
								New
							</Menu.Sub.Item>
						</Menu.Sub.Target>
						<Menu.Sub.Dropdown>
							{createItemsFn(handlers)}
						</Menu.Sub.Dropdown>
					</Menu.Sub>
					<Menu.Divider />
				</>
			)}
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
