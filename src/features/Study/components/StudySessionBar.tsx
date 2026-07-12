import { useEffect, useRef, useState } from "react";
import { Box, Button, Group, Text, Tooltip } from "@mantine/core";
import { useNavigate } from "react-router";
import { SIDEBAR_BREAKPOINT } from "../../App/components/App";
import {
	previewCardReview,
	previewNextReading,
} from "../../../api/study/api/studyApi";
import { CardDuePreviewDto } from "../../../api/study/dto/cardDuePreviewDto";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { useElapsedSeconds } from "../hooks/useElapsedSeconds";
import {
	finishReadingAction,
	gradeCardAction,
	nextReadingAction,
} from "../../../stores/study/studyActions";
import { answerShown, elementShown } from "../../../stores/study/studyReducer";
import {
	selectStudyCardPhase,
	selectStudyCurrentElement,
	selectStudyIndex,
	selectStudyQueue,
	selectStudyShownAt,
} from "../../../stores/study/studySelectors";
import { Rating } from "../../../types/study/rating";
import { formatRelativeDueDate } from "../../../utils/formatRelativeDueDate";

const RATINGS: { rating: Rating; label: string }[] = [
	{ rating: "again", label: "Again" },
	{ rating: "hard", label: "Hard" },
	{ rating: "good", label: "Good" },
	{ rating: "easy", label: "Easy" },
];

function formatElapsed(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function StudySessionBar() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const current = useAppSelector(selectStudyCurrentElement);
	const index = useAppSelector(selectStudyIndex);
	const queue = useAppSelector(selectStudyQueue);
	const cardPhase = useAppSelector(selectStudyCardPhase);
	const shownAt = useAppSelector(selectStudyShownAt);
	const elapsedSeconds = useElapsedSeconds(shownAt);
	const currentKey = current ? `${current.type}:${current.id}` : null;
	const [trackedKey, setTrackedKey] = useState(currentKey);
	const [cardDuePreview, setCardDuePreview] =
		useState<CardDuePreviewDto | null>(null);
	const [nextReadingDue, setNextReadingDue] = useState<string | null>(null);
	const isFirstRender = useRef(true);

	if (currentKey !== trackedKey) {
		setTrackedKey(currentKey);
		setCardDuePreview(null);
		setNextReadingDue(null);
	}

	useEffect(() => {
		if (!current) return;

		// Skip the mount that lands on whichever element the session already
		// started/advanced to — only reset the timer/phase for element
		// changes that happen afterwards (e.g. a jump via the priority
		// queue), which the session-advance actions don't already handle.
		if (isFirstRender.current) {
			isFirstRender.current = false;
		} else {
			dispatch(elementShown());
		}

		if (current.type === "card") {
			void previewCardReview(current.id).then(setCardDuePreview);
		} else {
			void previewNextReading(current).then(setNextReadingDue);
		}
	}, [current, dispatch]);

	if (!current) return null;

	const answerHidden = current.type === "card" && cardPhase === "question";

	return (
		<Group h="100%" px="sm" py="xs" wrap="nowrap" align="center">
			<Box flex={1}>
				<Text size="sm" c="dimmed" visibleFrom={SIDEBAR_BREAKPOINT}>
					{index + 1}/{queue.length}
				</Text>
			</Box>

			{answerHidden ? (
				<Button
					variant="default"
					size="sm"
					onClick={() => dispatch(answerShown())}>
					Show answer
				</Button>
			) : current.type === "card" ? (
				<Group gap="xs" wrap="nowrap" align="flex-end">
					{RATINGS.map(({ rating, label }) => (
						<Tooltip
							key={rating}
							label={
								cardDuePreview
									? formatRelativeDueDate(
											cardDuePreview[rating],
										)
									: ""
							}
							disabled={!cardDuePreview}>
							<Button
								size="sm"
								variant="default"
								onClick={() =>
									void dispatch(
										gradeCardAction(
											current.id,
											rating,
											navigate,
										),
									)
								}>
								{label}
							</Button>
						</Tooltip>
					))}
				</Group>
			) : (
				<Group gap="xs" wrap="nowrap" align="flex-end">
					<Tooltip
						label={
							nextReadingDue
								? formatRelativeDueDate(nextReadingDue)
								: ""
						}
						disabled={!nextReadingDue}>
						<Button
							variant="default"
							size="sm"
							onClick={() =>
								void dispatch(
									nextReadingAction(current, navigate),
								)
							}>
							Next
						</Button>
					</Tooltip>
					<Tooltip label="Won't repeat">
						<Button
							variant="default"
							size="sm"
							onClick={() =>
								void dispatch(
									finishReadingAction(current, navigate),
								)
							}>
							Finish
						</Button>
					</Tooltip>
				</Group>
			)}

			<Box
				flex={1}
				style={{ display: "flex", justifyContent: "flex-end" }}>
				<Text size="sm" c="dimmed" visibleFrom={SIDEBAR_BREAKPOINT}>
					{formatElapsed(elapsedSeconds)}
				</Text>
			</Box>
		</Group>
	);
}

export default StudySessionBar;
