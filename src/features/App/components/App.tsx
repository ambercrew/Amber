import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import {
	AppShell,
	Box,
	useMantineTheme,
	MantineBreakpoint,
} from "@mantine/core";
import { useSplitter, useMediaQuery } from "@mantine/hooks";
import useAppDispatch from "../../../hooks/useAppDispatch";
import Updater from "../../Updater/components/Updater";
import { initialLoadApplicationState } from "../../../stores/app/appActions.ts";
import useAppSelector from "../../../hooks/useAppSelector.ts";
import { selectAreSettingsLoaded } from "../../../stores/settings/settingsSelector.ts";
import useApi from "../../../hooks/useApi.ts";
import Sidebar from "../../Sidebar/components/Sidebar.tsx";
import AppHeader from "./AppHeader.tsx";
import { isMobile } from "../../../utils/tauriUtils.ts";

const SIDEBAR_DEFAULT = 320;
const SIDEBAR_BREAKPOINT: MantineBreakpoint = "sm";

function App() {
	const [sidebarExpanded, setSidebarExpanded] = useState(true);
	const { callApi } = useApi();
	const dispatch = useAppDispatch();
	const areSettingsLoaded = useAppSelector(selectAreSettingsLoaded);
	const theme = useMantineTheme();
	const isMobileViewport =
		useMediaQuery(
			`(max-width: ${theme.breakpoints[SIDEBAR_BREAKPOINT]})`,
		) ?? false;

	const splitter = useSplitter({
		panels: [
			{
				defaultSize: `${SIDEBAR_DEFAULT}px`,
				min: "160px",
				max: "50%",
				collapsible: true,
			},
			{ defaultSize: 100 },
		],
		enabled: !isMobileViewport,
		onCollapseChange: (_index, collapsed) => setSidebarExpanded(!collapsed),
	});

	const navbarWidth =
		parseFloat(String(splitter.sizes[0])) || SIDEBAR_DEFAULT;

	useEffect(() => {
		const contextMenuCb = (e: MouseEvent) => {
			if (!import.meta.env.DEV) e.preventDefault();
		};
		window.addEventListener("contextmenu", contextMenuCb);
		return () => window.removeEventListener("contextmenu", contextMenuCb);
	}, []);

	useEffect(() => {
		void dispatch(initialLoadApplicationState());
	}, [dispatch]);

	if (!areSettingsLoaded) return null;

	return (
		<AppShell
			// eslint-disable-next-line react-hooks/refs
			ref={splitter.ref}
			layout="alt"
			navbar={{
				width: navbarWidth,
				breakpoint: SIDEBAR_BREAKPOINT,
				collapsed: {
					desktop: !sidebarExpanded,
					mobile: !sidebarExpanded,
				},
			}}
			padding="md">
			{!isMobile() && <Updater callApi={callApi} />}

			<AppShell.Header>
				<AppHeader onToggleSidebar={() => splitter.toggleCollapse(0)} />
			</AppShell.Header>

			<AppShell.Navbar bg="var(--mantine-color-gray-light)">
				<Sidebar onCollapse={() => splitter.collapse(0)} />
				{!isMobileViewport && (
					<Box
						// eslint-disable-next-line react-hooks/refs
						{...splitter.getHandleProps({ index: 0 })}
						style={{
							position: "absolute",
							right: 0,
							top: 0,
							bottom: 0,
							width: 4,
							cursor: "col-resize",
							zIndex: 10,
						}}
					/>
				)}
			</AppShell.Navbar>

			<AppShell.Main>
				<Outlet />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
