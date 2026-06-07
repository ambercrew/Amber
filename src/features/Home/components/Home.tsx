import { useCallback, useEffect, useState } from "react";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectRootFolder } from "../../../stores/fileSystem/fileSystemSelectors";
import ReviewTree from "./ReviewTree";
import styles from "./styles.module.css";
import ReviewHeatmap from "./ReviewHeatmap";
import HomeStatistics from "../../../api/cells/valueObjects/homeStatistics";
import secondsToLongString from "../utils/secondsToLongString";
import { getHomeStatistics } from "../../../api/cells/api/reviewApi";
import { ReviewTreeFolderDto } from "../../../api/fileSystem/dto/reviewTreeFolderDto";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { getReviewTreeFolderForRoot } from "../../../stores/fileSystem/fileSystemActions";
import { CallApiFn } from "../../../hooks/useApi";
import { ReviewTreeFileDto } from "../../../api/fileSystem/dto/reviewTreeFileDto";

interface Props {
	onStudyClick: (fileIds: string[]) => void;
	callApi: CallApiFn;
}

function Home({ onStudyClick, callApi }: Props) {
	const [homeStatistics, setHomeStatistics] = useState<HomeStatistics | null>(
		null,
	);
	const rootFolder = useAppSelector(selectRootFolder);
	const dispatch = useAppDispatch();

	const fetchHomeStatistics = useCallback(async () => {
		await callApi(async () => setHomeStatistics(await getHomeStatistics()));
	}, [callApi]);

	useEffect(() => {
		void (async () => await fetchHomeStatistics())();
		// This is necessary to load the new state after things like review.
		void (async () => await dispatch(getReviewTreeFolderForRoot()))();

		defaultGlobalSyncEventManager.addListener(
			ListenerType.PostSyncComplete,
			fetchHomeStatistics,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PostSyncComplete,
				fetchHomeStatistics,
			);
	}, [fetchHomeStatistics, dispatch]);

	useEffect(() => {
		// Reloading the state.
		const id = setInterval(() => void fetchHomeStatistics(), 60 * 1000);

		return () => clearInterval(id);
	}, [fetchHomeStatistics, dispatch]);

	const handleStudyClick = (
		fileIds: string[],
		item: ReviewTreeFolderDto | ReviewTreeFileDto,
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

	const handleFolderClick = (folder: ReviewTreeFolderDto) => {
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
				<div className={styles.header}>
					<p>Review tree</p>
				</div>

				<div className={styles.mainContent}>
					{rootFolder &&
						rootFolder.files.length +
							rootFolder.subfolders.length ===
							0 && (
							<div className={styles.row}>
								<p>
									Create a file to see it in the review tree.
								</p>
							</div>
						)}

					{rootFolder && (
						<ReviewTree
							folder={rootFolder}
							onFileClick={file =>
								handleStudyClick([file.id], file)
							}
							onFolderClick={handleFolderClick}
						/>
					)}
				</div>
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
