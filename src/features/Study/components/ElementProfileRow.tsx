import { useEffect, useState } from "react";
import { ActionIcon, Badge, Button, Group, Select } from "@mantine/core";
import { GearSixIcon } from "@phosphor-icons/react";
import {
	assignStudyProfile,
	getEffectiveStudyProfile,
	listStudyProfiles,
} from "../../../api/study/api/studyProfileApi";
import {
	EffectiveProfileDto,
	StudyProfileDto,
} from "../../../api/study/dto/studyProfileDto";
import {
	getCardReview,
	getReadingReview,
	unfinishReading,
} from "../../../api/study/api/studyApi";
import useApi from "../../../hooks/useApi";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { openStudyProfileModal } from "../../../stores/app/appReducer";
import { ElementId } from "../../../types/elements/elementId";

interface ElementProfileRowProps {
	elementId: ElementId;
}

const CREATE_PROFILE_VALUE = "__create__";
const INHERIT_VALUE = "";

const SOURCE_LABELS: Record<EffectiveProfileDto["source"], string> = {
	direct: "Direct",
	inherited: "Inherited",
	default: "Default",
};

function formatDueState(due: string | null, finished: boolean): string | null {
	if (finished) return "Finished";
	if (!due) return "New";
	const dueDate = new Date(due);
	const now = new Date();
	const startOfDue = new Date(
		dueDate.getFullYear(),
		dueDate.getMonth(),
		dueDate.getDate(),
	);
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	const diffDays = Math.round(
		(startOfDue.getTime() - startOfToday.getTime()) / 86_400_000,
	);
	if (diffDays <= 0) return "Due today";
	if (diffDays === 1) return "Due tomorrow";
	return `In ${diffDays} days`;
}

function ElementProfileRow({ elementId }: ElementProfileRowProps) {
	const dispatch = useAppDispatch();
	const { callApi } = useApi();
	const [profiles, setProfiles] = useState<StudyProfileDto[]>([]);
	const [effective, setEffective] = useState<EffectiveProfileDto | null>(
		null,
	);
	const [dueState, setDueState] = useState<string | null>(null);
	const [finished, setFinished] = useState(false);

	async function loadStatus() {
		const [profileList, effectiveProfile] = await Promise.all([
			listStudyProfiles(),
			getEffectiveStudyProfile(elementId),
		]);
		setProfiles(profileList);
		setEffective(effectiveProfile);

		if (elementId.type === "card") {
			const review = await getCardReview(elementId.id);
			setFinished(false);
			setDueState(formatDueState(review?.due ?? null, false));
		} else if (
			elementId.type === "reading" ||
			elementId.type === "extract"
		) {
			const review = await getReadingReview(elementId);
			const isFinished = Boolean(review?.finishedAt);
			setFinished(isFinished);
			setDueState(formatDueState(review?.due ?? null, isFinished));
		} else {
			setDueState(null);
			setFinished(false);
		}
	}

	useEffect(() => {
		void callApi(loadStatus);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [elementId.type, elementId.id, callApi]);

	function handleProfileChange(value: string | null) {
		if (value === CREATE_PROFILE_VALUE) {
			dispatch(openStudyProfileModal());
			return;
		}
		void callApi(async () => {
			const profileId = value === INHERIT_VALUE ? null : value;
			await assignStudyProfile(elementId, profileId);
			await loadStatus();
		});
	}

	function handleUnfinish() {
		void callApi(async () => {
			await unfinishReading(elementId);
			await loadStatus();
		});
	}

	const selectValue =
		effective?.source === "direct" ? effective.profile.id : INHERIT_VALUE;

	return (
		<Group gap={6} wrap="wrap" align="center">
			<Select
				size="xs"
				w={170}
				variant="unstyled"
				value={selectValue}
				data={[
					{ value: INHERIT_VALUE, label: "Inherit from parent" },
					...profiles.map(profile => ({
						value: profile.id,
						label: profile.name,
					})),
					{
						value: CREATE_PROFILE_VALUE,
						label: "Create new profile…",
					},
				]}
				onChange={handleProfileChange}
			/>
			{effective && (
				<Badge size="xs" variant="light" color="gray">
					{SOURCE_LABELS[effective.source]}
				</Badge>
			)}
			<ActionIcon
				size="xs"
				variant="subtle"
				title="Manage study profiles"
				onClick={() => dispatch(openStudyProfileModal())}>
				<GearSixIcon size={12} />
			</ActionIcon>
			{dueState && (
				<Badge
					size="xs"
					variant="outline"
					color={finished ? "green" : "blue"}>
					{dueState}
				</Badge>
			)}
			{finished && (
				<Button
					size="xs"
					px={6}
					variant="subtle"
					onClick={handleUnfinish}>
					Unfinish
				</Button>
			)}
		</Group>
	);
}

export default ElementProfileRow;
