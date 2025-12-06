import { useEffect } from "react";

function useGlobalKey(
	cb: (e: KeyboardEvent) => void,
	eventName: "keyup" | "keydown" = "keyup",
) {
	useEffect(() => {
		window.addEventListener(eventName, cb);
		return () => {
			window.removeEventListener(eventName, cb);
		};
	}, [cb, eventName]);
}

export default useGlobalKey;
