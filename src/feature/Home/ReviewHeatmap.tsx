import { useEffect, useMemo, useState } from "react";
import ReviewHeatmapColumn from "./ReviewHeatmapColumn";
import styles from "./styles.module.css";
import HomeStatistics from "../../type/backend/dto/homeStatistics";
import Settings from "../../type/backend/model/settings";
import { getSettings } from "../../api/settingsApi";

interface Props {
	homeStatistics: HomeStatistics;
}

function ReviewHeatmap({ homeStatistics }: Props) {
	const [setting, setSettings] = useState<Settings | null>(null);

	useEffect(() => {
		void (async () => setSettings(await getSettings()))();
	}, []);

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
			{setting &&
				weeksOfYear.map((week, i) => (
					<ReviewHeatmapColumn
						currentYear={new Date().getFullYear()}
						key={i}
						date={week}
						homeStatistics={homeStatistics}
						isDarkTheme={setting.theme === "Dark"}
					/>
				))}
		</div>
	);
}

export default ReviewHeatmap;
