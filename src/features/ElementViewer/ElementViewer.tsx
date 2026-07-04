import { useCallback, useEffect, useRef } from "react";
import { Container, Divider, Group, Stack, Text } from "@mantine/core";
import { QuestionIcon, CheckCircleIcon } from "@phosphor-icons/react";
import ElementEditor from "./ElementEditor";
import useAppSelector from "../../hooks/useAppSelector";
import { selectCurrentElement } from "../../stores/elements/elementsSelectors";
import {
	updateCard,
	updateExtract,
	updateReading,
} from "../../api/elements/api/elementsApi";
import { useElementViewerButtons } from "./useElementViewerButtons";
import { useHighlightCreatedHandler } from "./useHighlightCreatedHandler";

// TODO: when creating an extract/cloze expand children of current
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

	if (!currentElement || !elementId) return;

	if (currentElement.type === "folder") return;

	if (currentElement.type === "card") {
		return (
			<Container size="sm" py="lg">
				<Stack key={`card-${elementId.id}`} gap="xl">
					<Stack gap="md">
						<Group gap="xs">
							<QuestionIcon size={18} />
							<Text size="sm" c="dimmed" tt="uppercase">
								Front
							</Text>
						</Group>
						<ElementEditor
							initialContent={currentElement.data.front}
							buttons={buttons}
							onChange={handleFrontChange}
							onHighlightCreated={handleHighlightCreated}
							autoFocus
						/>
					</Stack>
					<Divider />
					<Stack gap="md">
						<Group gap="xs">
							<CheckCircleIcon size={18} />
							<Text size="sm" c="dimmed" tt="uppercase">
								Back
							</Text>
						</Group>
						<ElementEditor
							initialContent={currentElement.data.back}
							buttons={buttons}
							onChange={handleBackChange}
							onHighlightCreated={handleHighlightCreated}
						/>
					</Stack>
				</Stack>
			</Container>
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
