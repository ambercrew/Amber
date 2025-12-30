import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../../stores/sync/managers/syncEventManager";
import { sync } from "../../../../stores/sync/syncActions";
import { setIsSyncing } from "../../../../stores/sync/syncReducer";
import { sync as syncApi } from "../../../../api/syncApi";
import { RootState } from "../../../../stores/store";

vi.mock("../../../../stores/sync/managers/syncEventManager");
vi.mock("../../../../api/syncApi.ts");

const createGetState = ({
	isSignedIn,
	isEmailVerified,
}: {
	isSignedIn: boolean;
	isEmailVerified: boolean;
}) => {
	const state = {
		user: {
			isSignedIn,
			userInformation: {
				isEmailVerified,
			},
		},
	} as RootState;

	return () => state;
};

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
		await cb(
			dispatch,
			createGetState({
				isEmailVerified: true,
				isSignedIn: true,
			}),
		);

		// Assert

		expect(syncApi).toBeCalled();
		expect(dispatch).toHaveBeenNthCalledWith(1, setIsSyncing(true));
		expect(dispatch).toHaveBeenNthCalledWith(2, setIsSyncing(false));
	});

	it("Should not sync when email is not verified", async () => {
		// Arrange

		const dispatch = vi.fn();

		// Act

		const cb = sync();
		await cb(
			dispatch,
			createGetState({
				isEmailVerified: false,
				isSignedIn: true,
			}),
		);

		// Assert

		expect(syncApi).not.toBeCalled();
	});

	it("Should not sync when user is not signed in", async () => {
		// Arrange

		const dispatch = vi.fn();

		// Act

		const cb = sync();
		await cb(
			dispatch,
			createGetState({
				isEmailVerified: true,
				isSignedIn: false,
			}),
		);

		// Assert

		expect(syncApi).not.toBeCalled();
	});
});
