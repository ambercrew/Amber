import { NavLink, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router";
import { useElementParams } from "../../../hooks/useElementParams";
import { paths } from "../../../paths";
import ElementNodeIcon from "../../App/components/ElementNodeIcon";
import { StudySessionLocationState } from "../../../types/study/studySessionLocationState";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectStudyQueue } from "../../../stores/study/studySelectors";

const ICON_SIZE = 18;

function PriorityQueuePanel() {
	const navigate = useNavigate();
	const selected = useElementParams();
	const queue = useAppSelector(selectStudyQueue);

	if (queue.length === 0) {
		return (
			// TODO: not correct if the user has not selected study
			<Stack p="md" gap="xs">
				<Text size="sm" c="dimmed">
					Nothing due right now.
				</Text>
			</Stack>
		);
	}

	return (
		<Stack gap={0} py="xs">
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
