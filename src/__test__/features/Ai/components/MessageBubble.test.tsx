import { fireEvent, screen, waitFor } from "@testing-library/react";
import MessageBubble from "../../../../features/Ai/components/MessageBubble";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";

function renderMessageBubble(contextSnippets?: string[]) {
	return renderWithProviders(
		<MessageBubble
			id="message-1"
			content={{ type: "human", value: "What does this mean?" }}
			contextSnippets={contextSnippets}
		/>,
	);
}

describe("MessageBubble", () => {
	it("Should render a collapsed context toggle when the human message has context snippets", () => {
		// Arrange

		// Act

		renderMessageBubble(["Selected passage one", "Selected passage two"]);

		// Assert

		expect(screen.getByText("2 snippets")).toBeInTheDocument();
		expect(
			screen.queryByText("Selected passage one"),
		).not.toBeInTheDocument();
	});

	it("Should show each context snippet with its own heading when expanded", async () => {
		// Arrange

		renderMessageBubble(["Selected passage one", "Selected passage two"]);

		// Act

		fireEvent.click(screen.getByText("2 snippets"));

		// Assert

		await waitFor(() => {
			expect(screen.getByText("Snippet 1")).toBeInTheDocument();
			expect(
				screen.getByText("Selected passage one"),
			).toBeInTheDocument();
			expect(screen.getByText("Snippet 2")).toBeInTheDocument();
			expect(
				screen.getByText("Selected passage two"),
			).toBeInTheDocument();
		});
	});

	it("Should not render the context toggle when the human message has no context snippets", () => {
		// Arrange

		// Act

		renderMessageBubble([]);

		// Assert

		expect(screen.queryByText(/context snippet/)).not.toBeInTheDocument();
	});
});
