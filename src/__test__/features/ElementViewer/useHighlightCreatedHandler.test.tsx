import { useHighlightCreatedHandler } from "../../../features/ElementViewer/useHighlightCreatedHandler";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import {
	createCardAction,
	createExtractAction,
} from "../../../stores/elements/elementsActions";
import { ElementId } from "../../../types/elements/elementId";
import { HighlightCreatedPayload } from "../../../components/Editor/plugins/HighlightPlugin/highlightCommands";

vi.mock(import("../../../stores/elements/elementsActions"));

const ELEMENT_ID: ElementId = { type: "reading", id: "reading-1" };

function HookWrapper({
	capture,
}: {
	capture: (handler: (payload: HighlightCreatedPayload) => void) => void;
}) {
	capture(useHighlightCreatedHandler(ELEMENT_ID));
	return null;
}

function renderHandler() {
	vi.mocked(createCardAction).mockReturnValue(() => Promise.resolve());
	vi.mocked(createExtractAction).mockReturnValue(() => Promise.resolve());

	let handleHighlightCreated!: (payload: HighlightCreatedPayload) => void;
	renderWithProviders(
		<HookWrapper capture={handler => (handleHighlightCreated = handler)} />,
	);
	return handleHighlightCreated;
}

describe("useHighlightCreatedHandler", () => {
	it("Should create a card with a hidden cloze front and a plain-text back when color is blue", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();
		const fullHtml =
			'<p>A <mark data-highlight-id="other-id" data-highlight-color="yellow">Old</mark> B ' +
			'<mark data-highlight-id="new-id" data-highlight-color="blue">New Text</mark> C</p>';

		// Act

		handleHighlightCreated({
			id: "new-id",
			html: "New Text",
			fullHtml,
			color: "blue",
		});

		// Assert

		expect(createCardAction).toHaveBeenCalledWith({
			id: "new-id",
			meta: {
				name: "A Old B New Text C",
				parent: ELEMENT_ID,
				derivedFrom: ELEMENT_ID,
			},
			front: '<p>A Old B <mark data-cloze-hidden="true">New Text</mark> C</p>',
			back: "New Text",
		});
	});

	it("Should name the card from the full document's plain text rather than the back text", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();
		const fullHtml =
			"<p>Some context before " +
			'<mark data-highlight-id="new-id" data-highlight-color="blue">the answer</mark>' +
			" and after</p>";

		// Act

		handleHighlightCreated({
			id: "new-id",
			html: "the answer",
			fullHtml,
			color: "blue",
		});

		// Assert

		expect(createCardAction).toHaveBeenCalledWith(
			expect.objectContaining({
				meta: expect.objectContaining({
					name: "Some context before the answer and after",
				}) as object,
			}),
		);
	});

	it("Should truncate the card name to 50 characters", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();
		const longText = "A".repeat(60);

		// Act

		handleHighlightCreated({
			id: "new-id",
			html: longText,
			fullHtml: `<p><mark data-highlight-id="new-id" data-highlight-color="blue">${longText}</mark></p>`,
			color: "blue",
		});

		// Assert

		expect(createCardAction).toHaveBeenCalledWith(
			expect.objectContaining({
				meta: expect.objectContaining({
					name: "A".repeat(50),
				}) as object,
			}),
		);
	});

	it("Should create an extract stripped of other highlights when color is not blue", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();

		// Act

		handleHighlightCreated({
			id: "new-id",
			html: '<mark data-highlight-id="other-id" data-highlight-color="yellow">Nested</mark> Rest',
			fullHtml: "<p>irrelevant</p>",
			color: "yellow",
		});

		// Assert

		expect(createExtractAction).toHaveBeenCalledWith({
			id: "new-id",
			meta: {
				name: "Nested Rest",
				parent: ELEMENT_ID,
				derivedFrom: ELEMENT_ID,
			},
			content: "Nested Rest",
		});
		expect(createCardAction).not.toHaveBeenCalled();
	});

	it("Should strip every other highlight from the cloze front and back when there is more than one", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();
		const fullHtml =
			'<p><mark data-highlight-id="other-id-1" data-highlight-color="yellow">First</mark> ' +
			'<mark data-highlight-id="other-id-2" data-highlight-color="yellow">Second</mark> ' +
			'<mark data-highlight-id="new-id" data-highlight-color="blue">New Text</mark> ' +
			'<mark data-highlight-id="other-id-3" data-highlight-color="blue">Third</mark></p>';
		const html =
			'<mark data-highlight-id="other-id-4" data-highlight-color="yellow">Old</mark> New Text';

		// Act

		handleHighlightCreated({
			id: "new-id",
			html,
			fullHtml,
			color: "blue",
		});

		// Assert

		expect(createCardAction).toHaveBeenCalledWith({
			id: "new-id",
			meta: {
				name: "First Second New Text Third",
				parent: ELEMENT_ID,
				derivedFrom: ELEMENT_ID,
			},
			front: '<p>First Second <mark data-cloze-hidden="true">New Text</mark> Third</p>',
			back: "Old New Text",
		});
	});

	it("Should unwrap a pre-existing cloze-hidden marker from the front and back when creating a new cloze card", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();
		const fullHtml =
			'<p><mark data-cloze-hidden="true">Old Cloze</mark> ' +
			'<mark data-highlight-id="new-id" data-highlight-color="blue">New Text</mark></p>';

		// Act

		handleHighlightCreated({
			id: "new-id",
			html: 'Before <mark data-cloze-hidden="true">Old Cloze</mark> New Text',
			fullHtml,
			color: "blue",
		});

		// Assert

		expect(createCardAction).toHaveBeenCalledWith({
			id: "new-id",
			meta: {
				name: "Old Cloze New Text",
				parent: ELEMENT_ID,
				derivedFrom: ELEMENT_ID,
			},
			front: '<p>Old Cloze <mark data-cloze-hidden="true">New Text</mark></p>',
			back: "Before Old Cloze New Text",
		});
	});

	it("Should unwrap a pre-existing cloze-hidden marker from the extract content when creating a new extract", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();

		// Act

		handleHighlightCreated({
			id: "new-id",
			html: 'Before <mark data-cloze-hidden="true">Old Cloze</mark> Rest',
			fullHtml: "<p>irrelevant</p>",
			color: "yellow",
		});

		// Assert

		expect(createExtractAction).toHaveBeenCalledWith({
			id: "new-id",
			meta: {
				name: "Before Old Cloze Rest",
				parent: ELEMENT_ID,
				derivedFrom: ELEMENT_ID,
			},
			content: "Before Old Cloze Rest",
		});
	});

	it("Should strip every other highlight from the extract content when there is more than one", () => {
		// Arrange

		const handleHighlightCreated = renderHandler();

		// Act

		handleHighlightCreated({
			id: "new-id",
			html:
				'<mark data-highlight-id="other-id-1" data-highlight-color="yellow">First</mark> ' +
				"Middle " +
				'<mark data-highlight-id="other-id-2" data-highlight-color="blue">Second</mark>',
			fullHtml: "<p>irrelevant</p>",
			color: "yellow",
		});

		// Assert

		expect(createExtractAction).toHaveBeenCalledWith({
			id: "new-id",
			meta: {
				name: "First Middle Second",
				parent: ELEMENT_ID,
				derivedFrom: ELEMENT_ID,
			},
			content: "First Middle Second",
		});
	});
});
