import React, { useEffect } from "react";

/**
 * Hook that is used to call a function when a click outside
 * the referenced component happens.
 */
function useOutsideClick(
	ref: React.MutableRefObject<HTMLElement>,
	cb: () => void,
    event: "mousedown" | "mouseup" | "click"
) {
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				cb();
			}
		}
		document.addEventListener(event, handleClickOutside);

		return () => {
			document.removeEventListener(event, handleClickOutside);
		};
	}, [event, ref, cb]);
}

export default useOutsideClick;
