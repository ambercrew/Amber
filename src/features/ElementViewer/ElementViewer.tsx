import { useCallback, useEffect, useRef } from "react";
import { Container } from "@mantine/core";
import CardElementViewer from "./CardElementViewer";
import ContentSourcePanel from "./ContentSourcePanel";
import ElementEditor from "./ElementEditor";
import FolderView from "./FolderView";
import ReadingView from "./ReadingView/ReadingView";
import useAppSelector from "../../hooks/useAppSelector";
import { selectCurrentElement } from "../../stores/elements/elementsSelectors";
import { selectStudyStatus } from "../../stores/study/studySelectors";
import { updateCard, updateExtract } from "../../api/elements/api/elementsApi";
import { useElementViewerButtons } from "./useElementViewerButtons";
import { useHighlightCreatedHandler } from "./useHighlightCreatedHandler";

export default function ElementViewer() {
	const currentElement = useAppSelector(selectCurrentElement);
	const studyStatus = useAppSelector(selectStudyStatus);
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
			if (elementId?.type !== "extract") return;
			await updateExtract({ id: elementId.id, content });
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

	if (!currentElement || !elementId) {
		return <FolderView />;
	}

	if (currentElement.type === "folder") {
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

	if (currentElement.type === "reading") {
		return (
			<ReadingView
				key={`reading-${elementId.id}`}
				readingId={elementId.id}
				position={currentElement.data.position}
				meta={currentElement.data.meta}
				buttons={buttons}
				onHighlightCreated={handleHighlightCreated}
				autoFocus={studyStatus === "editing"}
			/>
		);
	}

	return (
		<Container size="sm" py="lg">
			<ElementEditor
				key={`${elementId.type}-${elementId.id}`}
				initialContent={currentElement.data.content}
				buttons={buttons}
				onChange={handleChange}
				onHighlightCreated={handleHighlightCreated}
				autoFocus={studyStatus === "editing"}
			/>
			<ContentSourcePanel meta={currentElement.data.meta} />
		</Container>
	);
}
