import { useEffect } from "react";
import { NavLink, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router";
import { useElementParams } from "../../../hooks/useElementParams";
import { paths } from "../../../paths";
import ElementNodeIcon from "../../App/components/ElementNodeIcon";
import { StudySessionLocationState } from "../../../types/study/studySessionLocationState";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import {
	selectStudyQueue,
	selectStudyStatus,
} from "../../../stores/study/studySelectors";
import { queueLoaded } from "../../../stores/study/studyReducer";
import { getDueElements } from "../../../api/study/api/studyApi";
import useApi from "../../../hooks/useApi";

const ICON_SIZE = 18;

function PriorityQueuePanel() {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const selected = useElementParams();
	const status = useAppSelector(selectStudyStatus);
	const queue = useAppSelector(selectStudyQueue);
	const { callApi } = useApi();

	const isStudying = status === "studying";

	useEffect(() => {
		if (isStudying) return;
		void callApi(async () => {
			const queue = await getDueElements();
			dispatch(queueLoaded(queue));
		});
	}, [isStudying, callApi, dispatch]);

	if (queue.length === 0) {
		return (
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
