import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { AppShell, rem } from "@mantine/core";
import { useSplitter, useHeadroom } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { useRedirectIfElementMissing } from "../../../hooks/useRedirectIfElementMissing";
import {
	SMALL_SCREEN_BREAKPOINT,
	useIsSmallScreen,
} from "../../../hooks/useIsSmallScreen";
import { useCurrentElementSync } from "../../../hooks/useCurrentElementSync";
import { useStudySessionGuard } from "../../Study/hooks/useStudySessionGuard";
import { useStudySessionSummaryToast } from "../../Study/hooks/useStudySessionSummaryToast";
import Updater from "../../Updater/components/Updater";
import CommandPalette from "../../../commands/CommandPalette";
import StudySessionBar from "../../Study/components/StudySessionBar.tsx";
import { initialLoadApplicationState } from "../../../stores/app/appActions.ts";
import useAppSelector from "../../../hooks/useAppSelector.ts";
import { selectAreSettingsLoaded } from "../../../stores/settings/settingsSelector.ts";
import { selectStudyStatus } from "../../../stores/study/studySelectors.ts";
import Sidebar from "../../Sidebar/components/Sidebar.tsx";
import Aside from "../../Aside/components/Aside.tsx";
import ResizeHandle from "../../../components/ResizeHandle/ResizeHandle.tsx";
import ImportModal from "../../Import/components/ImportModal.tsx";
import StudyProfileModal from "../../Study/components/StudyProfileModal.tsx";
import SettingsModal from "../../Settings/components/SettingsModal.tsx";
import AppHeader from "./AppHeader.tsx";
import { isMobile } from "../../../utils/tauriUtils.ts";

// Must be defined manually otherwise hiding header or footer when scrolling won't work.
const HEADER_AND_FOOTER_HEIGHT = 56;
const SIDEBAR_DEFAULT = 320;
const ASIDE_DEFAULT = 320;

function App() {
	const { pinned } = useHeadroom({ fixedAt: 120 });

	const [sidebarExpanded, setSidebarExpanded] = useState(true);
	const [asideExpanded, setAsideExpanded] = useState(false);
	const dispatch = useAppDispatch();
	const areSettingsLoaded = useAppSelector(selectAreSettingsLoaded);
	const studyStatus = useAppSelector(selectStudyStatus);
	const isSmallScreen = useIsSmallScreen();

	const splitter = useSplitter({
		panels: [
			{
				defaultSize: `${SIDEBAR_DEFAULT}px`,
				min: "160px",
				max: "40%",
				collapsible: true,
			},
			{ defaultSize: 100 },
			{
				defaultSize: `${ASIDE_DEFAULT}px`,
				min: "160px",
				max: "30%",
			},
		],
		enabled: !isSmallScreen,
		onCollapseChange: (_index, collapsed) => setSidebarExpanded(!collapsed),
	});

	useRedirectIfElementMissing();
	useCurrentElementSync();
	useStudySessionGuard();
	useStudySessionSummaryToast();

	const navbarWidth =
		parseFloat(String(splitter.sizes[0])) || SIDEBAR_DEFAULT;
	const asideWidth = parseFloat(String(splitter.sizes[2])) || ASIDE_DEFAULT;

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
				breakpoint: SMALL_SCREEN_BREAKPOINT,
				collapsed: {
					desktop: !sidebarExpanded,
					mobile: !sidebarExpanded,
				},
			}}
			aside={{
				width: asideWidth,
				breakpoint: SMALL_SCREEN_BREAKPOINT,
				collapsed: {
					desktop: !asideExpanded,
					mobile: !asideExpanded,
				},
			}}
			header={{
				height: HEADER_AND_FOOTER_HEIGHT,
				collapsed: !pinned,
				offset: false,
			}}
			footer={{
				height: HEADER_AND_FOOTER_HEIGHT,
				collapsed: studyStatus !== "studying" || !pinned,
			}}
			padding="md">
			{!isMobile() && <Updater />}
			<CommandPalette />
			<ImportModal />
			<StudyProfileModal />
			<SettingsModal />
			<Notifications />

			<AppShell.Header>
				<AppHeader
					onToggleSidebar={() => splitter.toggleCollapse(0)}
					onToggleAside={() => setAsideExpanded(v => !v)}
				/>
			</AppShell.Header>

			<AppShell.Footer>
				<StudySessionBar />
			</AppShell.Footer>

			<AppShell.Navbar>
				<Sidebar onCollapse={() => splitter.collapse(0)} />
				{!isSmallScreen && (
					<ResizeHandle
						side="right"
						// eslint-disable-next-line react-hooks/refs
						handleProps={splitter.getHandleProps({ index: 0 })}
					/>
				)}
			</AppShell.Navbar>

			<AppShell.Aside>
				<Aside onCollapse={() => setAsideExpanded(false)} />
				{!isSmallScreen && (
					<ResizeHandle
						side="left"
						// eslint-disable-next-line react-hooks/refs
						handleProps={splitter.getHandleProps({ index: 1 })}
					/>
				)}
			</AppShell.Aside>

			<AppShell.Main pt={`${rem(HEADER_AND_FOOTER_HEIGHT)}`}>
				<Outlet />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
