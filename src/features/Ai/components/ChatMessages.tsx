import { useEffect, useRef } from "react";
import { Center, ScrollArea, Stack, Text } from "@mantine/core";
import { DisplayMessage } from "../utils/buildDisplayMessages";
import MessageBubble from "./MessageBubble";

interface ChatMessagesProps {
	messages: DisplayMessage[];
}

// TODO: review how it looks for dark theme
// How close to the bottom (in pixels) the viewport has to be to count as "at
// the bottom" — scrolling further up than this opts out of auto-scrolling
// until the user manually returns to the bottom.
const AUTO_SCROLL_THRESHOLD_PX = 80;

function ChatMessages({ messages }: ChatMessagesProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const isPinnedToBottomRef = useRef(true);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;

		function handleScroll() {
			const distanceFromBottom =
				viewport!.scrollHeight -
				viewport!.scrollTop -
				viewport!.clientHeight;
			isPinnedToBottomRef.current =
				distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX;
		}

		viewport.addEventListener("scroll", handleScroll);
		return () => viewport.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport || !isPinnedToBottomRef.current) return;
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
					<MessageBubble
						key={message.id}
						content={message.content}
						toolName={message.toolName}
						isStreaming={message.isStreaming}
					/>
				))}
			</Stack>
		</ScrollArea>
	);
}

export default ChatMessages;
