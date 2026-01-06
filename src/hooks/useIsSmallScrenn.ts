import { useEffect, useState } from "react";
import { SMALL_SCREEN_MAX_WIDTH_IN_PX } from "../config/constants";

export default function useIsSmallScreen() {
	const [isSmallScreen, setIsSmallScreen] = useState(
		window.innerWidth <= SMALL_SCREEN_MAX_WIDTH_IN_PX,
	);

	useEffect(() => {
		const cb = () =>
			setIsSmallScreen(window.innerWidth <= SMALL_SCREEN_MAX_WIDTH_IN_PX);
		window.addEventListener("resize", cb);
		return () => window.removeEventListener("resize", cb);
	}, []);

	return isSmallScreen;
}
