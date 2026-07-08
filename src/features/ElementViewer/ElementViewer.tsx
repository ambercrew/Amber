import { useCallback, useEffect, useRef } from "react";
import { Container } from "@mantine/core";
import CardElementViewer from "./CardElementViewer";
import ElementEditor from "./ElementEditor";
import FolderView from "./FolderView";
import useAppSelector from "../../hooks/useAppSelector";
import { selectCurrentElement } from "../../stores/elements/elementsSelectors";
import {
	updateCard,
	updateExtract,
	updateReading,
} from "../../api/elements/api/elementsApi";
import { useElementViewerButtons } from "./useElementViewerButtons";
import { useHighlightCreatedHandler } from "./useHighlightCreatedHandler";

export default function ElementViewer() {
	const currentElement = useAppSelector(selectCurrentElement);
	const elementId = currentElement?.data?.meta?.elementId;
	const buttons = useElementViewerButtons();
	const handleHighlightCreated = useHighlightCreatedHandler(elementId);

	const frontContentRef = useRef("");
	const backContentRef = useRef("");

	useEffect(() => {
		if (currentElement?.type !== "card") return;
		frontContentRef.current = currentElement.data.front;
		backContentRef.current = currentElement.data.back;
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only reset refs when navigating to a different card
	}, [elementId?.id]);

	const handleChange = useCallback(
		async (content: string) => {
			if (!elementId) return;

			if (elementId.type === "reading") {
				await updateReading({ id: elementId.id, content });
			} else if (elementId.type === "extract") {
				await updateExtract({ id: elementId.id, content });
			}
		},
		[elementId],
	);

	const handleFrontChange = useCallback(
		async (content: string) => {
			if (elementId?.type !== "card") return;
			frontContentRef.current = content;
			await updateCard({
				id: elementId.id,
				front: content,
				back: backContentRef.current,
			});
		},
		[elementId],
	);

	const handleBackChange = useCallback(
		async (content: string) => {
			if (elementId?.type !== "card") return;
			backContentRef.current = content;
			await updateCard({
				id: elementId.id,
				front: frontContentRef.current,
				back: content,
			});
		},
		[elementId],
	);

	if (!currentElement || !elementId || currentElement.type === "folder") {
		return <FolderView />;
	}

	if (currentElement.type === "card") {
		return (
			<CardElementViewer
				elementId={elementId}
				card={currentElement.data}
				buttons={buttons}
				onFrontChange={handleFrontChange}
				onBackChange={handleBackChange}
				onHighlightCreated={handleHighlightCreated}
			/>
		);
	}

	const initialContent =
		currentElement.type === "reading" || currentElement.type === "extract"
			? currentElement.data.content
			: "";

	return (
		<Container size="sm" py="lg">
			<ElementEditor
				key={`${elementId.type}-${elementId.id}`}
				initialContent={initialContent}
				buttons={buttons}
				onChange={handleChange}
				onHighlightCreated={handleHighlightCreated}
				autoFocus
			/>
		</Container>
	);
}
