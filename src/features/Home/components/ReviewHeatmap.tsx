import { useMemo } from "react";
import { Tooltip } from "react-tooltip";
import ReviewHeatmapColumn from "./ReviewHeatmapColumn";
import styles from "./styles.module.css";
import HomeStatistics from "../../../api/cells/valueObjects/homeStatistics";
import { heatmapTooltipId } from "../config/constants";

interface Props {
	homeStatistics: HomeStatistics;
}

function ReviewHeatmap({ homeStatistics }: Props) {
	const weeksOfYear = useMemo(() => {
		const dates = [];
		const currentYear = new Date().getFullYear();
		const initialDate = new Date(new Date().getFullYear(), 0, 1);
		initialDate.setDate(initialDate.getDate() - initialDate.getDay());

		for (
			let date = initialDate;
			date.getFullYear() <= currentYear;
			date.setDate(date.getDate() + (7 - date.getDay()))
		) {
			dates.push(new Date(date));
		}
		return dates;
	}, []);

	return (
		<div className={styles.reviewHeatmap}>
			{weeksOfYear.map((week, i) => (
				<ReviewHeatmapColumn
					currentYear={new Date().getFullYear()}
					key={i}
					date={week}
					homeStatistics={homeStatistics}
				/>
			))}
			<Tooltip id={heatmapTooltipId} className={styles.tooltip} />
		</div>
	);
}

export default ReviewHeatmap;
