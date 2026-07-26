import { useEffect, useState } from "react";
import { Button, Group, Modal, Slider, Stack, Text } from "@mantine/core";
import { getFuzzFactor, setFuzzFactor } from "../../../api/study/api/studyApi";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { closeStudySessionSettingsDialog } from "../../../stores/app/appReducer";
import { selectIsStudySessionSettingsDialogOpened } from "../../../stores/app/appSelectors";
import { STUDY_SESSION_SETTINGS_CHANGED } from "../../../types/events/studySessionSettingsChangedEvent";
import { useIsSmallScreen } from "../../../hooks/useIsSmallScreen";

function StudySessionSettingsDialog() {
	const opened = useAppSelector(selectIsStudySessionSettingsDialogOpened);
	const dispatch = useAppDispatch();
	const isSmallScreen = useIsSmallScreen();

	const [fuzzFactor, setLocalFuzzFactor] = useState<number | null>(null);

	useEffect(() => {
		if (!opened) return;
		void getFuzzFactor().then(setLocalFuzzFactor);
	}, [opened]);

	function handleClose() {
		dispatch(closeStudySessionSettingsDialog());
	}

	function handleApply() {
		if (fuzzFactor === null) return;
		void setFuzzFactor(fuzzFactor).then(() => {
			window.dispatchEvent(new Event(STUDY_SESSION_SETTINGS_CHANGED));
			handleClose();
		});
	}

	return (
		<Modal
			opened={opened}
			onClose={handleClose}
			title="Study session settings"
			fullScreen={isSmallScreen}
			centered
			closeButtonProps={{ "aria-label": "Close" }}>
			{fuzzFactor === null ? (
				<Text size="sm" c="dimmed">
					Loading…
				</Text>
			) : (
				<Stack gap="lg">
					<Stack gap={4}>
						<Text size="sm" fw={500}>
							Degree of randomization
						</Text>
						<Text size="xs" c="dimmed">
							0 keeps the due queue in strict priority order, 100
							shuffles it entirely.
						</Text>
						<Slider
							value={fuzzFactor}
							onChange={setLocalFuzzFactor}
							min={0}
							max={100}
							label={value => `${value}%`}
						/>
					</Stack>
					<Group justify="flex-end">
						<Button variant="default" onClick={handleClose}>
							Cancel
						</Button>
						<Button onClick={handleApply}>Apply</Button>
					</Group>
				</Stack>
			)}
		</Modal>
	);
}

export default StudySessionSettingsDialog;
