import { useEffect, useRef } from "react";

export default function useFocusRestore() {
	const focusedElementBeforeView = useRef<HTMLElement | null>(
		document.activeElement instanceof HTMLElement
			? document.activeElement
			: null,
	);

	useEffect(() => {
		const focusedElement = focusedElementBeforeView;

		return () => {
			if (document.activeElement === document.body)
				focusedElement.current?.focus();
		};
	}, []);
}
