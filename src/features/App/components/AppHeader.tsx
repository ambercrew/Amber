import {
	ActionIcon,
	Button,
	Collapse,
	Divider,
	Group,
	SimpleGrid,
	Stack,
	TagsInput,
	Text,
	TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDoubleDownIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { MetaResponseDto } from "../../../api/elements/dto/anyElementDto";
import ElementNodeIcon from "./ElementNodeIcon";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectCurrentElement } from "../../../stores/elements/elementsSelectors";

interface AppHeaderProps {
	onToggleSidebar: () => void;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function AppHeader({ onToggleSidebar }: AppHeaderProps) {
	const currentElement = useAppSelector(selectCurrentElement);
	const storedMeta = currentElement?.data.meta ?? null;
	const [localMeta, setLocalMeta] = useState<MetaResponseDto | null>(null);
	const [opened, { toggle }] = useDisclosure(false);

	const meta = localMeta ?? storedMeta;

	return (
		<Stack gap={0}>
			<Group h="100%" p="xs" gap={0} align="center" wrap="nowrap">
				<ActionIcon
					variant="subtle"
					size="lg"
					onClick={onToggleSidebar}>
					<SidebarSimpleIcon size={18} />
				</ActionIcon>

				{meta && (
					<Button
						variant="subtle"
						color="gray"
						size="sm"
						px="xs"
						rightSection={<CaretDoubleDownIcon size={14} />}
						leftSection={
							<ElementNodeIcon type={meta.id.type} size={16} />
						}
						title="Show element metadata"
						onClick={toggle}>
						<Text truncate="end">{meta.name}</Text>
					</Button>
				)}
			</Group>

			<Collapse expanded={opened && meta != null}>
				{meta && (
					<>
						<Divider />
						<SimpleGrid
							cols={{ base: 1, xs: 2 }}
							px="md"
							py="sm"
							spacing="sm">
							<Stack gap={2}>
								<Text size="xs" c="dimmed" fw={500}>
									Name
								</Text>
								<TextInput
									variant="unstyled"
									size="sm"
									value={meta.name}
									onChange={e =>
										setLocalMeta(prev =>
											(prev ?? meta)
												? {
														...(prev ?? meta)!,
														name: e.currentTarget
															.value,
													}
												: prev,
										)
									}
								/>
								<Text size="xs" c="dimmed" fw={500}>
									Tags
								</Text>
								<TagsInput
									variant="unstyled"
									size="sm"
									value={meta.tags}
									onChange={tags =>
										setLocalMeta(prev => ({
											...(prev ?? meta),
											tags,
										}))
									}
								/>
							</Stack>

							<Stack gap={2}>
								<Text size="xs" c="dimmed" fw={500}>
									Created
								</Text>
								<Text size="sm" py={6}>
									{formatDate(meta.createdAt)}
								</Text>
								<Text size="xs" c="dimmed" fw={500}>
									Modified
								</Text>
								<Text size="sm" py={6}>
									{formatDate(meta.modifiedAt)}
								</Text>
							</Stack>
						</SimpleGrid>
					</>
				)}
			</Collapse>
		</Stack>
	);
}

export default AppHeader;
