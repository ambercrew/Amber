import { useEffect } from "react";

export default function useBeforeUnload(cb: (e: BeforeUnloadEvent) => void) {
	useEffect(() => {
		window.addEventListener("beforeunload", cb);
		return () => window.removeEventListener("beforeunload", cb);
	}, [cb]);
}
