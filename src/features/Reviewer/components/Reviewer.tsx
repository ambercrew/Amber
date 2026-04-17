import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.module.css";
import ReviewerCell from "../../ReviewerCell/components/ReviewerCell";
import { Icon } from "@mdi/react";
import { mdiPencilOutline } from "@mdi/js";
import { FSRS, generatorParameters, Grade, Rating, RecordLog } from "ts-fsrs";
import createCardFromCellRepetition from "../utils/createCardFromRepetition";
import useGlobalKey from "../../../hooks/useGlobalKey";
import createRepetitionFromCard from "../utils/createRepetitionFromCard";
import Timer from "./Timer";
import { Navigate, useLocation, useNavigate } from "react-router";
import FromRouteState from "../../../types/fromRouteState";
import { getCellsForFilesWithFsrsProfileIds } from "../../../api/cellApi";
import errorToString from "../../../utils/errorToString";
import gradeToRating from "../utils/gradeToRating";
import { registerReview } from "../../../api/reviewApi";
import sortReviewerRepetitions from "../utils/sortReviewerRepetitions";
import ButtonRow from "./ButtonRow";
import accumulateRepetitionsCounts from "../utils/accumulateRepetitionsCounts";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import FsrsProfile from "../../../types/backend/entity/fsrsProfile";
import { getAllFsrsProfiles } from "../../../api/fsrsApi";
import { CellWithFsrsProfileId } from "../../../types/backend/dto/cellWithFsrsProfileId";
import Repetition from "../../../types/backend/entity/repetition";

interface Props {
	fileIds: string[];
	onEditButtonClick: (fileId: string, cellId: string) => void;
	onError: (message: string) => void;
}

export interface RepetitionWithFsrsProfileId {
	repetition: Repetition;
	fsrsProfileId: string;
}

function Reviewer({ fileIds, onEditButtonClick, onError }: Props) {
	const [showAnswer, setShowAnswer] = useState(false);
	const [currentCellIndex, setCurrentCellIndex] = useState(0);
	const [isSendingRequest, setIsSendingRequest] = useState(true);
	const [cellsWithFsrsProfileIds, setCellsWithFsrsProfileIds] = useState<
		CellWithFsrsProfileId[]
	>([]);
	const [allFsrsProfiles, setAllFsrsProfiles] = useState<FsrsProfile[]>([]);
	const [startTime, setStartTime] = useState(new Date());
	const studyTime = useRef(0);
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const loadCells = async () => {
			try {
				setIsSendingRequest(true);
				setAllFsrsProfiles(await getAllFsrsProfiles());
				setCellsWithFsrsProfileIds(
					await getCellsForFilesWithFsrsProfileIds(fileIds),
				);
				setCurrentCellIndex(0);
				setShowAnswer(false);
				setIsSendingRequest(false);
			} catch (e) {
				console.error(e);
				onError(errorToString(e));
			}
		};

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
	}, [fileIds, onError]);

	const dueToday = useMemo(() => {
		return sortReviewerRepetitions(
			cellsWithFsrsProfileIds
				.map(c => {
					return c.cell.repetitions.map(
						r =>
							({
								repetition: r,
								fsrsProfileId: c.fsrsProfileId,
							}) as RepetitionWithFsrsProfileId,
					);
				})
				.flat()
				.filter(r => new Date(r.repetition.due) <= startTime),
		);
	}, [cellsWithFsrsProfileIds, startTime]);

	const recordLog: RecordLog | null = useMemo(() => {
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

		return fsrs.repeat(currentCard, startTime);
	}, [dueToday, startTime, currentCellIndex, allFsrsProfiles]);

	const handleGradeSubmit = async (grade: Grade) => {
		if (isSendingRequest || !recordLog) {
			return;
		}
		setIsSendingRequest(true);
		try {
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
		} catch (e) {
			onError("An error happened!");
			console.error(e);
		} finally {
			setIsSendingRequest(false);
		}
		setShowAnswer(false);

		if (currentCellIndex + 1 === dueToday.length) {
			const locationState = location.state as FromRouteState;
			await navigate(
				{
					pathname: locationState?.from ?? "/home",
					search: locationState?.fromSearch,
				},
				{ replace: true },
			);
		} else {
			setStartTime(new Date());
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

	return (
		<div className={styles.reviewer}>
			{!dueToday[currentCellIndex] && !isSendingRequest && (
				<Navigate replace to="/home" />
			)}

			<div className={`${styles.container}`}>
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

			<div className={styles.bottomBar}>
				<div className={styles.editButtonContainer}>
					<Timer
						key={dueToday[currentCellIndex]?.repetition.id ?? 0}
						onTimeUpdate={handleTimeUpdate}
					/>
					<button
						className="row grey-button"
						onClick={() =>
							onEditButtonClick(
								dueToday[currentCellIndex].repetition.fileId,
								dueToday[currentCellIndex].repetition.cellId,
							)
						}
						title="(e)">
						<Icon path={mdiPencilOutline} size={1} />
						<span>Edit</span>
					</button>
				</div>

				{!showAnswer && (
					<div className={styles.buttonColumn}>
						<div className={styles.countRow}>
							<p
								className={`new-color
                                ${isCurrentCellNew && styles.underline}`}
								data-testid="new-count">
								{repetitionsCounts.new}
							</p>
							<p>+</p>
							<p
								className={`learning-color
                                ${isCurrentCellLearning && styles.underline}`}
								data-testid="learning-count">
								{repetitionsCounts.learning}
							</p>
							<p>+</p>
							<p
								className={`review-color
                                ${isCurrentCellReview && styles.underline}`}
								data-testid="review-count">
								{repetitionsCounts.review}
							</p>
						</div>
						<button
							className="primary"
							onClick={() => setShowAnswer(true)}
							title="(Space)">
							Show Answer
						</button>
					</div>
				)}

				{showAnswer && recordLog && (
					<ButtonRow
						startTime={startTime}
						disabled={isSendingRequest}
						onClick={grade => void handleGradeSubmit(grade)}
						recordLog={recordLog}
					/>
				)}
			</div>
		</div>
	);
}

export default Reviewer;
