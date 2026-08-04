import { useEffect, useRef } from "react";
import { Center, ScrollArea, Stack, Text } from "@mantine/core";
import { DisplayMessage } from "../utils/buildDisplayMessages";
import MessageBubble from "./MessageBubble";

interface ChatMessagesProps {
	chatId: string | null;
	messages: DisplayMessage[];
}

// How close to the bottom (in pixels) the viewport has to be to count as "at
// the bottom" — scrolling further up than this opts out of auto-scrolling
// until the user manually returns to the bottom.
const AUTO_SCROLL_THRESHOLD_PX = 100;

function ChatMessages({ chatId, messages }: ChatMessagesProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const isPinnedToBottomRef = useRef(true);
	const isAutoScrollingRef = useRef(false);
	const lastScrollTopRef = useRef(0);

	function handleScrollPositionChange({ y }: { x: number; y: number }) {
		const viewport = viewportRef.current;
		if (!viewport) return;

		const scrolledUp = y < lastScrollTopRef.current;
		lastScrollTopRef.current = y;

		if (isAutoScrollingRef.current) return;

		// Any upward scroll opts out immediately — waiting for a fixed
		// distance threshold never triggers while streaming, since each new
		// token re-pins the view to the bottom before the user can scroll far
		// enough away from it.
		if (scrolledUp) {
			isPinnedToBottomRef.current = false;
			return;
		}

		const distanceFromBottom =
			viewport.scrollHeight - y - viewport.clientHeight;
		if (distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX) {
			isPinnedToBottomRef.current = true;
		}
	}

	// Switching chats always jumps to the bottom, even if the previous chat
	// had been scrolled up and left un-pinned.
	useEffect(() => {
		isPinnedToBottomRef.current = true;
	}, [chatId]);

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
		<ScrollArea
			viewportRef={viewportRef}
			onScrollPositionChange={handleScrollPositionChange}
			offsetScrollbars
			style={{ flex: 1 }}>
			<Stack gap="sm">
				{messages.map(message => (
					<MessageBubble
						key={message.id}
						content={message.content}
						toolName={message.toolName}
						isStreaming={message.isStreaming}
						contextSnippets={message.contextSnippets}
					/>
				))}
			</Stack>
		</ScrollArea>
	);
}

export default ChatMessages;
