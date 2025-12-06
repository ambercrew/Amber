import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { mdiSync } from "@mdi/js";
import Dialog from "../../../components/Dialog/Dialog";
import Spinner from "../../../components/Spinner/Spinner";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useGlobalKey from "../../../hooks/useGlobalKey";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSyncing } from "../../../stores/sync/syncSelector";
import { sync } from "../../../stores/sync/syncActions";
import Toast from "../../../components/Toast/Toast";
import { useEffect, useRef, useState } from "react";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";

export default function SyncRow() {
	const [showToast, setShowToast] = useState(false);
	const focusedElementBeforeSync = useRef<HTMLElement | null>(null);
	const dispatch = useAppDispatch();
	const isSyncing = useAppSelector(selectIsSyncing);

	useGlobalKey(e => {
		if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "y") {
			e.preventDefault();
			void dispatch(sync());
		}
	});

	useEffect(() => {
		const cb = () => {
			setShowToast(true);
			focusedElementBeforeSync.current?.focus();
			return Promise.resolve();
		};
		defaultGlobalSyncEventManager.addListener(
			ListenerType.PostSyncComplete,
			cb,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PostSyncComplete,
				cb,
			);
	}, []);

	useEffect(() => {
		const cb = () => {
			if (
				document.activeElement !== null &&
				document.activeElement instanceof HTMLElement
			) {
				focusedElementBeforeSync.current = document.activeElement;
				// Moving focus from anything.
				document.activeElement.blur();
			}
			return Promise.resolve();
		};
		defaultGlobalSyncEventManager.addListener(
			ListenerType.PreSyncStart,
			cb,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PreSyncStart,
				cb,
			);
	}, []);

	return (
		<>
			{showToast && (
				<Toast
					onHide={() => setShowToast(false)}
					timeoutInMilliSeconds={5000}
					text="✅ Sync completed"
				/>
			)}
			{isSyncing && (
				<Dialog className={styles.syncBox}>
					<Spinner />
					<p>Please wait, syncing your data...</p>
				</Dialog>
			)}
			<button
				className={`${styles.row}`}
				title="Sync (Ctrl + Shift + Y)"
				onClick={() => void dispatch(sync())}>
				<Icon path={mdiSync} size="1em" />
				<p>Sync</p>
			</button>
		</>
	);
}
