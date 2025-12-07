import { render, screen } from "@testing-library/react";
import useLocalStorage from "../../hooks/useLocalStorage";
import userEvent from "@testing-library/user-event";

describe("useLocalStorage", () => {
	it("Should re-render when updated and update local storage", async () => {
		// Arrange

		const Component = () => {
			const [text, setText] = useLocalStorage("test-key", "old value");

			return (
				<>
					<p>{text}</p>
					<button onClick={() => setText("new value")}>Change</button>
				</>
			);
		};

		render(<Component />);

		// Act

		await userEvent.click(screen.getByText("Change"));

		// Assert

		expect(screen.queryByText("new value")).not.toBeNull();
		expect(localStorage.getItem("test-key")).toBe('"new value"');
	});
});
