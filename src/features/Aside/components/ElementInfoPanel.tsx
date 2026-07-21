import { useEffect, useState } from "react";
import { NumberInput, Stack, Text, TextInput, TagsInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useApi from "../../../hooks/useApi";
import { selectCurrentElement } from "../../../stores/elements/elementsSelectors";
import { selectStudyCounts } from "../../../stores/study/studySelectors";
import {
	updateAFactor,
	updateElementTags,
} from "../../../api/elements/api/elementsApi";
import { renameElementAction } from "../../../stores/elements/elementsActions";
import {
	getCardReview,
	getReadingReview,
} from "../../../api/study/api/studyApi";
import { CardReviewDto } from "../../../api/study/dto/cardReviewDto";
import { ReadingReviewDto } from "../../../api/study/dto/readingReviewDto";
import { AnyElementDto } from "../../../api/elements/dto/anyElementDto";
import { ElementId } from "../../../types/elements/elementId";
import ElementProfileRow from "../../Study/components/ElementProfileRow";

function formatDateTime(value: string | null): string {
	return value ? new Date(value).toLocaleString() : "—";
}

function formatNumber(value: number): string {
	return value.toFixed(2);
}

interface InfoFieldProps {
	label: string;
	children: React.ReactNode;
}

function InfoField({ label, children }: InfoFieldProps) {
	return (
		<Stack gap={2}>
			<Text size="xs" c="dimmed" fw={500}>
				{label}
			</Text>
			{children}
		</Stack>
	);
}

interface InfoGroupProps {
	title: string;
	children: React.ReactNode;
}

function InfoGroup({ title, children }: InfoGroupProps) {
	return (
		<Stack gap="sm">
			<Text size="sm" fw={600}>
				{title}
			</Text>
			{children}
		</Stack>
	);
}

interface ReviewDetailsProps {
	element: AnyElementDto;
}

function ReviewDetails({ element }: ReviewDetailsProps) {
	const { callApi } = useApi();
	const counts = useAppSelector(selectStudyCounts);
	const gradedCount = counts.cards + counts.readings;
	const [cardReview, setCardReview] = useState<CardReviewDto | null>(null);
	const [readingReview, setReadingReview] = useState<ReadingReviewDto | null>(
		null,
	);

	const elementId = element.data.meta.elementId;

	const debouncedUpdateAFactor = useDebouncedCallback(
		(id: ElementId, value: number) => updateAFactor(id, value),
		500,
	);

	useEffect(() => {
		void callApi(async () => {
			if (element.type === "card") {
				setReadingReview(null);
				setCardReview(await getCardReview(elementId.id));
			} else if (
				element.type === "reading" ||
				element.type === "extract"
			) {
				setCardReview(null);
				setReadingReview(await getReadingReview(elementId));
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [element.type, elementId.id, gradedCount]);

	if (element.type === "reading" || element.type === "extract") {
		const finished = Boolean(readingReview?.finishedAt);
		return (
			<InfoGroup title="Scheduling">
				<InfoField label="A-factor">
					<NumberInput
						key={`a-factor-${elementId.id}`}
						size="sm"
						min={0}
						step={0.1}
						decimalScale={2}
						defaultValue={element.data.aFactor}
						onChange={value => {
							if (typeof value === "number") {
								debouncedUpdateAFactor(elementId, value);
							}
						}}
					/>
				</InfoField>
				<InfoField label="Interval (days)">
					<Text size="sm">
						{readingReview
							? formatNumber(readingReview.intervalDays)
							: "—"}
					</Text>
				</InfoField>
				<InfoField label="Last reviewed">
					<Text size="sm">
						{formatDateTime(readingReview?.lastReviewed ?? null)}
					</Text>
				</InfoField>
				<InfoField label="Finished">
					<Text size="sm">
						{finished
							? `Yes · ${formatDateTime(readingReview?.finishedAt ?? null)}`
							: "No"}
					</Text>
				</InfoField>
			</InfoGroup>
		);
	}

	if (element.type === "card") {
		return (
			<InfoGroup title="Scheduling">
				<InfoField label="State">
					<Text size="sm" tt="capitalize">
						{cardReview?.state ?? "—"}
					</Text>
				</InfoField>
				<InfoField label="Due">
					<Text size="sm">
						{formatDateTime(cardReview?.due ?? null)}
					</Text>
				</InfoField>
				<InfoField label="Stability">
					<Text size="sm">
						{cardReview ? formatNumber(cardReview.stability) : "—"}
					</Text>
				</InfoField>
				<InfoField label="Difficulty">
					<Text size="sm">
						{cardReview ? formatNumber(cardReview.difficulty) : "—"}
					</Text>
				</InfoField>
				<InfoField label="Reps">
					<Text size="sm">{cardReview?.reps ?? "—"}</Text>
				</InfoField>
				<InfoField label="Lapses">
					<Text size="sm">{cardReview?.lapses ?? "—"}</Text>
				</InfoField>
				<InfoField label="Last reviewed">
					<Text size="sm">
						{formatDateTime(cardReview?.lastReviewed ?? null)}
					</Text>
				</InfoField>
			</InfoGroup>
		);
	}

	return null;
}

function ElementInfoPanel() {
	const currentElement = useAppSelector(selectCurrentElement);
	const storedMeta = currentElement?.data.meta ?? null;
	const dispatch = useAppDispatch();
	const [dueState, setDueState] = useState<string | null>(null);

	const debouncedRename = useDebouncedCallback(
		async (id: ElementId, name: string) => {
			if (!name) return;
			await dispatch(renameElementAction(id, name));
		},
		500,
	);

	const debouncedUpdateTags = useDebouncedCallback(
		(id: ElementId, tags: string[]) => updateElementTags(id, tags),
		500,
	);

	if (!storedMeta) {
		return (
			<Text size="sm" c="dimmed" ta="center" px="md" py="xl">
				Select an element to see its details.
			</Text>
		);
	}

	return (
		<Stack gap="lg" px="md" py="sm">
			<InfoGroup title="Details">
				<InfoField label="Name">
					<TextInput
						key={`name-${storedMeta.elementId.id}`}
						size="sm"
						defaultValue={storedMeta.name}
						onChange={e =>
							debouncedRename(
								storedMeta.elementId,
								e.currentTarget.value,
							)
						}
					/>
				</InfoField>
				<InfoField label="Tags">
					<TagsInput
						key={`tags-${storedMeta.elementId.id}`}
						placeholder="Enter tag"
						size="sm"
						defaultValue={storedMeta.tags.map(t => t.name)}
						onChange={tags =>
							debouncedUpdateTags(storedMeta.elementId, tags)
						}
					/>
				</InfoField>
				<InfoField label="Created">
					<Text size="sm">
						{new Date(storedMeta.createdAt).toLocaleString()}
					</Text>
				</InfoField>
			</InfoGroup>

			<InfoGroup title="Study">
				<InfoField label="Study profile">
					<ElementProfileRow
						elementId={storedMeta.elementId}
						parentId={storedMeta.parent}
						onDueChange={setDueState}
					/>
				</InfoField>
				<InfoField label="Due">
					<Text size="sm">{dueState ?? "—"}</Text>
				</InfoField>
			</InfoGroup>

			{currentElement && <ReviewDetails element={currentElement} />}
		</Stack>
	);
}

export default ElementInfoPanel;
