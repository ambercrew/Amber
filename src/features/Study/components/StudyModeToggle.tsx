import { Switch, Tooltip } from "@mantine/core";
import { BookOpenIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useRunCommand } from "../../../commands/useRunCommand";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectStudyStatus } from "../../../stores/study/studySelectors";

function StudyModeToggle() {
	const run = useRunCommand();
	const status = useAppSelector(selectStudyStatus);

	const studying = status === "studying";

	return (
		<Tooltip label={studying ? "Studying" : "Editing"} refProp="rootRef">
			<Switch
				size="lg"
				checked={studying}
				withThumbIndicator={false}
				onLabel={<BookOpenIcon size={16} />}
				offLabel={<PencilSimpleIcon size={16} />}
				onChange={() => run("toggle-study-session")}
			/>
		</Tooltip>
	);
}

export default StudyModeToggle;
