import { useEffect, useState } from "react";

export function useElapsedSeconds(startedAt: number | null): number {
	const [trackedStart, setTrackedStart] = useState(startedAt);
	const [elapsed, setElapsed] = useState(0);

	if (startedAt !== trackedStart) {
		setTrackedStart(startedAt);
		setElapsed(0);
	}

	useEffect(() => {
		if (!startedAt) return;
		const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
		return () => clearInterval(interval);
	}, [startedAt]);

	return startedAt ? elapsed : 0;
}
