import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { mdiSync } from "@mdi/js";
import { useState } from "react";
import Dialog from "../../../components/Dialog/Dialog";
import Spinner from "../../../components/Spinner/Spinner";
import { sync } from "../../../api/syncApi";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { getReviewTreeFolderForRoot } from "../../../stores/fileSystem/fileSystemActions";

export default function SyncRow() {
    const [isSyncing, setIsSyncing] = useState(false);
    const dispatch = useAppDispatch();

    const handleClick = async () => {
        // TODO: error handling
        try {
            setIsSyncing(true);
            // TODO: refersh current file if user in file
            await sync();
            await dispatch(getReviewTreeFolderForRoot());
        } finally {
            setIsSyncing(false);
        }
    };

	// TODO: sync shortcut
    // TODO: if not logged in ask user to login
    return (
        <>
            {isSyncing && <Dialog className={styles.syncBox}>
                <Spinner />
                <p>Please wait, syncing your data...</p>
            </Dialog>}
            <button
                className={`${styles.row}`}
                title="Sync"
                onClick={() => void handleClick()}>
                <Icon path={mdiSync} size="1em" />
                <p>Sync</p>
            </button>
        </>
    );
}
