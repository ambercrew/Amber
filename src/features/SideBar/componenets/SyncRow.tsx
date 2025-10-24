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
import { useEffect, useState } from "react";
import { defaultGlobalSyncEvenetManager } from "../../../stores/sync/manager/syncEventManager";

export default function SyncRow() {
	const [showToast, setShowToast] = useState(false);
	const dispatch = useAppDispatch();
	const isSyncing = useAppSelector(selectIsSyncing);

	useGlobalKey(e => {
		if (e.ctrlKey && e.key.toLowerCase() === "y") {
			e.preventDefault();
			void dispatch(sync());
		}
	});

	useEffect(() => {
		const cb = () => {
			setShowToast(true);
			return Promise.resolve();
		};
		defaultGlobalSyncEvenetManager.addPostSyncListener(cb);
		return () => defaultGlobalSyncEvenetManager.removePostSyncListener(cb);
	}, []);

	return (
		<>
			{showToast && (
				<Toast
					onHide={() => setShowToast(false)}
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
				title="Sync (Ctrl + Y)"
				onClick={() => void dispatch(sync())}>
				<Icon path={mdiSync} size="1em" />
				<p>Sync</p>
			</button>
		</>
	);
}
