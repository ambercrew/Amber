import { act, screen } from "@testing-library/react";
import EditableCells from "../../../../features/EditableCells/components/EditableCells";
import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";
import Cell from "../../../../types/backend/entity/cell";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { Mock } from "vitest";

vi.mock(import("../../../../managers/closeRequestedEventManager"));

function createTestCell(index: number): Cell {
	const cell = createDefaultCell("FlashCard", index + "", index);
	cell.id = index + "";
	return cell;
}

describe("EditableCells", () => {
	let scrollIntoViewMock: Mock<typeof Element.prototype.scrollIntoView>;

	beforeEach(() => {
		scrollIntoViewMock = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoViewMock;

		// @ts-expect-error IntersectionObserver is not found by default.
		window.IntersectionObserver = class IntersectionObserver {
			constructor(cb: (entries: unknown[]) => void) {
				cb([
					{
						isIntersecting: true,
					},
				]);
			}

			observe = vi.fn();
			unobserve = vi.fn();
		};
	});

	it("Should scroll to initial selected cell", () => {
		// Arrange

		Element.prototype.getBoundingClientRect = function () {
			if (this.getAttribute("data-testid") === "CellBlock-2") {
				return {
					...new DOMRect(),
					top: 20,
				};
			} else if (this.getAttribute("data-testid") === "EditableCells") {
				return {
					...new DOMRect(),
					top: 30,
				};
			}
			return new DOMRect();
		};

		let scrolledIntoView = false;
		scrollIntoViewMock.mockImplementation(function (this: Element) {
			if (this.getAttribute("data-testid") === "CellBlock-2") {
				scrolledIntoView = true;
			}
		});

		const cells: Cell[] = [
			createTestCell(1),
			createTestCell(2),
			createTestCell(3),
		];

		// Act

		renderWithProviders(
			<EditableCells
				cells={cells}
				fileMode="single"
				onError={vi.fn()}
				onCellsUpdateSave={vi.fn()}
				initialSelectedCellId="2"
			/>,
		);

		// Assert

		expect(scrolledIntoView).toBe(true);
		expect(scrollIntoViewMock).toHaveBeenCalledOnce();
	});

	it("Should not scroll when selected using click", () => {
		// Arrange

		Element.prototype.getBoundingClientRect = function () {
			if (this.getAttribute("data-testid") === "CellBlock-3") {
				return {
					...new DOMRect(),
					bottom: 30,
				};
			} else if (this.getAttribute("data-testid") === "EditableCells") {
				return {
					...new DOMRect(),
					bottom: 20,
				};
			}
			return new DOMRect();
		};

		let scrolledIntoView = false;
		scrollIntoViewMock.mockImplementation(function (this: Element) {
			if (this.getAttribute("data-testid") === "CellBlock-3") {
				scrolledIntoView = true;
			}
		});

		const cells: Cell[] = [
			createTestCell(1),
			createTestCell(2),
			createTestCell(3),
		];

		renderWithProviders(
			<EditableCells
				cells={cells}
				fileMode="single"
				onError={vi.fn()}
				onCellsUpdateSave={vi.fn()}
			/>,
		);

		// Act

		act(() => {
			screen.getByTestId("CellBlock-3").click();
		});

		// Assert

		expect(scrolledIntoView).toBe(false);
		expect(scrollIntoViewMock).not.toHaveBeenCalled();
	});
});
