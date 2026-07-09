export function formatRelativeDueDate(due: string): string {
	const dueDate = new Date(due);
	const now = new Date();
	const diffMs = dueDate.getTime() - now.getTime();

	if (diffMs <= 0) return "Today";

	const diffMinutes = Math.round(diffMs / 60_000);
	if (diffMinutes < 60) {
		return `In ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;
	}

	const diffHours = Math.round(diffMs / 3_600_000);
	if (diffHours < 24) {
		return `In ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
	}

	const startOfDue = new Date(
		dueDate.getFullYear(),
		dueDate.getMonth(),
		dueDate.getDate(),
	);
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	const diffDays = Math.round(
		(startOfDue.getTime() - startOfToday.getTime()) / 86_400_000,
	);
	if (diffDays <= 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	return `In ${diffDays} days`;
}
