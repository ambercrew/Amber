import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.module.css";
import ReviewerCell from "../../ReviewerCell/components/ReviewerCell";
import Icon from "@mdi/react";
import { mdiPencilOutline } from "@mdi/js";
import { FSRS, generatorParameters, Grade, Rating, RecordLog } from "ts-fsrs";
import createCardFromCellRepetition from "../utils/createCardFromRepetition";
import useGlobalKey from "../../../hooks/useGlobalKey";
import createRepetitionFromCard from "../utils/createRepetitionFromCard";
import Cell from "../../../types/backend/entity/cell";
import Timer from "./Timer";
import { Navigate, useLocation, useNavigate } from "react-router";
import FromRouteState from "../../../types/fromRouteState";
import { getCellsForFiles } from "../../../api/cellApi";
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

interface Props {
	fileIds: string[];
	onEditButtonClick: (fileId: string, cellId: string) => void;
	onError: (message: string) => void;
}

const params = generatorParameters();
const fsrs = new FSRS(params);

function Reviewer({ fileIds, onEditButtonClick, onError }: Props) {
	const [showAnswer, setShowAnswer] = useState(false);
	const [currentCellIndex, setCurrentCellIndex] = useState(0);
	const [isSendingRequest, setIsSendingRequest] = useState(true);
	const [cells, setCells] = useState<Cell[]>([]);
	const studyTime = useRef(0);
	const navigate = useNavigate();
	const startTime = useRef(new Date());
	const location = useLocation();

	const loadCells = useCallback(async () => {
		try {
			setIsSendingRequest(true);
			setCells(await getCellsForFiles(fileIds));
			setCurrentCellIndex(0);
			setShowAnswer(false);
			setIsSendingRequest(false);
		} catch (e) {
			console.error(e);
			onError(errorToString(e));
		}
	}, [fileIds, onError]);

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
			cells
				.map(c => c.repetitions)
				.flat()
				.filter(r => new Date(r.due) <= startTime.current),
		);
	}, [cells]);

	const recordLog: RecordLog | null = useMemo(() => {
		if (dueToday.length === 0) return null;
		const currentCard = createCardFromCellRepetition(
			dueToday[currentCellIndex],
		);

		return fsrs.repeat(currentCard, startTime.current);
	}, [dueToday, startTime, currentCellIndex]);

	useGlobalKey(e => {
		if (e.key === " ") {
			setShowAnswer(true);
		} else if (e.key.toLowerCase() === "e") {
			onEditButtonClick(
				dueToday[currentCellIndex].fileId,
				dueToday[currentCellIndex].cellId,
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

	const handleGradeSubmit = async (grade: Grade) => {
		if (isSendingRequest || !recordLog) {
			return;
		}
		setIsSendingRequest(true);
		try {
			const card = recordLog[grade]?.card;
			const newRepetition = createRepetitionFromCard(
				card,
				dueToday[currentCellIndex].id,
				dueToday[currentCellIndex].fileId,
				dueToday[currentCellIndex].cellId,
				dueToday[currentCellIndex].additionalContent,
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
			startTime.current = new Date();
			setCurrentCellIndex(currentCellIndex + 1);
		}
	};

	const isCurrentCellNew = dueToday[currentCellIndex]?.state === "new";
	const isCurrentCellLearning =
		dueToday[currentCellIndex]?.state === "learning" ||
		dueToday[currentCellIndex]?.state === "relearning";
	const isCurrentCellReview = dueToday[currentCellIndex]?.state === "review";

	const repetitionsCounts = useMemo(
		() =>
			accumulateRepetitionsCounts(
				dueToday.filter((_, i) => i >= currentCellIndex),
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
							cells.find(
								c => c.id === dueToday[currentCellIndex].cellId,
							)!
						}
						repetition={dueToday[currentCellIndex]}
						showAnswer={showAnswer}
						key={currentCellIndex}
					/>
				)}
			</div>

			<div className={styles.bottomBar}>
				<div className={styles.editButtonContainer}>
					<p>&nbsp;</p>
					<button
						className="row grey-button"
						onClick={() =>
							onEditButtonClick(
								dueToday[currentCellIndex].fileId,
								dueToday[currentCellIndex].cellId,
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
                                ${isCurrentCellNew && styles.underline}`}>
								{repetitionsCounts.new}
							</p>
							<p>+</p>
							<p
								className={`learning-color
                                ${isCurrentCellLearning && styles.underline}`}>
								{repetitionsCounts.learning}
							</p>
							<p>+</p>
							<p
								className={`review-color
                                ${isCurrentCellReview && styles.underline}`}>
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
						startTime={startTime.current}
						disabled={isSendingRequest}
						onClick={grade => void handleGradeSubmit(grade)}
						recordLog={recordLog}
					/>
				)}

				<Timer
					key={dueToday[currentCellIndex]?.id ?? 0}
					onTimeUpdate={handleTimeUpdate}
				/>
			</div>
		</div>
	);
}

export default Reviewer;
