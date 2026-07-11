import {
	Button,
	Group,
	NumberInput,
	Stack,
	Text,
	Textarea,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
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
	onSubmitted: () => void;
}

// Mirrors fsrs::DEFAULT_PARAMETERS (src-tauri) so a new profile starts with
// the same weights the backend would otherwise fall back to.
const DEFAULT_FSRS_PARAMS = [
	0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
	0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
	0.0912, 0.0658, 0.1542,
];

interface ProfileFormValues extends Omit<StudyProfileRequestDto, "fsrsParams"> {
	fsrsParams: string;
}

function parseFsrsParams(raw: string): number[] {
	return raw
		.split(",")
		.map(part => part.trim())
		.filter(part => part.length > 0)
		.map(Number);
}

const FSRS_PARAM_COUNT = 21;

function isValidFsrsParams(raw: string): boolean {
	const parts = parseFsrsParams(raw);
	return (
		parts.length === FSRS_PARAM_COUNT &&
		parts.every(value => !Number.isNaN(value))
	);
}

function ProfileForm({ profile, onSaved, onSubmitted }: ProfileFormProps) {
	const form = useForm<ProfileFormValues>({
		initialValues: {
			name: profile?.name ?? "New profile",
			desiredRetention: profile?.desiredRetention ?? 0.9,
			fsrsParams: (profile?.fsrsParams ?? DEFAULT_FSRS_PARAMS).join(", "),
			defaultAFactor: profile?.defaultAFactor ?? 1.2,
			initialIntervalDays: profile?.initialIntervalDays ?? 1,
			minIntervalDays: profile?.minIntervalDays ?? 1,
		},
		validate: {
			fsrsParams: value =>
				isValidFsrsParams(value)
					? null
					: `Enter exactly ${FSRS_PARAM_COUNT} comma-separated numbers`,
		},
	});

	async function handleSubmit(values: ProfileFormValues) {
		const payload: StudyProfileRequestDto = {
			...values,
			fsrsParams: parseFsrsParams(values.fsrsParams),
		};
		if (profile) {
			await updateStudyProfile(profile.id, payload);
		} else {
			await createStudyProfile(payload);
		}
		onSaved();
		onSubmitted();
	}

	async function handleClone() {
		if (!profile) return;
		await cloneStudyProfile(profile.id);
		onSaved();
	}

	function handleDelete() {
		if (!profile) return;
		modals.openConfirmModal({
			title: "Delete profile",
			children: (
				<Text size="sm">
					Are you sure you want to delete &quot;{profile.name}
					&quot;? This cannot be undone.
				</Text>
			),
			labels: { confirm: "Delete", cancel: "Cancel" },
			confirmProps: { color: "red" },
			onConfirm: () => {
				void deleteStudyProfile(profile.id).then(onSaved);
			},
		});
	}

	async function handleSetDefault() {
		if (!profile) return;
		await setDefaultStudyProfile(profile.id);
		onSaved();
	}

	return (
		<form onSubmit={form.onSubmit(values => void handleSubmit(values))}>
			<Stack gap="sm">
				<Tooltip label="A label to identify this profile." multiline>
					<TextInput label="Name" {...form.getInputProps("name")} />
				</Tooltip>
				<Tooltip
					label="The probability of recall FSRS aims for when scheduling cards. Higher retention means more frequent reviews."
					multiline>
					<NumberInput
						label="Desired retention"
						min={0.7}
						max={0.99}
						step={0.01}
						decimalScale={2}
						{...form.getInputProps("desiredRetention")}
					/>
				</Tooltip>
				<Tooltip
					label="Multiplier applied to the interval each time an incremental reading or extract is revisited."
					multiline>
					<NumberInput
						label="A-factor"
						min={1}
						step={0.1}
						decimalScale={2}
						{...form.getInputProps("defaultAFactor")}
					/>
				</Tooltip>
				<Tooltip
					label="Advanced: the FSRS model weights used to schedule cards. Leave as-is unless you know what you're doing."
					multiline>
					<Textarea
						label="FSRS weights"
						autosize
						minRows={2}
						{...form.getInputProps("fsrsParams")}
					/>
				</Tooltip>
				<Tooltip
					label="Days until the first due date for readings, extracts and cards created under this profile."
					multiline>
					<NumberInput
						label="Initial interval (days)"
						min={0}
						step={1}
						{...form.getInputProps("initialIntervalDays")}
					/>
				</Tooltip>
				<Tooltip
					label="Floor applied to computed intervals, so incremental reading items are never scheduled sooner than this."
					multiline>
					<NumberInput
						label="Min interval (days)"
						min={0}
						step={1}
						{...form.getInputProps("minIntervalDays")}
					/>
				</Tooltip>

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
								onClick={handleDelete}>
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
