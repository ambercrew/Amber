import { useMemo } from "react";
import styles from "./styles.module.css";
import { Tooltip } from "react-tooltip";
import React from "react";
import HomeStatistics from "../../type/backend/dto/homeStatistics";
import RGB from "../../type/ui/rgb";

interface Props {
	date: Date;
	currentYear: number;
	homeStatistics: HomeStatistics;
	isDarkTheme: boolean;
}

// Primary color light-10 in RGB.
const reviewFromColor: RGB = {
    r: 21,
	g: 163,
	b: 152,
};

// Primary color shade-10 in RGB.
const reviewToColor: RGB = {
	r: 9,
	g: 73,
	b: 68,
};

const dueFromColorLightTheme: RGB = {
	r: 180,
	g: 180,
	b: 180,
};

const dueToColorLighTheme: RGB = {
	r: 60,
	g: 60,
	b: 60,
};

const dueFromColorDarkTheme: RGB = {
	r: 15,
	g: 15,
	b: 15,
};

const dueToColorDarkTheme: RGB = {
	r: 0,
	g: 0,
	b: 0,
};

const maxNumberOfReviews = 200;

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
			const formattedDate = formatDate(newDate);
			const reviewCounts =
				homeStatistics.reviewCounts[formattedDate] ?? 0;
			const dueCounts = homeStatistics.dueCounts[formattedDate] ?? 0;

			const todayDate = new Date(new Date().toDateString());
			const newDateOnlyDate = new Date(newDate);
			newDateOnlyDate.setHours(0, 0, 0, 0);

			if (todayDate.getTime() === newDateOnlyDate.getTime()) {
				console.log(newDateOnlyDate);
				console.log(formattedDate);
			}

			let color: string | null, text: string;
			if (
				todayDate < newDateOnlyDate ||
				(todayDate.getTime() === newDateOnlyDate.getTime() &&
					reviewCounts === 0)
			) {
				color =
					dueCounts === 0
						? null
						: getColor(
								dueCounts / maxNumberOfReviews,
								isDarkTheme
									? dueFromColorDarkTheme
									: dueFromColorLightTheme,
								isDarkTheme
									? dueToColorDarkTheme
									: dueToColorLighTheme,
							);
				text = `${dueCounts} due on ${formattedDate}`;
			} else {
				color = getColor(
					reviewCounts / maxNumberOfReviews,
					reviewFromColor,
					reviewToColor,
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

function formatDate(date: Date) {
	const offset = date.getTimezoneOffset();
	const newDate = new Date(date.getTime() - offset * 60 * 1000);
	return newDate.toISOString().split("T")[0];
}

function getColor(ratio: number, fromColor: RGB, toColor: RGB) {
	if (ratio === 0) return null;
	if (ratio > 1) ratio = 1;

	const r = Math.ceil(fromColor.r + (toColor.r - fromColor.r) * ratio);
	const g = Math.ceil(fromColor.g + (toColor.g - fromColor.g) * ratio);
	const b = Math.ceil(fromColor.b + (toColor.b - fromColor.r) * ratio);

	return `rgb(${r}, ${g}, ${b})`;
}

export default ReviewHeatmapColumn;
