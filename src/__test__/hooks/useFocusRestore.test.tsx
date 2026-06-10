import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import useFocusRestore from "../../hooks/useFocusRestore";

function ComponentWithFocusRestore() {
	useFocusRestore();
	return <div>Popup</div>;
}

describe("useFocusRestore", () => {
	it("Should focus last focused element when component is unmounted", async () => {
		// Arrange

		function Component() {
			const [showPopup, setShowPopup] = useState(false);

			return (
				<>
					<button onClick={() => setShowPopup(true)}>Open</button>
					{showPopup && <ComponentWithFocusRestore />}
				</>
			);
		}

		render(<Component />);

		// Act

		await userEvent.click(screen.getByText("Open"));
		await userEvent.click(screen.getByText("Popup"));
		await userEvent.click(screen.getByText("Open")); // unmounts the popup

		// Assert

		expect(document.activeElement?.tagName.toLowerCase()).toBe("button");
	});

	it("Should focus last focused element when focus moves to body before unmount", async () => {
		// Arrange

		function Component() {
			const [showPopup, setShowPopup] = useState(false);

			return (
				<>
					<button onClick={() => setShowPopup(true)}>Open</button>
					{showPopup && (
						<>
							<ComponentWithFocusRestore />
							<button onClick={() => setShowPopup(false)}>
								Close
							</button>
						</>
					)}
				</>
			);
		}

		render(<Component />);

		// Act

		await userEvent.click(screen.getByText("Open"));
		await userEvent.click(screen.getByText("Close"));

		// Assert

		expect(document.activeElement?.tagName.toLowerCase()).toBe("button");
	});
});
