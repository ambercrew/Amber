import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../../stores/sync/managers/syncEventManager";
import { sync } from "../../../../stores/sync/syncActions";
import { setIsSyncing } from "../../../../stores/sync/syncReducer";
import { sync as syncApi } from "../../../../api/syncApi";

vi.mock("../../../../stores/sync/managers/syncEventManager");
vi.mock("../../../../api/syncApi.ts");

describe("sync", () => {
	it("Should dispatch and call listeners in correct order", async () => {
		// Arrange

		const dispatch = vi.fn();

		const manager = vi.mocked(defaultGlobalSyncEventManager);
		const notifyListenersMock = vi.fn();
		notifyListenersMock.mockImplementation((type: ListenerType) => {
			// Asserting the order
			if (type === ListenerType.PreSyncStart) {
				expect(dispatch).not.toBeCalledWith(setIsSyncing(true));
			} else if (type === ListenerType.PreSyncComplete) {
				expect(dispatch).not.toBeCalledWith(setIsSyncing(false));
			} else if (type === ListenerType.PostSyncComplete) {
				expect(dispatch).toBeCalledWith(setIsSyncing(false));
			}
		});
		manager.notifyListeners = notifyListenersMock;

		// Act

		const cb = sync();
		await cb(dispatch);

		// Assert

		expect(syncApi).toBeCalled();
		expect(dispatch).toHaveBeenNthCalledWith(1, setIsSyncing(true));
		expect(dispatch).toHaveBeenNthCalledWith(2, setIsSyncing(false));
	});
});
