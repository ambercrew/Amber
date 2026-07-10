import { Switch, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BookOpenIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { sessionStopped } from "../../../stores/study/studyReducer";
import { startStudySession } from "../../../stores/study/studyActions";
import { selectStudyStatus } from "../../../stores/study/studySelectors";

// TODO: the modal not good (also missing fsrs)
// TODO: more front-end unit tests
// TODO: minimum days before next review
// TODO: get due dates inside buttons
// TODO: reset footer time when navigating between elements, and the queue must refresh on creating new elements
function StudyModeToggle() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const status = useAppSelector(selectStudyStatus);

	function handleClick() {
		if (status === "studying") {
			dispatch(sessionStopped());
			return;
		}
		void dispatch(startStudySession(navigate)).then(started => {
			if (!started) notifications.show({ message: "Nothing due" });
		});
	}

	const studying = status === "studying";

	return (
		<Tooltip label={studying ? "Studying" : "Editing"} refProp="rootRef">
			<Switch
				size="lg"
				checked={studying}
				withThumbIndicator={false}
				onLabel={<BookOpenIcon size={16} />}
				offLabel={<PencilSimpleIcon size={16} />}
				onChange={handleClick}
			/>
		</Tooltip>
	);
}

export default StudyModeToggle;
