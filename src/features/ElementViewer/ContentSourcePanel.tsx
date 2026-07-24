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
import { MetaResponseDto } from "../../api/elements/dto/anyElementDto";
import useAppSelector from "../../hooks/useAppSelector";
import { selectCurrentElementDetails } from "../../stores/elementDetails/elementDetailsSelectors";
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
	const { derivedFrom } = meta;
	const navigate = useNavigate();
	const [opened, setOpened] = useLocalStorage({
		key: "content-source-panel.opened",
		defaultValue: false,
	});
	const details = useAppSelector(selectCurrentElementDetails);
	const source = details?.source ?? null;
	const derivedFromName = details?.derivedFromName ?? null;

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
							value={source?.title ?? "No source"}
						/>
						<SourceField
							label="Authors"
							value={source?.authors ?? "—"}
						/>
						<SourceField
							label="Publication date"
							value={source?.publicationDate ?? "—"}
						/>
						<SourceField
							label="Type"
							value={source?.sourceType ?? "—"}
						/>
						<SourceField
							label="Location"
							value={source?.location ?? "—"}
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
									{derivedFromName ?? "…"}
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
