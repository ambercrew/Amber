const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * How long a trashed element still has before the retention threshold purges
 * it, e.g. "12 days left".
 */
export function formatTrashCountdown(
	trashedAt: string,
	retentionDays: number,
): string {
	const purgeAt =
		new Date(trashedAt).getTime() + retentionDays * MILLISECONDS_PER_DAY;
	const daysLeft = Math.ceil((purgeAt - Date.now()) / MILLISECONDS_PER_DAY);

	if (daysLeft <= 0) return "Deleting soon";
	if (daysLeft === 1) return "1 day left";
	return `${daysLeft} days left`;
}
