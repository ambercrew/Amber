import { useMemo } from "react";
import ReviewHeatmapColumn from "./ReviewHeatmapColumn";
import styles from "./styles.module.css";
import HomeStatistics from "../../../api/cells/valueObjects/homeStatistics";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";

interface Props {
	homeStatistics: HomeStatistics;
}

function ReviewHeatmap({ homeStatistics }: Props) {
	const settings = useAppSelector(selectSettings);

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
			{settings &&
				weeksOfYear.map((week, i) => (
					<ReviewHeatmapColumn
						currentYear={new Date().getFullYear()}
						key={i}
						date={week}
						homeStatistics={homeStatistics}
						isDarkTheme={settings.theme === "Dark"}
					/>
				))}
		</div>
	);
}

export default ReviewHeatmap;
