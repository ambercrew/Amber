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
import { useNavigate } from "react-router";
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
import useAppDispatch from "../../../hooks/useAppDispatch";
import { setFocusedCellId } from "../../../stores/ai/aiReducer";
import { cellTypesDisplayNames } from "../../../api/cells/entities/cell";
import getCellIcon from "../../../utils/getCellIcon";

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
	const navigate = useNavigate();
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
	const dispatch = useAppDispatch();

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

	useEffect(() => {
		if (!dueToday[currentCellIndex]) return;

		const cellId = dueToday[currentCellIndex].repetition.cellId;

		dispatch(setFocusedCellId(cellId));
		return () => {
			dispatch(setFocusedCellId(null));
		};
	}, [dispatch, dueToday, currentCellIndex]);

	const fsrs = useMemo(() => {
		if (dueToday.length === 0) return null;

		const profile = allFsrsProfiles.find(
			p => p.id === dueToday[currentCellIndex].fsrsProfileId,
		)!;

		const params = generatorParameters({
			w: profile.weights,
			maximum_interval: profile.maximumInterval,
			request_retention: profile.requestRetention,
		});
		return new FSRS(params);
	}, [dueToday, currentCellIndex, allFsrsProfiles]);
	const fsrsCard = fsrs
		? createCardFromCellRepetition(dueToday[currentCellIndex].repetition)
		: null;

	const handleGradeSubmit = async (grade: Grade) => {
		if (isSendingRequest || !fsrs || !fsrsCard) {
			return;
		}
		setIsSendingRequest(true);
		await callApi(
			async () => {
				const nextCard = fsrs.next(fsrsCard, new Date(), grade).card;
				const newRepetition = createRepetitionFromCard(
					nextCard,
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

	const buttonRowRecordLog =
		fsrs && fsrsCard ? fsrs.repeat(fsrsCard, currentReviewStartTime) : null;

	useEffect(() => {
		if (!dueToday[currentCellIndex] && !isSendingRequest) void navigate(-1);
	}, [dueToday, currentCellIndex, isSendingRequest, navigate]);

	const currentCell = dueToday[currentCellIndex]
		? cellsWithFsrsProfileIds.find(
				c => c.cell.id === dueToday[currentCellIndex].repetition.cellId,
			)
		: null;

	return (
		<div className={styles.reviewer}>
			<div className={styles.topBar}>
				<div className={styles.topBarLeft}>
					<span
						className={`${styles.countBadge} ${isCurrentCellNew ? styles.countBadgeActive : ""}`}
						title="New count"
						data-testid="new-count">
						<span className="new-color">
							{repetitionsCounts.new}
						</span>
					</span>
					<span
						className={`${styles.countBadge} ${isCurrentCellLearning ? styles.countBadgeActive : ""}`}
						title="Learning count"
						data-testid="learning-count">
						<span className="learning-color">
							{repetitionsCounts.learning}
						</span>
					</span>
					<span
						className={`${styles.countBadge} ${isCurrentCellReview ? styles.countBadgeActive : ""}`}
						data-testid="review-count">
						<span className="review-color" title="Review count">
							{repetitionsCounts.review}
						</span>
					</span>
				</div>
				<div className={styles.topBarRight}>
					<Timer
						key={dueToday[currentCellIndex]?.repetition.id ?? 0}
						onTimeUpdate={handleTimeUpdate}
					/>
					<button
						className={`row transparent ${styles.editButton}`}
						onClick={() =>
							onEditButtonClick(
								dueToday[currentCellIndex].repetition.fileId,
								dueToday[currentCellIndex].repetition.cellId,
							)
						}
						title="Edit card (e)">
						<Icon path={mdiPencilOutline} size={1} />
					</button>
				</div>
			</div>

			<div className={styles.studyBox}>
				<div className={styles.cardTypeLabel}>
					{currentCell ? (
						<>
							<Icon
								path={getCellIcon(currentCell.cell.cellType)}
								size={1}
							/>
							{cellTypesDisplayNames[currentCell.cell.cellType]}
						</>
					) : (
						""
					)}
				</div>

				<div className={styles.studyContent}>
					{dueToday[currentCellIndex] && currentCell && (
						<ReviewerCell
							cell={currentCell.cell}
							repetition={dueToday[currentCellIndex].repetition}
							showAnswer={showAnswer}
							key={currentCellIndex}
						/>
					)}
				</div>
			</div>

			<div className={styles.gradeArea}>
				{!showAnswer && (
					<button
						className={`transparent ${styles.showAnswerButton}`}
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
	);
}

export default Reviewer;
