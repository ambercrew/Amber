import { Box, Group, Loader, Paper, Text, Typography } from "@mantine/core";
import { FileIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { marked } from "marked";
import { MessageContentDto } from "../../../api/aiIntegration/dto/messageDto";
import { sanitizeHtml } from "../../Import/normalize/sanitize";

interface MessageBubbleProps {
	content: MessageContentDto;
	/** Name of the tool a `toolCall`/`toolResult` bubble belongs to. */
	toolName?: string;
	/** Whether this is the assistant reply currently being streamed in. */
	isStreaming?: boolean;
}

// TODO: handle changing chats while AI is still generating
// TODO: overflowing tables outside of message
const TOOL_LABELS: Record<string, { inProgress: string; done: string }> = {
	search_documents: {
		inProgress: "Searching uploaded documents…",
		done: "Searched uploaded documents",
	},
};

function toolLabel(toolName: string | undefined, done: boolean): string {
	const known = toolName ? TOOL_LABELS[toolName] : undefined;
	if (known) return done ? known.done : known.inProgress;

	const readable = toolName?.replace(/_/g, " ") ?? "tool";
	return done ? `Ran ${readable}` : `Running ${readable}…`;
}

function renderMarkdown(value: string) {
	return sanitizeHtml(marked.parse(value, { async: false }) as string);
}

function MessageBubble({ content, toolName, isStreaming }: MessageBubbleProps) {
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
		if (content.value === "") {
			return (
				<Group justify="flex-start">
					<Paper withBorder radius="md" p="sm">
						<Loader type="dots" size="sm" />
					</Paper>
				</Group>
			);
		}

		return (
			<Group justify="flex-start">
				<Paper withBorder radius="md" p="sm" maw="85%">
					<Typography>
						<div
							dangerouslySetInnerHTML={{
								__html: renderMarkdown(content.value),
							}}
						/>
					</Typography>
					{isStreaming && (
						<Group justify="flex-end" mt={4}>
							<Loader type="dots" size="xs" />
						</Group>
					)}
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

	const done = content.type === "toolResult";
	const name = content.type === "toolCall" ? content.value.name : toolName;

	return (
		<Box>
			<Group gap={4} wrap="nowrap">
				<MagnifyingGlassIcon size={12} />
				<Text size="xs" c="dimmed" fs="italic">
					{toolLabel(name, done)}
				</Text>
			</Group>
		</Box>
	);
}

export default MessageBubble;
