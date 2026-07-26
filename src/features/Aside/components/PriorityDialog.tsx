import { useEffect, useState } from "react";
import {
	Modal,
	NumberInput,
	Slider,
	Stack,
	Text,
	useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
	setElementPriorityByPercentage,
	setElementPriorityByRank,
} from "../../../api/elements/api/elementsApi";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { closePriorityDialog } from "../../../stores/app/appReducer";
import { selectIsPriorityDialogOpened } from "../../../stores/app/appSelectors";
import { loadElementDetailsAction } from "../../../stores/elementDetails/elementDetailsActions";
import { selectCurrentElementDetails } from "../../../stores/elementDetails/elementDetailsSelectors";
import { selectCurrentElement } from "../../../stores/elements/elementsSelectors";
import { ElementId } from "../../../types/elements/elementId";
import { PRIORITY_CHANGED } from "../../../types/events/priorityChangedEvent";
import styles from "./PriorityDialog.module.css";

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

interface PriorityDialogBodyProps {
	elementId: ElementId;
	total: number;
	initialRank: number;
	initialPercentage: number;
	onCommitted: () => void;
}

function PriorityDialogBody({
	elementId,
	total,
	initialRank,
	initialPercentage,
	onCommitted,
}: PriorityDialogBodyProps) {
	const [rank, setRank] = useState(initialRank);
	const [percentage, setPercentage] = useState(initialPercentage);

	// The percentage gap between two adjacent ranks, so stepping the
	// controls below moves priority by exactly one element.
	const percentageStep = total <= 1 ? 1 : 100 / (total - 1);

	function rankToPercentage(value: number): number {
		return total <= 1 ? 0 : ((value - 1) / (total - 1)) * 100;
	}

	function percentageToRank(value: number): number {
		return total <= 1 ? 1 : Math.round((value / 100) * (total - 1)) + 1;
	}

	function handleRankChange(value: string | number) {
		const newRank = clamp(Number(value) || 1, 1, total);
		setRank(newRank);
		setPercentage(rankToPercentage(newRank));
		void setElementPriorityByRank(elementId, newRank).then(() => {
			window.dispatchEvent(new Event(PRIORITY_CHANGED));
			onCommitted();
		});
	}

	function handlePercentageChange(value: string | number) {
		const newPercentage = clamp(Number(value) || 0, 0, 100);
		const newRank = percentageToRank(newPercentage);
		setRank(newRank);
		setPercentage(rankToPercentage(newRank));
		void setElementPriorityByPercentage(elementId, newPercentage).then(
			() => {
				window.dispatchEvent(new Event(PRIORITY_CHANGED));
				onCommitted();
			},
		);
	}

	function handleSliderChange(value: number) {
		setPercentage(value);
		setRank(percentageToRank(value));
	}

	return (
		<Stack gap="lg">
			<NumberInput
				label="Position"
				description={`1 (highest priority) – ${total} (lowest priority)`}
				min={1}
				max={total}
				value={rank}
				onChange={handleRankChange}
			/>
			<NumberInput
				label="Percentage"
				decimalScale={2}
				suffix="%"
				min={0}
				max={100}
				step={percentageStep}
				value={Math.round(percentage * 100) / 100}
				onChange={handlePercentageChange}
			/>
			<Stack gap={4}>
				<Slider
					value={percentage}
					min={0}
					max={100}
					step={percentageStep}
					label={value => `${value.toFixed(0)}%`}
					onChange={handleSliderChange}
					onChangeEnd={handlePercentageChange}
					classNames={{ track: styles["gradient-track"] }}
					styles={{
						bar: { background: "transparent" },
					}}
				/>
				<Text size="xs" c="dimmed">
					Rank {rank} of {total}
				</Text>
			</Stack>
		</Stack>
	);
}

function PriorityDialog() {
	const opened = useAppSelector(selectIsPriorityDialogOpened);
	const currentElement = useAppSelector(selectCurrentElement);
	const details = useAppSelector(selectCurrentElementDetails);
	const dispatch = useAppDispatch();
	const theme = useMantineTheme();
	const isMobile =
		useMediaQuery(`(max-width: ${theme.breakpoints.sm})`) ?? false;

	const elementId = currentElement?.data.meta.elementId ?? null;

	useEffect(() => {
		if (!opened || !elementId) return;
		void dispatch(loadElementDetailsAction(elementId));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [opened, elementId]);

	return (
		<Modal
			opened={opened}
			onClose={() => dispatch(closePriorityDialog())}
			title="Priority"
			fullScreen={isMobile}
			centered
			closeButtonProps={{ "aria-label": "Close" }}>
			{elementId && details ? (
				<PriorityDialogBody
					key={`${elementId.id}-${details.priority.rank}-${details.priority.total}`}
					elementId={elementId}
					total={details.priority.total}
					initialRank={details.priority.rank}
					initialPercentage={details.priority.percentage}
					onCommitted={() =>
						void dispatch(loadElementDetailsAction(elementId))
					}
				/>
			) : (
				<Text size="sm" c="dimmed">
					Loading…
				</Text>
			)}
		</Modal>
	);
}

export default PriorityDialog;
