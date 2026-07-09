import { useEffect, useState } from "react";
import { ActionIcon, Group, Select } from "@mantine/core";
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
} from "../../../api/study/api/studyApi";
import useApi from "../../../hooks/useApi";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { openStudyProfileModal } from "../../../stores/app/appReducer";
import { selectStudyCounts } from "../../../stores/study/studySelectors";
import { ElementId } from "../../../types/elements/elementId";
import { commands } from "../../../commands/commands";

interface ElementProfileRowProps {
	elementId: ElementId;
	parentId: ElementId | null;
	onDueChange?: (dueState: string | null, finished: boolean) => void;
}

const CREATE_PROFILE_VALUE = "__create__";
const INHERIT_VALUE = "__inherit__";

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
	if (diffDays <= 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	return `In ${diffDays} days`;
}

function ElementProfileRow({
	elementId,
	parentId,
	onDueChange,
}: ElementProfileRowProps) {
	const dispatch = useAppDispatch();
	const { callApi } = useApi();
	const [profiles, setProfiles] = useState<StudyProfileDto[]>([]);
	const [effective, setEffective] = useState<EffectiveProfileDto | null>(
		null,
	);
	const [inheritedName, setInheritedName] = useState<string | null>(null);
	const counts = useAppSelector(selectStudyCounts);
	const gradedCount = counts.cards + counts.readings;

	async function loadStatus() {
		const [profileList, effectiveProfile] = await Promise.all([
			listStudyProfiles(),
			getEffectiveStudyProfile(elementId),
		]);
		setProfiles(profileList);
		setEffective(effectiveProfile);

		if (effectiveProfile.source === "direct") {
			if (parentId) {
				const parentEffective =
					await getEffectiveStudyProfile(parentId);
				setInheritedName(parentEffective.profile.name);
			} else {
				setInheritedName(
					profileList.find(profile => profile.isDefault)?.name ??
						null,
				);
			}
		} else {
			setInheritedName(effectiveProfile.profile.name);
		}

		if (elementId.type === "card") {
			const review = await getCardReview(elementId.id);
			onDueChange?.(formatDueState(review?.due ?? null, false), false);
		} else if (
			elementId.type === "reading" ||
			elementId.type === "extract"
		) {
			const review = await getReadingReview(elementId);
			const isFinished = Boolean(review?.finishedAt);
			onDueChange?.(
				formatDueState(review?.due ?? null, isFinished),
				isFinished,
			);
		} else {
			onDueChange?.(null, false);
		}
	}

	useEffect(() => {
		void callApi(loadStatus);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		elementId.type,
		elementId.id,
		parentId?.type,
		parentId?.id,
		gradedCount,
		callApi,
		onDueChange,
	]);

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

	const selectValue =
		effective?.source === "direct" ? effective.profile.id : INHERIT_VALUE;

	const inheritLabel = inheritedName
		? `Inherit from parent (${inheritedName})`
		: "Inherit from parent";

	return (
		<Group gap={4} wrap="nowrap" align="center">
			<Select
				size="sm"
				variant="unstyled"
				value={selectValue}
				searchable
				withAlignedLabels
				flex={1}
				data={[
					{ value: INHERIT_VALUE, label: inheritLabel },
					...profiles.map(profile => ({
						value: profile.id,
						label: profile.name,
					})),
					{
						value: CREATE_PROFILE_VALUE,
						label: "Create new profile…",
					},
				]}
				styles={{
					input: {
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						overflow: "hidden",
					},
				}}
				comboboxProps={{
					offset: 0,
				}}
				nothingFoundMessage="Nothing found..."
				onChange={handleProfileChange}
			/>
			<ActionIcon
				size="sm"
				variant="subtle"
				title="Manage study profiles"
				onClick={() => dispatch(openStudyProfileModal())}>
				{commands.find(c => c.id === "manage-study-profiles")?.icon}
			</ActionIcon>
		</Group>
	);
}

export default ElementProfileRow;
