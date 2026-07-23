import { NumberInput, Text } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { updateAFactor } from "../../../api/elements/api/elementsApi";
import { AnyElementDto } from "../../../api/elements/dto/anyElementDto";
import { ElementDetailsResponseDto } from "../../../api/elements/dto/elementDetailsDto";
import { ElementId } from "../../../types/elements/elementId";
import InfoField from "./InfoField";
import InfoGroup from "./InfoGroup";

function formatDateTime(value: string | null): string {
	return value ? new Date(value).toLocaleString() : "—";
}

function formatNumber(value: number): string {
	return value.toFixed(2);
}

interface ReviewDetailsProps {
	element: AnyElementDto;
	details: ElementDetailsResponseDto | null;
}

function ReviewDetails({ element, details }: ReviewDetailsProps) {
	const elementId = element.data.meta.elementId;
	const cardReview = details?.cardReview ?? null;
	const readingReview = details?.readingReview ?? null;

	const debouncedUpdateAFactor = useDebouncedCallback(
		(id: ElementId, value: number) => updateAFactor(id, value),
		500,
	);

	if (element.type === "reading" || element.type === "extract") {
		const finished = Boolean(readingReview?.finishedAt);
		return (
			<InfoGroup
				title="Scheduling"
				storageKey="scheduling"
				defaultOpened={false}>
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
			<InfoGroup
				title="Scheduling"
				storageKey="scheduling"
				defaultOpened={false}>
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

export default ReviewDetails;
