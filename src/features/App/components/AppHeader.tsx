import { useState } from "react";
import {
	ActionIcon,
	Button,
	Collapse,
	Group,
	SimpleGrid,
	Stack,
	TagsInput,
	Text,
	TextInput,
} from "@mantine/core";
import { useDisclosure, useDebouncedCallback } from "@mantine/hooks";
import {
	CaretDoubleDownIcon,
	CaretDoubleUpIcon,
	CommandIcon,
	SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { spotlight } from "@mantine/spotlight";
import ElementNodeIcon from "./ElementNodeIcon";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectCurrentElement } from "../../../stores/elements/elementsSelectors";
import { updateElementTags } from "../../../api/elements/api/elementsApi";
import { ElementId } from "../../../types/elements/elementId";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { renameElementAction } from "../../../stores/elements/elementsActions";
import { formatShortcut } from "../../../commands/formatShortcut";
import { SPOTLIGHT_SHORTCUT } from "../../../commands/commands";
import StudyModeToggle from "../../Study/components/StudyModeToggle";
import ElementProfileRow from "../../Study/components/ElementProfileRow";

interface AppHeaderProps {
	pinned: boolean;
	onToggleSidebar: () => void;
}

function AppHeader({ pinned, onToggleSidebar }: AppHeaderProps) {
	const currentElement = useAppSelector(selectCurrentElement);
	const storedMeta = currentElement?.data.meta ?? null;
	const [opened, { toggle }] = useDisclosure(false);
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

	return (
		<Stack gap={0}>
			<Group
				h="100%"
				p="xs"
				gap="sm"
				align="center"
				wrap="nowrap"
				justify="space-between">
				<Group gap={0} align="center" wrap="nowrap" miw={0}>
					<ActionIcon
						variant="subtle"
						size="lg"
						title="Toggle sidebar"
						onClick={onToggleSidebar}>
						<SidebarSimpleIcon size={18} />
					</ActionIcon>

					{storedMeta && (
						<Button
							variant="subtle"
							color="gray"
							size="sm"
							px="xs"
							rightSection={
								opened ? (
									<CaretDoubleUpIcon size={14} />
								) : (
									<CaretDoubleDownIcon size={14} />
								)
							}
							leftSection={
								<ElementNodeIcon
									type={storedMeta.elementId.type}
									size={16}
								/>
							}
							title="Show element metadata"
							onClick={toggle}>
							<Text truncate="end">{storedMeta.name}</Text>
						</Button>
					)}
				</Group>

				<Group gap="xs" align="center" wrap="nowrap">
					<StudyModeToggle />
					<ActionIcon
						variant="subtle"
						size="lg"
						title={`Open command palette (${formatShortcut(SPOTLIGHT_SHORTCUT)})`}
						onClick={() => spotlight.open()}>
						<CommandIcon size={18} />
					</ActionIcon>
				</Group>
			</Group>

			<Collapse expanded={opened && pinned && storedMeta != null}>
				{storedMeta && (
					<SimpleGrid
						cols={{ base: 1, xs: 2 }}
						px="md"
						py="sm"
						spacing="sm"
						style={{
							backgroundColor: "var(--mantine-color-white)",
							borderBottom:
								"1px solid var(--mantine-color-default-border)",
						}}>
						<Stack gap={2}>
							<Text size="xs" c="dimmed" fw={500}>
								Name
							</Text>
							<TextInput
								key={`name-${storedMeta.elementId.id}`}
								variant="unstyled"
								size="sm"
								defaultValue={storedMeta.name}
								onChange={e =>
									debouncedRename(
										storedMeta.elementId,
										e.currentTarget.value,
									)
								}
							/>
							<Text size="xs" c="dimmed" fw={500}>
								Tags
							</Text>
							<TagsInput
								key={`tags-${storedMeta.elementId.id}`}
								placeholder="Enter tag"
								variant="unstyled"
								size="sm"
								defaultValue={storedMeta.tags.map(t => t.name)}
								onChange={tags =>
									debouncedUpdateTags(
										storedMeta.elementId,
										tags,
									)
								}
							/>
						</Stack>

						<Stack gap={2}>
							<Text size="xs" c="dimmed" fw={500}>
								Study profile
							</Text>
							<ElementProfileRow
								elementId={storedMeta.elementId}
								parentId={storedMeta.parent}
								onDueChange={setDueState}
							/>
							<Text size="xs" c="dimmed" fw={500} mt={4}>
								Due
							</Text>
							<Text size="sm" py={6}>
								{dueState ?? "—"}
							</Text>
						</Stack>
					</SimpleGrid>
				)}
			</Collapse>
		</Stack>
	);
}

export default AppHeader;
