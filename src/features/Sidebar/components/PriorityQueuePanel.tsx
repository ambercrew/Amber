import { ActionIcon, Box, NavLink, Stack, Text } from "@mantine/core";
import { IconProps } from "@phosphor-icons/react";
import { cloneElement, ReactElement } from "react";
import { useNavigate } from "react-router";
import { commandIcon } from "../../../commands/commandIcon";
import { useElementParams } from "../../../hooks/useElementParams";
import { paths } from "../../../paths";
import ElementNodeIcon from "../../App/components/ElementNodeIcon";
import { StudySessionLocationState } from "../../../types/study/studySessionLocationState";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectStudyQueue } from "../../../stores/study/studySelectors";
import { openStudySessionSettingsDialog } from "../../../stores/app/appReducer";
import { useDueElementsPreview } from "../../Study/hooks/useDueElementsPreview";
import PanelHeader from "./PanelHeader";

const ICON_SIZE = 18;

function PriorityQueuePanel() {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const selected = useElementParams();
	const queue = useAppSelector(selectStudyQueue);

	useDueElementsPreview();

	const header = (
		<PanelHeader title="Study queue">
			<ActionIcon
				variant="subtle"
				size="md"
				title="Study session settings"
				onClick={() => dispatch(openStudySessionSettingsDialog())}>
				{cloneElement(
					commandIcon(
						"open-study-session-settings",
					) as ReactElement<IconProps>,
					{ size: 20 },
				)}
			</ActionIcon>
		</PanelHeader>
	);

	if (queue.length === 0) {
		return (
			<Stack p="md" gap="xs">
				{header}
				<Text size="sm" c="dimmed">
					Nothing due right now.
				</Text>
			</Stack>
		);
	}

	return (
		<Stack gap={0} py="xs">
			<Box px="md" py="sm">
				{header}
			</Box>
			{queue.map(({ elementId, title }) => {
				const isSelected =
					selected?.type === elementId.type &&
					selected?.id === elementId.id;

				return (
					<NavLink
						key={`${elementId.type}:${elementId.id}`}
						label={title}
						active={isSelected}
						leftSection={
							<ElementNodeIcon
								type={elementId.type}
								size={ICON_SIZE}
							/>
						}
						onClick={() => {
							const state: StudySessionLocationState = {
								studySessionNav: true,
							};
							void navigate(
								paths.element(elementId.type, elementId.id),
								{ state },
							);
						}}
					/>
				);
			})}
		</Stack>
	);
}

export default PriorityQueuePanel;
