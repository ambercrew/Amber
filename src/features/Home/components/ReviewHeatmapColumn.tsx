import styles from "./styles.module.css";
import { Tooltip } from "react-tooltip";
import React, { useMemo } from "react";
import HomeStatistics from "../../../api/cells/valueObjects/homeStatistics";
import { colors } from "../config/colors";
import { reviewsDivisor } from "../config/constants";
import { formatDateHeatmapTooltip } from "../utils/formatDateHeatmapTooltip";
import { getColorAtRatio } from "../utils/getColorAtRatio";

interface Props {
	date: Date;
	currentYear: number;
	homeStatistics: HomeStatistics;
	isDarkTheme: boolean;
}

function ReviewHeatmapColumn({
	date,
	currentYear,
	homeStatistics,
	isDarkTheme,
}: Props) {
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

			let color: string | null, text: string;
			if (
				todayDate < newDateOnlyDate ||
				(todayDate.getTime() === newDateOnlyDate.getTime() &&
					reviewCounts === 0)
			) {
				color =
					dueCounts === 0
						? null
						: getColorAtRatio(
								dueCounts / reviewsDivisor,
								isDarkTheme
									? colors.dueFromColorDarkTheme
									: colors.dueFromColorLightTheme,
								isDarkTheme
									? colors.dueToColorDarkTheme
									: colors.dueToColorLightTheme,
							);
				text = `${dueCounts} due on ${formattedDate}`;
			} else {
				color = getColorAtRatio(
					reviewCounts / reviewsDivisor,
					isDarkTheme
						? colors.reviewFromColorDarkTheme
						: colors.reviewFromColorLightTheme,
					isDarkTheme
						? colors.reviewToColorDarkTheme
						: colors.reviewToColorLightTheme,
				);
				text = `${reviewCounts} reviews on ${formattedDate}`;
			}

			return {
				date: newDate,
				formattedDate,
				color,
				text,
			};
		});
	}, [date, homeStatistics, isDarkTheme]);

	return (
		<div className={styles.reviewHeatmapColumn}>
			{dates.map((obj, i) => (
				<React.Fragment key={i}>
					<span
						style={{
							backgroundColor: obj.color ?? undefined,
						}}
						className={`${styles.heatmapBox}
                ${obj.date.getFullYear() !== currentYear || obj.date.getFullYear() > currentYear ? styles.hidden : ""}`}
						data-tooltip-id={obj.formattedDate}
						data-tooltip-content={obj.text}></span>
					<Tooltip
						id={obj.formattedDate}
						className={styles.tooltip}
					/>
				</React.Fragment>
			))}
		</div>
	);
}

export default ReviewHeatmapColumn;
