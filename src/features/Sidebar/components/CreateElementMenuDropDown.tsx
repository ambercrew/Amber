import { Menu } from "@mantine/core";
import {
	BookOpenIcon,
	CardsIcon,
	FolderPlusIcon,
	QuotesIcon,
} from "@phosphor-icons/react";

import { useDispatch } from "react-redux";
import {
	createCardAction,
	createExtractAction,
	createFolderAction,
	createReadingAction,
} from "../../../stores/elements/elementsActions";
import { AppDispatch } from "../../../stores/store";
import { ElementId } from "../../../types/elements/elementId";
import { defaultElementName } from "./ElementTree/elementTreeUtils";

function useCreateHandlers(
	elementId: ElementId | null,
	onAfterCreate?: () => void,
) {
	const dispatch = useDispatch<AppDispatch>();

	function run(action: (dispatch: AppDispatch) => Promise<void>) {
		void (async () => {
			await dispatch(action);
			onAfterCreate?.();
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

export default function CreateElementDropDown({
	elementId,
	onAfterCreate,
}: {
	elementId: ElementId | null;
	onAfterCreate?: () => void;
}) {
	const handlers = useCreateHandlers(elementId, onAfterCreate);

	return (
		<Menu.Dropdown>
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
		</Menu.Dropdown>
	);
}
