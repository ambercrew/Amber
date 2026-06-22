import { useState } from "react";
import Dialog from "../../../components/Dialog/Dialog";
import RadioSelect, {
	RadioOption,
} from "../../../components/RadioSelect/RadioSelect";
import styles from "./styles.module.css";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { mdiTimerPauseOutline } from "@mdi/js";

type Preset = "30min" | "tomorrow" | "3days" | "1week";

const PRESET_OPTIONS: RadioOption[] = [
	{ value: "30min", label: "Later today", description: "In ~30 minutes" },
	{ value: "tomorrow", label: "Tomorrow", description: "9:00 AM" },
	{ value: "3days", label: "In 3 days", description: "9:00 AM" },
	{ value: "1week", label: "In 1 week", description: "9:00 AM" },
];

function computeDate(preset: Preset): Date {
	const now = new Date();
	switch (preset) {
		case "30min":
			return new Date(now.getTime() + 30 * 60 * 1000);
		case "tomorrow": {
			const d = new Date(now);
			d.setDate(d.getDate() + 1);
			d.setHours(9, 0, 0, 0);
			return d;
		}
		case "3days": {
			const d = new Date(now);
			d.setDate(d.getDate() + 3);
			d.setHours(9, 0, 0, 0);
			return d;
		}
		case "1week": {
			const d = new Date(now);
			d.setDate(d.getDate() + 7);
			d.setHours(9, 0, 0, 0);
			return d;
		}
	}
}

interface Props {
	onHide: () => void;
	onSchedule: (date: Date) => void;
}

export default function ScheduleLaterDialog({ onHide, onSchedule }: Props) {
	const [selectedPreset, setSelectedPreset] = useState<Preset>("tomorrow");

	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();

		const date = computeDate(selectedPreset);
		onSchedule(date);
	};

	return (
		<Dialog
			focusTrap
			className={styles.scheduleLaterDialog}
			onHide={onHide}>
			<Form onSubmit={handleSubmit} className={styles.form}>
				<FormHeader
					icon={mdiTimerPauseOutline}
					title="Schedule for later"
				/>

				<FormRows
					rows={[
						{
							children: (
								<RadioSelect
									autoFocus
									options={PRESET_OPTIONS}
									value={selectedPreset}
									onChange={v =>
										setSelectedPreset(v as Preset)
									}
								/>
							),
						},
					]}
				/>

				<FormButtons onClose={onHide} submitText="Schedule" />
			</Form>
		</Dialog>
	);
}
