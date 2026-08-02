import { render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import ChatMessages from "../../../../features/Ai/components/ChatMessages";
import { DisplayMessage } from "../../../../features/Ai/utils/buildDisplayMessages";

function makeMessage(id: string): DisplayMessage {
	return { id, content: { type: "human", value: `message ${id}` } };
}

function getViewport(container: HTMLElement) {
	const viewport = container.querySelector<HTMLElement>(
		"[data-scrollarea-viewport]",
	);
	if (!viewport) throw new Error("Viewport not found");
	return viewport;
}

function scrollTo(viewport: HTMLElement, y: number) {
	viewport.scrollTop = y;
	viewport.dispatchEvent(new Event("scroll", { bubbles: false }));
}

// The mount-time auto-scroll marks itself in-progress until the next
// animation frame, during which scroll events are ignored (see
// `isAutoScrollingRef` in ChatMessages.tsx) — flush it before simulating
// user scrolling so those events aren't silently dropped.
function flushAutoScroll() {
	return new Promise(resolve => requestAnimationFrame(resolve));
}

beforeEach(() => {
	// jsdom doesn't implement Element.scrollTo.
	window.HTMLElement.prototype.scrollTo = vi.fn();
});

function renderChatMessages(messages: DisplayMessage[]) {
	return render(
		<MantineProvider>
			<ChatMessages messages={messages} />
		</MantineProvider>,
	);
}

describe("ChatMessages", () => {
	it("Should scroll the viewport to the bottom when a new message arrives while pinned to the bottom", () => {
		// Arrange

		const { container, rerender } = renderChatMessages([makeMessage("1")]);
		const viewport = getViewport(container);
		const scrollToMock = vi.fn();
		viewport.scrollTo = scrollToMock;

		// Act

		rerender(
			<MantineProvider>
				<ChatMessages messages={[makeMessage("1"), makeMessage("2")]} />
			</MantineProvider>,
		);

		// Assert

		expect(scrollToMock).toHaveBeenCalledWith({
			top: viewport.scrollHeight,
			behavior: "auto",
		});
	});

	it("Should not scroll the viewport when a new message arrives after the user scrolled up", async () => {
		// Arrange

		const { container, rerender } = renderChatMessages([makeMessage("1")]);
		const viewport = getViewport(container);
		await flushAutoScroll();
		scrollTo(viewport, 500);
		scrollTo(viewport, 100);
		const scrollToMock = vi.fn();
		viewport.scrollTo = scrollToMock;

		// Act

		rerender(
			<MantineProvider>
				<ChatMessages messages={[makeMessage("1"), makeMessage("2")]} />
			</MantineProvider>,
		);

		// Assert

		expect(scrollToMock).not.toHaveBeenCalled();
	});

	it("Should resume scrolling to the bottom once the user scrolls back near it", async () => {
		// Arrange

		const { container, rerender } = renderChatMessages([makeMessage("1")]);
		const viewport = getViewport(container);
		Object.defineProperty(viewport, "scrollHeight", {
			value: 1000,
			configurable: true,
		});
		Object.defineProperty(viewport, "clientHeight", {
			value: 500,
			configurable: true,
		});
		await flushAutoScroll();
		scrollTo(viewport, 500);
		scrollTo(viewport, 100);
		scrollTo(viewport, 450);
		const scrollToMock = vi.fn();
		viewport.scrollTo = scrollToMock;

		// Act

		rerender(
			<MantineProvider>
				<ChatMessages messages={[makeMessage("1"), makeMessage("2")]} />
			</MantineProvider>,
		);

		// Assert

		expect(scrollToMock).toHaveBeenCalledWith({
			top: viewport.scrollHeight,
			behavior: "auto",
		});
	});
});
