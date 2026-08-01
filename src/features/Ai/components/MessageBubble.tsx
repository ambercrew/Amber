import { Box, Group, Paper, Text } from "@mantine/core";
import { FileIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { MessageContentDto } from "../../../api/aiIntegration/dto/messageDto";

interface MessageBubbleProps {
	content: MessageContentDto;
}

// TODO: dot animation while waiting
// TODO: markdown rendering
// TODO: if the user scrolls up while AI is generating do not scroll down otherwise do it automatically
function MessageBubble({ content }: MessageBubbleProps) {
	if (content.type === "human") {
		return (
			<Group justify="flex-end">
				<Paper
					withBorder
					radius="md"
					p="sm"
					maw="85%"
					bg="var(--mantine-primary-color-light)">
					<Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
						{content.value}
					</Text>
				</Paper>
			</Group>
		);
	}

	if (content.type === "assistant") {
		return (
			<Group justify="flex-start">
				<Paper withBorder radius="md" p="sm" maw="85%">
					<Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
						{content.value}
					</Text>
				</Paper>
			</Group>
		);
	}

	if (content.type === "document") {
		return (
			<Group justify="flex-end">
				<Paper withBorder radius="md" p="xs" maw="85%">
					<Group gap="xs" wrap="nowrap">
						<FileIcon size={16} />
						<Text size="xs" truncate>
							{content.value.fileName}
						</Text>
					</Group>
				</Paper>
			</Group>
		);
	}

	// TODO: use the tool call name instead
	return (
		<Box>
			<Group gap={4} wrap="nowrap">
				<MagnifyingGlassIcon size={12} />
				<Text size="xs" c="dimmed" fs="italic">
					{content.type === "toolCall"
						? "Searching uploaded documents…"
						: "Searched uploaded documents"}
				</Text>
			</Group>
		</Box>
	);
}

export default MessageBubble;
