import { useEffect, useRef } from "react";
import { Center, ScrollArea, Stack, Text } from "@mantine/core";
import { DisplayMessage } from "../utils/buildDisplayMessages";
import MessageBubble from "./MessageBubble";

interface ChatMessagesProps {
	messages: DisplayMessage[];
}

function ChatMessages({ messages }: ChatMessagesProps) {
	const viewportRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
	}, [messages]);

	if (messages.length === 0) {
		return (
			<Center style={{ flex: 1, minHeight: 0 }} px="md">
				<Text size="sm" c="dimmed" ta="center">
					Ask a question to start a conversation.
				</Text>
			</Center>
		);
	}

	return (
		<ScrollArea viewportRef={viewportRef} style={{ flex: 1 }}>
			<Stack gap="sm" p="sm">
				{messages.map(message => (
					<MessageBubble key={message.id} content={message.content} />
				))}
			</Stack>
		</ScrollArea>
	);
}

export default ChatMessages;
