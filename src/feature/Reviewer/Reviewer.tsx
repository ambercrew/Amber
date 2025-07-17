import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.module.css";
import ReviewerCell from "../ReviewerCell/ReviewerCell";
import Icon from "@mdi/react";
import { mdiPencilOutline } from "@mdi/js";
import { FSRS, generatorParameters, Grade, Rating, RecordLog } from "ts-fsrs";
import createCardFromCellRepetition from "../../util/createCardFromRepetition";
import durationToString from "../../util/durationToString";
import useGlobalKey from "../../hooks/useGlobalKey";
import Repetition from "../../type/backend/entity/repetition";
import createRepetitionFromCard from "../../util/createRepetitionFromCard";
import Cell from "../../type/backend/entity/cell";
import { getRepetitionsForFiles } from "../../api/repetitionApi";
import Timer from "./Timer";
import { Navigate, useLocation, useNavigate } from "react-router";
import FromRouteState from "../../type/fromRouteState";
import { getCellsForFiles } from "../../api/cellApi";
import errorToString from "../../util/errorToString";
import gradeToRating from "../../util/gradeToRating";
import { registerReview } from "../../api/reviewApi";

interface Props {
	fileIds: number[];
	onEditButtonClick: (fileId: number, cellId: number) => void;
	onError: (message: string) => void;
}

const params = generatorParameters();
const fsrs = new FSRS(params);

function Reviewer({ fileIds, onEditButtonClick, onError }: Props) {
	const [showAnswer, setShowAnswer] = useState(false);
	const [currentCellIndex, setCurrentCellIndex] = useState(0);
	const [isSendingRequest, setIsSendingRequest] = useState(true);
	const [cells, setCells] = useState<Cell[]>([]);
	const [repetitions, setRepetitions] = useState<Repetition[]>([]);
	const studyTime = useRef(0);
	const navigate = useNavigate();
	const startTime = useRef(new Date());
	const location = useLocation();

	useEffect(() => {
		void (async () => {
			try {
				setIsSendingRequest(true);
				setCells(await getCellsForFiles(fileIds));
				setRepetitions(await getRepetitionsForFiles(fileIds));
				setIsSendingRequest(false);
			} catch (e) {
				console.error(e);
				onError(errorToString(e));
			}
		})();
	}, [fileIds, onError]);

	const dueToday = repetitions.filter(
		c => new Date(c.due) <= startTime.current,
	);
	const currentCard =
		dueToday.length > 0
			? createCardFromCellRepetition(dueToday[currentCellIndex])
			: null;

	const schedulingCards: RecordLog | null = useMemo(
		() =>
			currentCard ? fsrs.repeat(currentCard, startTime.current) : null,
		[currentCard, startTime],
	);

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
		if (isSendingRequest || !schedulingCards) {
			return;
		}
		setIsSendingRequest(true);
		try {
			const card = schedulingCards[grade]?.card;
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
			const state = location.state as FromRouteState;
			await navigate(
				{
					pathname: state?.from ?? "/home",
					search: state?.fromSearch,
				},
				{ replace: true },
			);
		} else {
			startTime.current = new Date();
			setCurrentCellIndex(currentCellIndex + 1);
		}
	};

	const isCurrentCellNew = dueToday[currentCellIndex]?.state === "New";
	const isCurrentCellLearning =
		dueToday[currentCellIndex]?.state === "Learning" ||
		dueToday[currentCellIndex]?.state === "Relearning";
	const isCurrentCellReview = dueToday[currentCellIndex]?.state === "Review";

	const counts = {
		new: 0,
		learning: 0,
		review: 0,
	};
	dueToday.forEach((c, i) => {
		if (i < currentCellIndex) {
			return;
		}
		switch (c.state) {
			case "New":
				counts.new += 1;
				break;
			case "Learning":
			case "Relearning":
				counts.learning += 1;
				break;
			case "Review":
				counts.review += 1;
				break;
		}
	});

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
						className="row transparent grey-button"
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
								{counts.new}
							</p>
							<p>+</p>
							<p
								className={`learning-color
                                ${isCurrentCellLearning && styles.underline}`}>
								{counts.learning}
							</p>
							<p>+</p>
							<p
								className={`review-color
                                ${isCurrentCellReview && styles.underline}`}>
								{counts.review}
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

				{showAnswer && schedulingCards && (
					<div className={styles.buttonRow}>
						<div className={styles.buttonColumn}>
							<p>
								{durationToString(
									startTime.current,
									schedulingCards[Rating.Again].card.due,
								)}
							</p>
							<button
								className={styles.againButton}
								onClick={() =>
									void handleGradeSubmit(Rating.Again)
								}
								disabled={isSendingRequest}
								title="(1)">
								Again
							</button>
						</div>
						<div className={styles.buttonColumn}>
							<p>
								{durationToString(
									startTime.current,
									schedulingCards[Rating.Hard].card.due,
								)}
							</p>
							<button
								className={styles.hardButton}
								onClick={() =>
									void handleGradeSubmit(Rating.Hard)
								}
								disabled={isSendingRequest}
								title="(2)">
								Hard
							</button>
						</div>
						<div className={styles.buttonColumn}>
							<p>
								{durationToString(
									startTime.current,
									schedulingCards[Rating.Good].card.due,
								)}
							</p>
							<button
								className={styles.goodButton}
								onClick={() =>
									void handleGradeSubmit(Rating.Good)
								}
								disabled={isSendingRequest}
								title="(3)">
								Good
							</button>
						</div>
						<div className={styles.buttonColumn}>
							<p>
								{durationToString(
									startTime.current,
									schedulingCards[Rating.Easy].card.due,
								)}
							</p>
							<button
								className={styles.easyButton}
								onClick={() =>
									void handleGradeSubmit(Rating.Easy)
								}
								disabled={isSendingRequest}
								title="(4)">
								Easy
							</button>
						</div>
					</div>
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
