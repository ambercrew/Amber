import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.module.css";
import ReviewerCell from "../../ReviewerCell/components/ReviewerCell";
import { Icon } from "@mdi/react";
import { mdiPencilOutline } from "@mdi/js";
import { FSRS, generatorParameters, Grade, Rating } from "ts-fsrs";
import createCardFromCellRepetition from "../utils/createCardFromRepetition";
import useGlobalKey from "../../../hooks/useGlobalKey";
import createRepetitionFromCard from "../utils/createRepetitionFromCard";
import Timer from "./Timer";
import { Navigate } from "react-router";
import { getCellsForFilesWithFsrsProfileIds } from "../../../api/cells/api/cellApi";
import gradeToRating from "../utils/gradeToRating";
import { registerReview } from "../../../api/cells/api/reviewApi";
import sortReviewerRepetitions from "../utils/sortReviewerRepetitions";
import ButtonRow from "./ButtonRow";
import accumulateRepetitionsCounts from "../utils/accumulateRepetitionsCounts";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import FsrsProfile from "../../../api/fsrs/entities/fsrsProfile";
import { getAllFsrsProfiles } from "../../../api/fsrs/api/fsrsApi";
import { CellWithFsrsProfileIdDto } from "../../../api/cells/dto/cellWithFsrsProfileIdDto";
import Repetition from "../../../api/cells/entities/repetition";
import { CallApiFn } from "../../../hooks/useApi";

interface Props {
	fileIds: string[];
	onEditButtonClick: (fileId: string, cellId: string) => void;
	callApi: CallApiFn;
}

export interface RepetitionWithFsrsProfileId {
	repetition: Repetition;
	fsrsProfileId: string;
}

function Reviewer({ fileIds, onEditButtonClick, callApi }: Props) {
	const [showAnswer, setShowAnswer] = useState(false);
	const [currentCellIndex, setCurrentCellIndex] = useState(0);
	const [isSendingRequest, setIsSendingRequest] = useState(true);
	const [cellsWithFsrsProfileIds, setCellsWithFsrsProfileIds] = useState<
		CellWithFsrsProfileIdDto[]
	>([]);
	const [allFsrsProfiles, setAllFsrsProfiles] = useState<FsrsProfile[]>([]);
	const [currentReviewStartTime, setCurrentReviewStartTime] = useState(
		new Date(),
	);
	const studyTime = useRef(0);
	const lastLoadTime = useRef(new Date());

	const loadCells = useCallback(async () => {
		await callApi(async () => {
			setIsSendingRequest(true);
			setAllFsrsProfiles(await getAllFsrsProfiles());
			setCellsWithFsrsProfileIds(
				await getCellsForFilesWithFsrsProfileIds(fileIds),
			);
			setCurrentCellIndex(0);
			setShowAnswer(false);
			setCurrentReviewStartTime(new Date());
			lastLoadTime.current = new Date();
			setIsSendingRequest(false);
		});
	}, [fileIds, callApi]);

	useEffect(() => {
		void loadCells();

		defaultGlobalSyncEventManager.addListener(
			ListenerType.PostSyncComplete,
			loadCells,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PostSyncComplete,
				loadCells,
			);
	}, [loadCells]);

	const dueToday = useMemo(() => {
		return sortReviewerRepetitions(
			cellsWithFsrsProfileIds
				.map(c => {
					return c.cell.repetitions.map(r => ({
						repetition: r,
						fsrsProfileId: c.fsrsProfileId,
					}));
				})
				.flat()
				.filter(
					r => new Date(r.repetition.due) <= currentReviewStartTime,
				),
		);
	}, [cellsWithFsrsProfileIds, currentReviewStartTime]);

	const getRecordLog = useCallback(
		(now: Date) => {
			if (dueToday.length === 0) return null;
			const currentCard = createCardFromCellRepetition(
				dueToday[currentCellIndex].repetition,
			);

			const profile = allFsrsProfiles.find(
				p => p.id === dueToday[currentCellIndex].fsrsProfileId,
			)!;

			const params = generatorParameters({
				w: profile.weights,
				maximum_interval: profile.maximumInterval,
				request_retention: profile.requestRetention,
			});
			const fsrs = new FSRS(params);

			return fsrs.repeat(currentCard, now);
		},
		[dueToday, currentCellIndex, allFsrsProfiles],
	);

	const handleGradeSubmit = async (grade: Grade) => {
		const recordLog = getRecordLog(new Date());

		if (isSendingRequest || !recordLog) {
			return;
		}
		setIsSendingRequest(true);
		await callApi(
			async () => {
				const card = recordLog[grade]?.card;
				const newRepetition = createRepetitionFromCard(
					card,
					dueToday[currentCellIndex].repetition.id,
					dueToday[currentCellIndex].repetition.fileId,
					dueToday[currentCellIndex].repetition.cellId,
					dueToday[currentCellIndex].repetition.additionalContent,
				);
				await registerReview(
					newRepetition,
					gradeToRating(grade),
					studyTime.current,
				);
				studyTime.current = 0;
			},
			() => {
				setIsSendingRequest(false);
				return Promise.resolve();
			},
		);
		setShowAnswer(false);

		const isLastRepetition = currentCellIndex + 1 === dueToday.length;
		const minutesSinceLastLoad =
			(new Date().getTime() - lastLoadTime.current.getTime()) / 60000;

		if (isLastRepetition || minutesSinceLastLoad >= 1) {
			await loadCells();
		} else {
			setCurrentReviewStartTime(new Date());
			setCurrentCellIndex(currentCellIndex + 1);
		}
	};

	useGlobalKey(e => {
		if (e.key === " ") {
			setShowAnswer(true);
		} else if (e.key.toLowerCase() === "e") {
			onEditButtonClick(
				dueToday[currentCellIndex].repetition.fileId,
				dueToday[currentCellIndex].repetition.cellId,
			);
		}

		if (!showAnswer) {
			return;
		}

		if (e.key === "1") {
			void handleGradeSubmit(Rating.Again);
		} else if (e.key === "2") {
			void handleGradeSubmit(Rating.Hard);
		} else if (e.key === "3") {
			void handleGradeSubmit(Rating.Good);
		} else if (e.key === "4") {
			void handleGradeSubmit(Rating.Easy);
		}
	});

	const isCurrentCellNew =
		dueToday[currentCellIndex]?.repetition.state === "new";
	const isCurrentCellLearning =
		dueToday[currentCellIndex]?.repetition.state === "learning" ||
		dueToday[currentCellIndex]?.repetition.state === "relearning";
	const isCurrentCellReview =
		dueToday[currentCellIndex]?.repetition.state === "review";

	const repetitionsCounts = useMemo(
		() =>
			accumulateRepetitionsCounts(
				dueToday
					.filter((_, i) => i >= currentCellIndex)
					.map(c => c.repetition),
			),
		[dueToday, currentCellIndex],
	);

	const handleTimeUpdate = useCallback(
		(time: number) => (studyTime.current = time),
		[],
	);

	const buttonRowRecordLog = getRecordLog(currentReviewStartTime);

	return (
		<div className={`${styles.reviewer}`}>
			{!dueToday[currentCellIndex] && !isSendingRequest && (
				<Navigate replace to="/home" />
			)}

			<div className={styles.countRow}>
				<div
					className={`${styles.countBox} ${isCurrentCellNew ? styles.active : ""}`}>
					<span className={styles.countLabel}>New</span>
					<span
						className={`new-color ${styles.countValue}`}
						data-testid="new-count">
						{repetitionsCounts.new}
					</span>
				</div>
				<div
					className={`${styles.countBox} ${isCurrentCellLearning ? styles.active : ""}`}>
					<span className={styles.countLabel}>Learning</span>
					<span
						className={`learning-color ${styles.countValue}`}
						data-testid="learning-count">
						{repetitionsCounts.learning}
					</span>
				</div>
				<div
					className={`${styles.countBox} ${isCurrentCellReview ? styles.active : ""}`}>
					<span className={styles.countLabel}>To Review</span>
					<span
						className={`review-color ${styles.countValue}`}
						data-testid="review-count">
						{repetitionsCounts.review}
					</span>
				</div>
			</div>

			<div className={styles.studyBox}>
				<div className={styles.studyContent}>
					{dueToday[currentCellIndex] && (
						<ReviewerCell
							cell={
								cellsWithFsrsProfileIds.find(
									c =>
										c.cell.id ===
										dueToday[currentCellIndex].repetition
											.cellId,
								)!.cell
							}
							repetition={dueToday[currentCellIndex].repetition}
							showAnswer={showAnswer}
							key={currentCellIndex}
						/>
					)}
				</div>

				<div className={styles.studyFooter}>
					<div className={styles.footerLeft}>
						<Timer
							key={dueToday[currentCellIndex]?.repetition.id ?? 0}
							onTimeUpdate={handleTimeUpdate}
						/>

						<button
							className={`row transparent ${styles.transparent}`}
							onClick={() =>
								onEditButtonClick(
									dueToday[currentCellIndex].repetition
										.fileId,
									dueToday[currentCellIndex].repetition
										.cellId,
								)
							}
							title="(e)">
							<Icon path={mdiPencilOutline} size={1} />
							<span>Edit</span>
						</button>
					</div>

					<div className={styles.footerRight}>
						{!showAnswer && (
							<button
								className={`transparent ${styles.transparent}`}
								onClick={() => setShowAnswer(true)}
								title="(Space)">
								Show Answer
							</button>
						)}

						{showAnswer && buttonRowRecordLog && (
							<ButtonRow
								startTime={currentReviewStartTime}
								disabled={isSendingRequest}
								onClick={grade => void handleGradeSubmit(grade)}
								recordLog={buttonRowRecordLog}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default Reviewer;
