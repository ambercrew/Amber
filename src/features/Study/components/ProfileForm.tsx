import {
	Button,
	Group,
	NumberInput,
	Stack,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
	cloneStudyProfile,
	createStudyProfile,
	deleteStudyProfile,
	setDefaultStudyProfile,
	updateStudyProfile,
} from "../../../api/study/api/studyProfileApi";
import {
	StudyProfileDto,
	StudyProfileRequestDto,
} from "../../../api/study/dto/studyProfileDto";

interface ProfileFormProps {
	profile: StudyProfileDto | null;
	onSaved: () => void;
}

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
					<Group gap={4}>
						{profile && (
							<Button
								variant="default"
								size="sm"
								onClick={() => void handleClone()}>
								Clone
							</Button>
						)}
						{profile && !profile.isDefault && (
							<Tooltip
								label="Makes this the default profile. Default status can only be moved to another profile, never simply turned off."
								multiline>
								<Button
									variant="default"
									size="sm"
									onClick={() => void handleSetDefault()}>
									Make default
								</Button>
							</Tooltip>
						)}
						{profile && !profile.isDefault && (
							<Button
								variant="subtle"
								color="red"
								size="sm"
								onClick={() => void handleDelete()}>
								Delete
							</Button>
						)}
					</Group>
					<Button type="submit" size="sm">
						{profile ? "Save" : "Create"}
					</Button>
				</Group>
			</Stack>
		</form>
	);
}

export default ProfileForm;
