import { Switch, Tooltip } from "@mantine/core";
import { IconProps } from "@phosphor-icons/react";
import { cloneElement, ReactElement } from "react";
import { commandIcon } from "../../../commands/commandIcon";
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
				onLabel={cloneElement(
					commandIcon("enter-study-mode") as ReactElement<IconProps>,
					{ size: 16 },
				)}
				offLabel={cloneElement(
					commandIcon("enter-edit-mode") as ReactElement<IconProps>,
					{ size: 16 },
				)}
				onChange={() =>
					run(studying ? "enter-edit-mode" : "enter-study-mode")
				}
			/>
		</Tooltip>
	);
}

export default StudyModeToggle;
