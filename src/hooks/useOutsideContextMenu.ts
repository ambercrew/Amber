import React, { useEffect } from "react";

/**
 * Hook that is used to call a function when a contextmenu is opened outside
 * the referenced component happens.
 */
function useOutsideContextMenu(
	ref: React.RefObject<HTMLElement>,
	cb: () => void,
) {
	useEffect(() => {
		function handleOutsideContextMenu(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				cb();
			}
		}
		document.addEventListener("contextmenu", handleOutsideContextMenu);

		return () => {
			document.removeEventListener(
				"contextmenu",
				handleOutsideContextMenu,
			);
		};
	}, [ref, cb]);
}

export default useOutsideContextMenu;
