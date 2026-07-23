import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
	Anchor,
	Collapse,
	Divider,
	Group,
	Stack,
	Text,
	UnstyledButton,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { getElementById } from "../../api/elements/api/elementsApi";
import { MetaResponseDto } from "../../api/elements/dto/anyElementDto";
import { getSource } from "../../api/sources/api/sourcesApi";
import { SourceResponseDto } from "../../api/sources/dto/sourceDto";
import { paths } from "../../paths";

interface ContentSourcePanelProps {
	meta: MetaResponseDto;
}

function SourceField({ label, value }: { label: string; value: string }) {
	return (
		<Stack gap={2}>
			<Text size="xs" c="dimmed" fw={500}>
				{label}
			</Text>
			<Text size="sm">{value}</Text>
		</Stack>
	);
}

export default function ContentSourcePanel({ meta }: ContentSourcePanelProps) {
	const { sourceId, derivedFrom } = meta;
	const navigate = useNavigate();
	const [opened, setOpened] = useLocalStorage({
		key: "content-source-panel.opened",
		defaultValue: true,
	});
	const [source, setSource] = useState<SourceResponseDto | null>(null);
	const [derivedFromName, setDerivedFromName] = useState<{
		id: string;
		name: string;
	} | null>(null);

	useEffect(() => {
		if (!sourceId) return;
		let cancelled = false;
		void getSource(sourceId).then(result => {
			if (!cancelled) setSource(result);
		});
		return () => {
			cancelled = true;
		};
	}, [sourceId]);

	useEffect(() => {
		if (!derivedFrom) return;
		let cancelled = false;
		void getElementById(derivedFrom).then(element => {
			if (!cancelled)
				setDerivedFromName({
					id: derivedFrom.id,
					name: element.data.meta.name,
				});
		});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [derivedFrom?.type, derivedFrom?.id]);

	const displaySource = source?.id === sourceId ? source : null;
	const displayDerivedFromName =
		derivedFromName && derivedFromName.id === derivedFrom?.id
			? derivedFromName.name
			: null;

	return (
		<Stack gap="lg" py="lg">
			<Divider variant="dashed" c="dimmed" />
			<Stack gap="sm">
				<UnstyledButton onClick={() => setOpened(o => !o)}>
					<Group gap={6}>
						{opened ? (
							<CaretDownIcon size={12} />
						) : (
							<CaretRightIcon size={12} />
						)}
						<Text size="xs" c="dimmed" tt="uppercase">
							Source
						</Text>
					</Group>
				</UnstyledButton>
				<Collapse expanded={opened}>
					<Stack gap="md" pl="lg">
						<SourceField
							label="Title"
							value={displaySource?.title ?? "No source"}
						/>
						<SourceField
							label="Authors"
							value={displaySource?.authors ?? "—"}
						/>
						<SourceField
							label="Publication date"
							value={displaySource?.publicationDate ?? "—"}
						/>
						<SourceField
							label="Type"
							value={displaySource?.sourceType ?? "—"}
						/>
						<SourceField
							label="Location"
							value={displaySource?.location ?? "—"}
						/>
						<Stack gap={2}>
							<Text size="xs" c="dimmed" fw={500}>
								Derived from
							</Text>
							{derivedFrom ? (
								<Anchor
									size="sm"
									onClick={() => {
										void navigate(
											paths.element(
												derivedFrom.type,
												derivedFrom.id,
											),
										);
									}}>
									{displayDerivedFromName ?? "…"}
								</Anchor>
							) : (
								<Text size="sm">—</Text>
							)}
						</Stack>
					</Stack>
				</Collapse>
			</Stack>
		</Stack>
	);
}
