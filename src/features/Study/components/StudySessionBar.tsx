import { Button, Group, Text, MantineColor } from "@mantine/core";
import { EyeIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
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
} from "../../../stores/study/studySelectors";
import { Rating } from "../../../types/study/rating";

const RATINGS: { rating: Rating; label: string; color: MantineColor }[] = [
	{ rating: "again", label: "Again", color: "red" },
	{ rating: "hard", label: "Hard", color: "orange" },
	{ rating: "good", label: "Good", color: "green" },
	{ rating: "easy", label: "Easy", color: "blue" },
];

function StudySessionBar() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const current = useAppSelector(selectStudyCurrentElement);
	const index = useAppSelector(selectStudyIndex);
	const queue = useAppSelector(selectStudyQueue);
	const cardPhase = useAppSelector(selectStudyCardPhase);

	if (!current) return null;

	const answerHidden = current.type === "card" && cardPhase === "question";

	return (
		<Group h="100%" px="md" justify="space-between" wrap="nowrap">
			<Text size="sm" c="dimmed">
				{index + 1} of {queue.length}
			</Text>

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
		</Group>
	);
}

export default StudySessionBar;
