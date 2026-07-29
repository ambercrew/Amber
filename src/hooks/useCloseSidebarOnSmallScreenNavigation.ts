import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useElementParams } from "./useElementParams";
import { useIsSmallScreen } from "./useIsSmallScreen";

/**
 * On small screens the sidebar covers the whole viewport, so opening an element
 * has to close it — otherwise the element stays hidden behind the sidebar.
 */
export function useCloseSidebarOnSmallScreenNavigation(
	closeSidebar: () => void,
) {
	const location = useLocation();
	const isSmallScreen = useIsSmallScreen();
	const isElementRoute = useElementParams() !== null;
	const closeSidebarRef = useRef(closeSidebar);

	useEffect(() => {
		closeSidebarRef.current = closeSidebar;
	});

	useEffect(() => {
		if (!isSmallScreen || !isElementRoute) return;
		closeSidebarRef.current();
	}, [location.key, isSmallScreen, isElementRoute]);
}
