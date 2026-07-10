import { useEffect, useState } from "react";
import { Box, Button, Group, Text, MantineColor } from "@mantine/core";
import { EyeIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { SIDEBAR_BREAKPOINT } from "../../App/components/App";
import {
	previewCardReview,
	previewNextReading,
} from "../../../api/study/api/studyApi";
import { CardDuePreviewDto } from "../../../api/study/dto/cardDuePreviewDto";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { useElapsedSeconds } from "../../../hooks/useElapsedSeconds";
import {
	finishReadingAction,
	gradeCardAction,
	nextReadingAction,
} from "../../../stores/study/studyActions";
import { answerShown } from "../../../stores/study/studyReducer";
import {
	selectStudyCardPhase,
	selectStudyCurrentElement,
	selectStudyIndex,
	selectStudyQueue,
	selectStudyShownAt,
} from "../../../stores/study/studySelectors";
import { Rating } from "../../../types/study/rating";
import { formatRelativeDueDate } from "../../../utils/formatRelativeDueDate";

const RATINGS: { rating: Rating; label: string; color: MantineColor }[] = [
	{ rating: "again", label: "Again", color: "red" },
	{ rating: "hard", label: "Hard", color: "orange" },
	{ rating: "good", label: "Good", color: "green" },
	{ rating: "easy", label: "Easy", color: "blue" },
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

	if (currentKey !== trackedKey) {
		setTrackedKey(currentKey);
		setCardDuePreview(null);
		setNextReadingDue(null);
	}

	useEffect(() => {
		if (!current) return;

		if (current.type === "card") {
			void previewCardReview(current.id).then(setCardDuePreview);
		} else {
			void previewNextReading(current).then(setNextReadingDue);
		}
	}, [current]);

	if (!current) return null;

	const answerHidden = current.type === "card" && cardPhase === "question";

	return (
		<Group h="100%" px="sm" py="xs" wrap="nowrap" align="flex-end">
			<Box flex={1}>
				<Text size="sm" c="dimmed" visibleFrom={SIDEBAR_BREAKPOINT}>
					{index + 1}/{queue.length}
				</Text>
			</Box>

			{answerHidden ? (
				<Button
					variant="light"
					color="gray"
					size="sm"
					leftSection={<EyeIcon size={16} />}
					onClick={() => dispatch(answerShown())}>
					Show answer
				</Button>
			) : current.type === "card" ? (
				<Group gap="xs" wrap="nowrap" align="flex-end">
					{RATINGS.map(({ rating, label, color }) => (
						<Box key={rating}>
							{cardDuePreview && (
								<Text size="xs" c="dimmed" ta="center" mb={2}>
									{formatRelativeDueDate(
										cardDuePreview[rating],
									)}
								</Text>
							)}
							<Button
								variant="light"
								color={color}
								size="sm"
								fullWidth
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
						</Box>
					))}
				</Group>
			) : (
				<Group gap="xs" wrap="nowrap" align="flex-end">
					<Box>
						<Text size="xs" c="dimmed" ta="center" mb={2}>
							Won&apos;t repeat
						</Text>
						<Button
							variant="default"
							size="sm"
							fullWidth
							onClick={() =>
								void dispatch(
									finishReadingAction(current, navigate),
								)
							}>
							Finish
						</Button>
					</Box>
					<Box>
						{nextReadingDue && (
							<Text size="xs" c="dimmed" ta="center" mb={2}>
								{formatRelativeDueDate(nextReadingDue)}
							</Text>
						)}
						<Button
							variant="filled"
							size="sm"
							fullWidth
							onClick={() =>
								void dispatch(
									nextReadingAction(current, navigate),
								)
							}>
							Next
						</Button>
					</Box>
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
