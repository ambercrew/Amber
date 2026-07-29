import { useEffect, useRef } from "react";
import {
	BackButtonPriority,
	defaultBackButtonManager,
} from "../managers/backButtonManager";

/**
 * Runs `cb` when Android's back button is pressed while `enabled`, as long as
 * nothing with a higher priority is listening. See `BackButtonManager`.
 */
export default function useBackButtonPress(
	cb: () => void,
	enabled = true,
	priority: BackButtonPriority = BackButtonPriority.Medium,
) {
	const cbRef = useRef(cb);

	useEffect(() => {
		cbRef.current = cb;
	});

	// `cb` is read through a ref so callers can pass an inline function without
	// re-registering the handler on every render.
	useEffect(() => {
		if (!enabled) return;
		return defaultBackButtonManager.addHandler(
			() => cbRef.current(),
			priority,
		);
	}, [enabled, priority]);
}
