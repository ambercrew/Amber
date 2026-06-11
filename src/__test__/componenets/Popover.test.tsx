import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { PluginListener } from "@tauri-apps/api/core";
import Popover from "../../components/Popover/Popover";

vi.mock(import("@tauri-apps/api/app"));
vi.mock(import("../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

describe("Popover", () => {
	beforeEach(() => {
		vi.mocked(onBackButtonPress).mockResolvedValue({
			unregister: vi.fn(),
		} as unknown as PluginListener);
	});

	it("Should render children", () => {
		// Arrange & Act

		render(<Popover onHide={vi.fn()}>content</Popover>);

		// Assert

		expect(screen.getByText("content")).toBeInTheDocument();
	});

	it("Should call onHide when pressing Escape", async () => {
		// Arrange

		const onHide = vi.fn();
		render(
			<Popover onHide={onHide}>
				<button>btn</button>
			</Popover>,
		);
		await userEvent.click(screen.getByText("btn"));

		// Act

		await userEvent.keyboard("{Escape}");

		// Assert

		expect(onHide).toHaveBeenCalled();
	});

	it("Should not call onHide when pressing a non-Escape key", async () => {
		// Arrange

		const onHide = vi.fn();
		render(
			<Popover onHide={onHide}>
				<button>btn</button>
			</Popover>,
		);
		await userEvent.click(screen.getByText("btn"));

		// Act

		await userEvent.keyboard("{Enter}");

		// Assert

		expect(onHide).not.toHaveBeenCalled();
	});

	it("Should call onHide when Android back button is pressed", async () => {
		// Arrange

		const onHide = vi.fn();
		render(<Popover onHide={onHide}>content</Popover>);
		await waitFor(() => expect(onBackButtonPress).toHaveBeenCalled());

		// Act

		const registeredCb = vi.mocked(onBackButtonPress).mock
			.calls[0][0] as () => void;
		registeredCb();

		// Assert

		expect(onHide).toHaveBeenCalled();
	});

	it("Should call a passed onKeyUp handler alongside internal Escape handling", async () => {
		// Arrange

		const onHide = vi.fn();
		const onKeyUp = vi.fn();
		render(
			<Popover onHide={onHide} onKeyUp={onKeyUp}>
				<button>btn</button>
			</Popover>,
		);
		await userEvent.click(screen.getByText("btn"));

		// Act

		await userEvent.keyboard("{Escape}");

		// Assert

		expect(onHide).toHaveBeenCalled();
		expect(onKeyUp).toHaveBeenCalled();
	});

	it("Should pass through additional div props", () => {
		// Arrange & Act

		const onClick = vi.fn();
		render(
			<Popover onHide={vi.fn()} onClick={onClick} data-testid="pop">
				content
			</Popover>,
		);

		// Assert

		expect(screen.getByTestId("pop")).toBeInTheDocument();
	});
});
