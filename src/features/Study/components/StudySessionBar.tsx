import { Box, Button, Group, Text, MantineColor } from "@mantine/core";
import { EyeIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { SIDEBAR_BREAKPOINT } from "../../App/components/App";
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

	if (!current) return null;

	const answerHidden = current.type === "card" && cardPhase === "question";

	return (
		<Group h="100%" px="sm" wrap="nowrap">
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
				<Group gap="xs" wrap="nowrap">
					{RATINGS.map(({ rating, label, color }) => (
						<Button
							key={rating}
							variant="light"
							color={color}
							size="sm"
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
					))}
				</Group>
			) : (
				<Group gap="xs" wrap="nowrap">
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
					<Button
						variant="filled"
						size="sm"
						onClick={() =>
							void dispatch(nextReadingAction(current, navigate))
						}>
						Next
					</Button>
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
