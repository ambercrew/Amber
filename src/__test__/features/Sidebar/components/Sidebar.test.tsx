import { AppShell } from "@mantine/core";
import { fireEvent, screen } from "@testing-library/react";
import Sidebar from "../../../../features/Sidebar/components/Sidebar";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";

vi.mock(
	import("../../../../features/Sidebar/components/ElementTreePanel"),
	() => ({ default: () => <div>ElementTreePanel</div> }),
);
vi.mock(
	import("../../../../features/Sidebar/components/PriorityQueuePanel"),
	() => ({ default: () => <div>PriorityQueuePanel</div> }),
);

describe("Sidebar", () => {
	function render() {
		return renderWithProviders(
			<AppShell>
				<Sidebar onCollapse={() => undefined} />
			</AppShell>,
		);
	}

	it("Should show ElementTreePanel when tree tab is active", () => {
		// Arrange

		render();

		// Act

		fireEvent.click(screen.getByTitle(/element tree/i));

		// Assert

		expect(screen.getByText("ElementTreePanel")).toBeVisible();
		expect(screen.queryByText("PriorityQueuePanel")).not.toBeVisible();
	});

	it("Should show PriorityQueuePanel when priority queue tab is active", () => {
		// Arrange

		render();

		// Act

		fireEvent.click(screen.getByTitle(/priority queue/i));

		// Assert

		expect(screen.getByText("PriorityQueuePanel")).toBeVisible();
		expect(screen.queryByText("ElementTreePanel")).not.toBeVisible();
	});

	it("Should show ElementTreePanel by default", () => {
		// Arrange

		// Act

		render();

		// Assert

		expect(screen.getByText("ElementTreePanel")).toBeVisible();
		expect(screen.queryByText("PriorityQueuePanel")).not.toBeVisible();
	});
});
