import { useEffect } from "react";

function useGlobalKey(
	cb: (e: KeyboardEvent) => void,
	eventName: "keyup" | "keydown" = "keyup",
	capture = false,
) {
	useEffect(() => {
		window.addEventListener(eventName, cb, capture);
		return () => {
			window.removeEventListener(eventName, cb);
		};
	}, [cb, eventName, capture]);
}

export default useGlobalKey;
