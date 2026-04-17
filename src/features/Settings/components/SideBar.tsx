import { Icon } from "@mdi/react";
import styles from "./styles.module.css";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSignedIn } from "../../../stores/user/userSelectors";
import { SettingsTab, settingsTabIcons } from "../types/settingsTab";
import useIsSmallScreen from "../../../hooks/useIsSmallScreen";

interface Props {
	selectedTab: SettingsTab;
	className: string;
	onTabChange: (newTab: SettingsTab) => void;
}

export default function SideBar({
	selectedTab,
	className,
	onTabChange,
}: Props) {
	const isSignedIn = useAppSelector(selectIsSignedIn);
	const isSmallScreen = useIsSmallScreen();

	const rows = Object.values(SettingsTab)
		.filter(tab => {
			if (
				(tab === SettingsTab.Profile || tab === SettingsTab.Security) &&
				!isSignedIn
			)
				return false;
			return true;
		})
		.map(tab => (
			<SideBarRow
				key={tab}
				tab={tab}
				selectedTab={selectedTab}
				onTabChange={onTabChange}
				isSmallScreen={isSmallScreen}
			/>
		));

	return (
		<div className={`${styles.sideBar} ${className}`}>
			<p className={styles.header}>Settings</p>
			{...rows}
		</div>
	);
}

interface SideBarRowProps {
	tab: SettingsTab;
	selectedTab: SettingsTab;
	isSmallScreen: boolean;
	onTabChange: (newTab: SettingsTab) => void;
}

function SideBarRow({
	tab,
	selectedTab,
	isSmallScreen,
	onTabChange,
}: SideBarRowProps) {
	return (
		<button
			className={`${!isSmallScreen && selectedTab === tab ? "primary" : "transparent"} ${styles.row}`}
			onClick={() => onTabChange(tab)}>
			<Icon path={settingsTabIcons[tab]} size={1} />
			<p>{tab}</p>
		</button>
	);
}
