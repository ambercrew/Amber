type SyncEventListenerCallback = () => Promise<void>;

/** Manages the set of listeners that listen to when the sync operation starts
 * and ends.
 * The listeners can listen to pre-sync event, and to post-sync if it succeeded.
 */
export default class SyncEventManager {
	private preSyncListeners = new Set<SyncEventListenerCallback>();
	private postSyncListeners = new Set<SyncEventListenerCallback>();

	addPreSyncListener(callback: SyncEventListenerCallback) {
		this.preSyncListeners.add(callback);
	}

	removePreSyncListener(callback: SyncEventListenerCallback) {
		this.preSyncListeners.delete(callback);
	}

	addPostSyncListener(callback: SyncEventListenerCallback) {
		this.postSyncListeners.add(callback);
	}

	removePostSyncListener(callback: SyncEventListenerCallback) {
		this.postSyncListeners.delete(callback);
	}

	async notifyPreSync() {
		for (const listener of this.preSyncListeners) {
			await listener();
		}
	}

	async notifyPostSync() {
		for (const listener of this.postSyncListeners) {
			await listener();
		}
	}
}

export const defaultGlobalSyncEvenetManager = new SyncEventManager();
