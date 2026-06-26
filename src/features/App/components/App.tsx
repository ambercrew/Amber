import { useEffect, useState } from "react";
import {
	AppShell,
	Group,
	Breadcrumbs,
	Anchor,
	Skeleton,
	ActionIcon,
} from "@mantine/core";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { SidebarSimpleIcon } from "@phosphor-icons/react";
import Updater from "../../Updater/components/Updater";
import { initialLoadApplicationState } from "../../../stores/app/appActions.ts";
import useAppSelector from "../../../hooks/useAppSelector.ts";
import { selectAreSettingsLoaded } from "../../../stores/settings/settingsSelector.ts";
import useApi from "../../../hooks/useApi.ts";
import { isMobile } from "../../../utils/tauriUtils.ts";
import Sidebar from "../../Sidebar/components/Sidebar.tsx";

function App() {
	const { callApi } = useApi();
	const areSettingsLoaded = useAppSelector(selectAreSettingsLoaded);
	const dispatch = useAppDispatch();
	const [sidebarExpanded, setSidebarExpanded] = useState(true);

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
			layout="alt"
			header={{ height: 60 }}
			navbar={{
				width: 280,
				breakpoint: "sm",
				collapsed: {
					desktop: !sidebarExpanded,
					mobile: !sidebarExpanded,
				},
			}}
			padding="md">
			{!isMobile() && <Updater callApi={callApi} />}

			<AppShell.Header>
				<Group h="100%" px="md" gap={16} align="center">
					<ActionIcon
						variant="subtle"
						onClick={() => setSidebarExpanded(v => !v)}>
						<SidebarSimpleIcon size={20} />
					</ActionIcon>
					<Breadcrumbs>
						<Anchor>Home</Anchor>
						<Anchor>Components</Anchor>
						<span>Breadcrumb</span>
					</Breadcrumbs>
				</Group>
			</AppShell.Header>

			<AppShell.Navbar>
				<Sidebar onCollapse={() => setSidebarExpanded(false)} />
			</AppShell.Navbar>

			<AppShell.Main>
				<Skeleton height={8} radius="xl" mb="xs" />
				<Skeleton height={8} radius="xl" mb="xs" />
				<Skeleton height={8} radius="xl" mb="xs" width="70%" />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
