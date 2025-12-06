import { useCallback, useEffect, useState } from "react";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectRootFolder } from "../../../stores/fileSystem/fileSystemSelectors";
import ReviewTree from "./ReviewTree";
import styles from "./styles.module.css";
import ReviewHeatmap from "./ReviewHeatmap";
import HomeStatistics from "../../../types/backend/dto/homeStatistics";
import errorToString from "../../../utils/errorToString";
import secondsToLongString from "../utils/secondsToLongString";
import { getHomeStatistics } from "../../../api/reviewApi";
import {
	ReviewTreeFile,
	ReviewTreeFolder,
} from "../../../types/backend/dto/reviewTreeFolder";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";

interface IProps {
	onStudyClick: (fileIds: string[]) => void;
	onError: (message: string) => void;
}

function Home({ onStudyClick, onError }: IProps) {
	const [homeStatistics, setHomeStatistics] = useState<HomeStatistics | null>(
		null,
	);
	const rootFolder = useAppSelector(selectRootFolder);

	const fetchHomeStatistics = useCallback(async () => {
		try {
			setHomeStatistics(await getHomeStatistics());
		} catch (e) {
			console.error(e);
			onError(errorToString(e));
		}
	}, [onError]);

	useEffect(() => {
		void (async () => await fetchHomeStatistics())();

		defaultGlobalSyncEventManager.addListener(
			ListenerType.PostSyncComplete,
			fetchHomeStatistics,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PostSyncComplete,
				fetchHomeStatistics,
			);
	}, [fetchHomeStatistics]);

	const handleStudyClick = (
		fileIds: string[],
		item: ReviewTreeFolder | ReviewTreeFile,
	) => {
		if (
			item.repetitionCounts.new +
			item.repetitionCounts.review +
			item.repetitionCounts.learning +
			item.repetitionCounts.relearning
		) {
			onStudyClick(fileIds);
		}
	};

	const handleFolderClick = (folder: ReviewTreeFolder) => {
		const fileIds = [];
		const folderQueue = [folder];
		while (folderQueue.length > 0) {
			const currentFolder = folderQueue.pop()!;
			for (const file of currentFolder.files) {
				fileIds.push(file.id);
			}
			folderQueue.push(...currentFolder.subfolders);
		}
		handleStudyClick(fileIds, folder);
	};

	const secondsPerCard =
		homeStatistics && homeStatistics.numberOfReviews > 0
			? homeStatistics.totalTime / homeStatistics.numberOfReviews
			: 0;

	return (
		<div className={styles.home}>
			<div className={styles.box}>
				<div className={styles.row + " " + styles.header}>
					<div className={styles.buttons}>
						<span>{/* Empty to fill the first column */}</span>
						<p>Files</p>
					</div>
					<div className={styles.columns}>
						<p>New</p>
						<p>Learn</p>
						<p>Review</p>
					</div>
				</div>
				{rootFolder &&
					rootFolder.files.length + rootFolder.subfolders.length ===
						0 && <p>Create a file to see it in the review tree.</p>}
				{rootFolder && (
					<ReviewTree
						folder={rootFolder}
						indentationLevel={-1}
						onFileClick={file => handleStudyClick([file.id], file)}
						onFolderClick={handleFolderClick}
					/>
				)}
			</div>

			{homeStatistics && (
				<>
					<p className={styles.reviewsOverview}>
						Studied {homeStatistics.numberOfReviews} cards in
						{" " +
							secondsToLongString(homeStatistics.totalTime)}{" "}
						today ({secondsPerCard.toFixed(1) + " "}
						s/card)
					</p>
					<ReviewHeatmap homeStatistics={homeStatistics} />
				</>
			)}
		</div>
	);
}

export default Home;
