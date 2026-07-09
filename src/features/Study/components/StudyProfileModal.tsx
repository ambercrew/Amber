import { useEffect, useState } from "react";
import {
	Badge,
	Box,
	Button,
	Group,
	Modal,
	NumberInput,
	Stack,
	Text,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { PlusIcon } from "@phosphor-icons/react";
import {
	cloneStudyProfile,
	createStudyProfile,
	deleteStudyProfile,
	listStudyProfiles,
	setDefaultStudyProfile,
	updateStudyProfile,
} from "../../../api/study/api/studyProfileApi";
import {
	StudyProfileDto,
	StudyProfileRequestDto,
} from "../../../api/study/dto/studyProfileDto";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { closeStudyProfileModal } from "../../../stores/app/appReducer";
import { selectIsStudyProfileModalOpened } from "../../../stores/app/appSelectors";

interface ProfileFormProps {
	profile: StudyProfileDto | null;
	onSaved: () => void;
}

// TODO: review
function ProfileForm({ profile, onSaved }: ProfileFormProps) {
	const form = useForm<StudyProfileRequestDto>({
		initialValues: {
			name: profile?.name ?? "New profile",
			desiredRetention: profile?.desiredRetention ?? 0.9,
			defaultAFactor: profile?.defaultAFactor ?? 1.2,
			initialIntervalDays: profile?.initialIntervalDays ?? 1,
			minIntervalDays: profile?.minIntervalDays ?? 1,
		},
	});

	async function handleSubmit(values: StudyProfileRequestDto) {
		if (profile) {
			await updateStudyProfile(profile.id, values);
		} else {
			await createStudyProfile(values);
		}
		onSaved();
	}

	async function handleClone() {
		if (!profile) return;
		await cloneStudyProfile(profile.id);
		onSaved();
	}

	async function handleDelete() {
		if (!profile) return;
		await deleteStudyProfile(profile.id);
		onSaved();
	}

	async function handleSetDefault() {
		if (!profile) return;
		await setDefaultStudyProfile(profile.id);
		onSaved();
	}

	return (
		<form onSubmit={form.onSubmit(values => void handleSubmit(values))}>
			<Stack gap="sm">
				<TextInput label="Name" {...form.getInputProps("name")} />
				<NumberInput
					label="Desired retention"
					min={0.7}
					max={0.99}
					step={0.01}
					decimalScale={2}
					{...form.getInputProps("desiredRetention")}
				/>
				<NumberInput
					label="A-factor"
					min={1}
					step={0.1}
					decimalScale={2}
					{...form.getInputProps("defaultAFactor")}
				/>
				<NumberInput
					label="Initial interval (days)"
					min={0}
					step={1}
					{...form.getInputProps("initialIntervalDays")}
				/>
				<NumberInput
					label="Min interval (days)"
					min={0}
					step={1}
					{...form.getInputProps("minIntervalDays")}
				/>

				<Group justify="space-between" mt="sm">
					<Group gap="xs">
						{profile && (
							<Button
								variant="default"
								size="xs"
								onClick={() => void handleClone()}>
								Clone
							</Button>
						)}
						{profile && !profile.isDefault && (
							<Tooltip
								label="Makes this the default profile. Default status can only be moved to another profile, never simply turned off."
								multiline
								w={240}>
								<Button
									variant="default"
									size="xs"
									onClick={() => void handleSetDefault()}>
									Make default
								</Button>
							</Tooltip>
						)}
						{profile && !profile.isDefault && (
							<Button
								variant="subtle"
								color="red"
								size="xs"
								onClick={() => void handleDelete()}>
								Delete
							</Button>
						)}
					</Group>
					<Button type="submit" size="xs">
						{profile ? "Save" : "Create"}
					</Button>
				</Group>
			</Stack>
		</form>
	);
}

function StudyProfileModal() {
	const opened = useAppSelector(selectIsStudyProfileModalOpened);
	const dispatch = useAppDispatch();
	const [profiles, setProfiles] = useState<StudyProfileDto[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	function refresh() {
		void listStudyProfiles().then(list => {
			setProfiles(list);
			setSelectedId(prev =>
				prev && list.some(profile => profile.id === prev)
					? prev
					: (list[0]?.id ?? null),
			);
		});
	}

	useEffect(() => {
		if (opened) refresh();
	}, [opened]);

	const selected =
		profiles.find(profile => profile.id === selectedId) ?? null;

	return (
		<Modal
			opened={opened}
			onClose={() => dispatch(closeStudyProfileModal())}
			title="Study profiles"
			size="lg">
			<Group align="flex-start" wrap="nowrap" gap="md">
				<Stack gap={4} w={180}>
					{profiles.map(profile => (
						<Button
							key={profile.id}
							variant={
								profile.id === selectedId ? "light" : "subtle"
							}
							color="gray"
							justify="space-between"
							fullWidth
							rightSection={
								profile.isDefault ? (
									<Badge size="xs" variant="light">
										Default
									</Badge>
								) : undefined
							}
							onClick={() => setSelectedId(profile.id)}>
							<Text truncate="end">{profile.name}</Text>
						</Button>
					))}
					<Button
						variant="subtle"
						size="sm"
						leftSection={<PlusIcon size={14} />}
						onClick={() => setSelectedId(null)}>
						Create new profile
					</Button>
				</Stack>

				<Box flex={1}>
					<ProfileForm
						key={selectedId ?? "new"}
						profile={selected}
						onSaved={refresh}
					/>
				</Box>
			</Group>
		</Modal>
	);
}

export default StudyProfileModal;
