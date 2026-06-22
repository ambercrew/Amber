const ONE_DAY_IN_MILLISECONDS = 86400000;

export default function formatDueDate(isoDate: string): string {
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	// Parse date components directly to avoid UTC-vs-local offset issues
	const [year, month, day] = isoDate.split("T")[0].split("-").map(Number);
	const startOfDate = new Date(year, month - 1, day);

	const diffDays = Math.round(
		(startOfDate.getTime() - startOfToday.getTime()) /
			ONE_DAY_IN_MILLISECONDS,
	);

	if (diffDays === 0) return "today";
	if (diffDays === 1) return "tomorrow";
	return startOfDate.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}
