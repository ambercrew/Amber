import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import {
	AppShell,
	Box,
	useMantineTheme,
	MantineBreakpoint,
	rem,
} from "@mantine/core";
import { useSplitter, useMediaQuery, useHeadroom } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { useRedirectIfElementMissing } from "../../../hooks/useRedirectIfElementMissing";
import { useCurrentElementSync } from "../../../hooks/useCurrentElementSync";
import { useStudySessionGuard } from "../../../hooks/useStudySessionGuard";
import { useStudySessionSummaryToast } from "../../../hooks/useStudySessionSummaryToast";
import Updater from "../../Updater/components/Updater";
import CommandPalette from "../../../commands/CommandPalette";
import StudySessionBar from "../../Study/components/StudySessionBar.tsx";
import { initialLoadApplicationState } from "../../../stores/app/appActions.ts";
import useAppSelector from "../../../hooks/useAppSelector.ts";
import { selectAreSettingsLoaded } from "../../../stores/settings/settingsSelector.ts";
import { selectStudyStatus } from "../../../stores/study/studySelectors.ts";
import Sidebar from "../../Sidebar/components/Sidebar.tsx";
import ImportModal from "../../Import/components/ImportModal.tsx";
import StudyProfileModal from "../../Study/components/StudyProfileModal.tsx";
import AppHeader from "./AppHeader.tsx";
import { isMobile } from "../../../utils/tauriUtils.ts";

const HEADER_HEIGHT = 60;
const BOTTOM_BAR_HEIGHT = 66;
const SIDEBAR_DEFAULT = 320;
export const SIDEBAR_BREAKPOINT: MantineBreakpoint = "sm";

function App() {
	const { pinned } = useHeadroom({ fixedAt: 120 });

	const [sidebarExpanded, setSidebarExpanded] = useState(true);
	const dispatch = useAppDispatch();
	const areSettingsLoaded = useAppSelector(selectAreSettingsLoaded);
	const studyStatus = useAppSelector(selectStudyStatus);
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

	useRedirectIfElementMissing();
	useCurrentElementSync();
	useStudySessionGuard();
	useStudySessionSummaryToast();

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
			header={{
				height: HEADER_HEIGHT,
				collapsed: !pinned,
				offset: false,
			}}
			footer={{
				height: BOTTOM_BAR_HEIGHT,
				collapsed: studyStatus !== "studying" || !pinned,
			}}
			padding="md">
			{!isMobile() && <Updater />}
			<CommandPalette />
			<ImportModal />
			<StudyProfileModal />
			<Notifications />

			<AppShell.Header>
				<AppHeader
					onToggleSidebar={() => splitter.toggleCollapse(0)}
					pinned={pinned}
				/>
			</AppShell.Header>

			<AppShell.Footer>
				<StudySessionBar />
			</AppShell.Footer>

			<AppShell.Navbar bg="var(--mantine-color-gray-0)">
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

			{/* The padding of top is the height of the header */}
			<AppShell.Main pt={`${rem(HEADER_HEIGHT)}`}>
				<Outlet />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
