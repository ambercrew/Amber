import { CSSProperties, useMemo } from "react";
import styles from "./styles.module.css";
import HomeStatistics from "../../../api/cells/valueObjects/homeStatistics";
import { heatmapTooltipId, reviewsDivisor } from "../config/constants";
import { formatDateHeatmapTooltip } from "../utils/formatDateHeatmapTooltip";

interface Props {
	date: Date;
	currentYear: number;
	homeStatistics: HomeStatistics;
}

// Counts are heavily skewed towards small numbers, so a linear ratio makes
// low-but-nonzero counts barely visible. Use a sqrt curve with a floor to
// keep them visible while still maxing out at 1.
const minVisibleRatio = 0.25;

function countToRatio(count: number) {
	if (count <= 0) return 0;
	return Math.max(
		Math.sqrt(Math.min(count / reviewsDivisor, 1)),
		minVisibleRatio,
	);
}

function ReviewHeatmapColumn({ date, currentYear, homeStatistics }: Props) {
	const dates = useMemo(() => {
		const days = [...Array(7).keys()];
		return days.map(day => {
			const newDate = new Date(date);
			newDate.setDate(newDate.getDate() + day);
			const formattedDate = formatDateHeatmapTooltip(newDate);
			const reviewCounts =
				homeStatistics.reviewCounts[formattedDate] ?? 0;
			const dueCounts = homeStatistics.dueCounts[formattedDate] ?? 0;

			const todayDate = new Date(new Date().toDateString());
			const newDateOnlyDate = new Date(newDate);
			newDateOnlyDate.setHours(0, 0, 0, 0);

			let kind: "due" | "review" | null, ratio: number, text: string;
			if (
				todayDate < newDateOnlyDate ||
				(todayDate.getTime() === newDateOnlyDate.getTime() &&
					reviewCounts === 0)
			) {
				kind = dueCounts === 0 ? null : "due";
				ratio = countToRatio(dueCounts);
				text = `${dueCounts} due on ${formattedDate}`;
			} else {
				kind = reviewCounts === 0 ? null : "review";
				ratio = countToRatio(reviewCounts);
				text = `${reviewCounts} reviews on ${formattedDate}`;
			}

			return {
				date: newDate,
				formattedDate,
				kind,
				ratio,
				text,
			};
		});
	}, [date, homeStatistics]);

	return (
		<div className={styles.reviewHeatmapColumn}>
			{dates.map((obj, i) => (
				<span
					key={i}
					style={
						obj.kind
							? ({
									"--ratio": obj.ratio,
								} as CSSProperties)
							: undefined
					}
					className={`${styles.heatmapBox} ${obj.kind ? styles[obj.kind] : ""}
                ${obj.date.getFullYear() !== currentYear ? styles.hidden : ""}`}
					data-tooltip-id={heatmapTooltipId}
					data-tooltip-content={obj.text}></span>
			))}
		</div>
	);
}

export default ReviewHeatmapColumn;
