import React, { useEffect } from "react";

/**
 * Hook that is used to call a function when a click outside
 * the referenced component happens.
 */
function useOutsideClick(ref: React.RefObject<HTMLElement>, cb: () => void) {
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				cb();
			}
		}
		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, [ref, cb]);
}

export default useOutsideClick;
