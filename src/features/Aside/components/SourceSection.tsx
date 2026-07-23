import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
	ActionIcon,
	Anchor,
	Group,
	Select,
	Text,
	TextInput,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import useApi from "../../../hooks/useApi";
import {
	assignSource,
	createSource,
	deleteSource,
	listSources,
	updateSource,
} from "../../../api/sources/api/sourcesApi";
import {
	SourceRequestDto,
	SourceResponseDto,
	SourceType,
} from "../../../api/sources/dto/sourceDto";
import {
	clearDerivedFrom,
	getElementById,
} from "../../../api/elements/api/elementsApi";
import { ElementId } from "../../../types/elements/elementId";
import { paths } from "../../../paths";
import InfoField from "./InfoField";
import InfoGroup from "./InfoGroup";

const NEW_VALUE = "__new__";

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string }[] = [
	{ value: "File", label: "File" },
	{ value: "WebPage", label: "Web page" },
];

function sourceRequestFrom(source: SourceResponseDto): SourceRequestDto {
	return {
		title: source.title,
		authors: source.authors,
		publicationDate: source.publicationDate,
		sourceType: source.sourceType,
		location: source.location,
	};
}

interface SourceSectionProps {
	elementId: ElementId;
	sourceId: string | null;
	derivedFrom: ElementId | null;
}

function SourceSection({
	elementId,
	sourceId,
	derivedFrom,
}: SourceSectionProps) {
	const navigate = useNavigate();
	const { callApi } = useApi();
	const [sources, setSources] = useState<SourceResponseDto[]>([]);
	const [selectedSourceId, setSelectedSourceId] = useState<string | null>(
		sourceId,
	);
	const [currentDerivedFrom, setCurrentDerivedFrom] =
		useState<ElementId | null>(derivedFrom);
	const [derivedFromName, setDerivedFromName] = useState<string | null>(null);

	useEffect(() => {
		void callApi(async () => {
			setSources(await listSources());
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		void callApi(async () => {
			if (currentDerivedFrom) {
				const element = await getElementById(currentDerivedFrom);
				setDerivedFromName(element.data.meta.name);
			} else {
				setDerivedFromName(null);
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentDerivedFrom?.type, currentDerivedFrom?.id]);

	const selectedSource = sources.find(s => s.id === selectedSourceId) ?? null;

	function handleSourceChange(value: string | null) {
		void callApi(async () => {
			if (value === null) {
				await assignSource(elementId, null);
				setSelectedSourceId(null);
				return;
			}
			if (value === NEW_VALUE) {
				const created = await createSource({
					title: "New source",
					authors: null,
					publicationDate: null,
					sourceType: "File",
					location: null,
				});
				setSources(current => [...current, created]);
				await assignSource(elementId, created.id);
				setSelectedSourceId(created.id);
				return;
			}
			await assignSource(elementId, value);
			setSelectedSourceId(value);
		});
	}

	const debouncedUpdateSource = useDebouncedCallback(
		(id: string, dto: SourceRequestDto) => {
			void callApi(async () => {
				const updated = await updateSource(id, dto);
				setSources(current =>
					current.map(s => (s.id === id ? updated : s)),
				);
			});
		},
		500,
	);

	function handleFieldChange<K extends keyof SourceRequestDto>(
		field: K,
		value: SourceRequestDto[K],
	) {
		if (!selectedSource) return;
		const dto: SourceRequestDto = {
			...sourceRequestFrom(selectedSource),
			[field]: value,
		};
		setSources(current =>
			current.map(s =>
				s.id === selectedSource.id ? { ...s, [field]: value } : s,
			),
		);
		debouncedUpdateSource(selectedSource.id, dto);
	}

	function handleDeleteSource() {
		if (!selectedSource) return;
		modals.openConfirmModal({
			title: "Delete source",
			children: (
				<Text>
					Are you sure you want to delete &quot;{selectedSource.title}
					&quot;? This cannot be undone
					{selectedSource.elementCount > 0
						? ` and will unassign it from ${selectedSource.elementCount} element${selectedSource.elementCount === 1 ? "" : "s"}`
						: ""}
					.
				</Text>
			),
			labels: { confirm: "Delete", cancel: "Cancel" },
			confirmProps: { color: "red" },
			centered: true,
			onConfirm: () => {
				void callApi(async () => {
					await deleteSource(selectedSource.id);
					setSources(current =>
						current.filter(s => s.id !== selectedSource.id),
					);
					setSelectedSourceId(null);
				});
			},
		});
	}

	function handleClearDerivedFrom() {
		void callApi(async () => {
			await clearDerivedFrom(elementId);
			setCurrentDerivedFrom(null);
		});
	}

	return (
		<InfoGroup title="Source" storageKey="source" defaultOpened={false}>
			<InfoField label="Source">
				<Group gap={4} wrap="nowrap">
					<Select
						size="sm"
						style={{ flex: 1 }}
						value={selectedSourceId}
						clearable={selectedSourceId !== null}
						searchable
						withAlignedLabels
						placeholder="None"
						data={[
							...sources.map(s => ({
								value: s.id,
								label: s.title || "Untitled source",
							})),
							{ value: NEW_VALUE, label: "+ Create new source" },
						]}
						allowDeselect={false}
						onChange={handleSourceChange}
					/>
					<ActionIcon
						variant="subtle"
						color="red"
						title="Delete source"
						onClick={handleDeleteSource}>
						<TrashIcon size={16} />
					</ActionIcon>
				</Group>
			</InfoField>

			{selectedSource && (
				<InfoField label="Used by">
					<Text size="sm">
						{selectedSource.elementCount} element
						{selectedSource.elementCount === 1 ? "" : "s"}
					</Text>
				</InfoField>
			)}

			{selectedSource && (
				<>
					<InfoField label="Title">
						<TextInput
							key={`source-title-${selectedSource.id}`}
							size="sm"
							defaultValue={selectedSource.title}
							onChange={e =>
								handleFieldChange(
									"title",
									e.currentTarget.value,
								)
							}
						/>
					</InfoField>
					<InfoField label="Authors">
						<TextInput
							key={`source-authors-${selectedSource.id}`}
							size="sm"
							defaultValue={selectedSource.authors ?? ""}
							onChange={e =>
								handleFieldChange(
									"authors",
									e.currentTarget.value || null,
								)
							}
						/>
					</InfoField>
					<InfoField label="Publication date">
						<TextInput
							key={`source-date-${selectedSource.id}`}
							size="sm"
							defaultValue={selectedSource.publicationDate ?? ""}
							onChange={e =>
								handleFieldChange(
									"publicationDate",
									e.currentTarget.value || null,
								)
							}
						/>
					</InfoField>
					<InfoField label="Type">
						<Select
							size="sm"
							allowDeselect={false}
							withAlignedLabels
							data={SOURCE_TYPE_OPTIONS}
							value={selectedSource.sourceType}
							onChange={value =>
								value &&
								handleFieldChange(
									"sourceType",
									value as SourceType,
								)
							}
						/>
					</InfoField>
					<InfoField label="Location">
						<TextInput
							key={`source-location-${selectedSource.id}`}
							size="sm"
							defaultValue={selectedSource.location ?? ""}
							onChange={e =>
								handleFieldChange(
									"location",
									e.currentTarget.value || null,
								)
							}
						/>
					</InfoField>
				</>
			)}

			<InfoField label="Derived from">
				{currentDerivedFrom ? (
					<Group gap={4} wrap="nowrap">
						<Anchor
							size="sm"
							onClick={() => {
								void navigate(
									paths.element(
										currentDerivedFrom.type,
										currentDerivedFrom.id,
									),
								);
							}}>
							{derivedFromName ?? "…"}
						</Anchor>
						<ActionIcon
							size="sm"
							variant="subtle"
							title="Clear derived from"
							onClick={handleClearDerivedFrom}>
							<XIcon size={12} />
						</ActionIcon>
					</Group>
				) : (
					<Text size="sm" c="dimmed">
						—
					</Text>
				)}
			</InfoField>
		</InfoGroup>
	);
}

export default SourceSection;
