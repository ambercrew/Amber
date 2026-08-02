import { useEffect, useRef } from "react";
import { Center, ScrollArea, Stack, Text } from "@mantine/core";
import { DisplayMessage } from "../utils/buildDisplayMessages";
import MessageBubble from "./MessageBubble";

interface ChatMessagesProps {
	messages: DisplayMessage[];
}

// How close to the bottom (in pixels) the viewport has to be to count as "at
// the bottom" — scrolling further up than this opts out of auto-scrolling
// until the user manually returns to the bottom.
const AUTO_SCROLL_THRESHOLD_PX = 80;

function ChatMessages({ messages }: ChatMessagesProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const isPinnedToBottomRef = useRef(true);
	const isAutoScrollingRef = useRef(false);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;

		function handleScroll() {
			if (isAutoScrollingRef.current) return;

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

		// Instant (not smooth) so the jump completes before the next streamed
		// token can trigger another one — an in-flight smooth animation kept
		// generating scroll events that re-pinned the view to the bottom right
		// after the user had scrolled away from it.
		isAutoScrollingRef.current = true;
		viewport.scrollTo({ top: viewport.scrollHeight, behavior: "auto" });
		requestAnimationFrame(() => {
			isAutoScrollingRef.current = false;
		});
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
