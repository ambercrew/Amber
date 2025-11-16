import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { CloseRequestedEventManager } from "../../managers/closeRequestedEventManager";

vi.mock(import("@tauri-apps/api/window"));

describe("CloseRequestedEventManager", () => {
	let onCloseRequestedMock: ReturnType<typeof vi.fn>;
	let manager: CloseRequestedEventManager;

	beforeEach(() => {
		onCloseRequestedMock = vi.fn();
		manager = new CloseRequestedEventManager();

		vi.mocked(getCurrentWindow).mockReturnValue({
			onCloseRequested: onCloseRequestedMock,
		} as Partial<Window> as Window);
	});

	it("Should call handlers on tauri close requested event", async () => {
		// Arrange

		const cb = vi.fn();
		manager.addHandler("test 1", {
			priority: 1,
			cb,
		});

		// Act

		await (onCloseRequestedMock.mock.calls[0][0] as () => Promise<void>)();

		// Assert

		expect(cb).toBeCalled();
	});

	it("Should not call removed handler", async () => {
		// Arrange

		const cb0 = vi.fn();
		manager.addHandler("test 0", {
			priority: 0,
			cb: cb0,
		});

		const cb1 = vi.fn();
		manager.addHandler("test 1", {
			priority: 1,
			cb: cb1,
		});

		// Act

		manager.removeHandler("test 1");
		await (onCloseRequestedMock.mock.calls[0][0] as () => Promise<void>)();

		// Assert
		expect(cb0).toBeCalled();
		expect(cb1).not.toBeCalled();
	});

	it("Should call handlers in correct order", async () => {
		// Arrange

		const cb1 = vi.fn();
		manager.addHandler("test 1", {
			priority: 1,
			cb: cb1,
		});

		const cb0 = vi.fn();
		cb0.mockImplementation(() => {
			expect(cb1).not.toBeCalled();
		});
		manager.addHandler("test 0", {
			priority: 0,
			cb: cb0,
		});

		// Act & Assert

		await (onCloseRequestedMock.mock.calls[0][0] as () => Promise<void>)();

		expect(cb0).toBeCalled();
		expect(cb1).toBeCalled();
	});
});
