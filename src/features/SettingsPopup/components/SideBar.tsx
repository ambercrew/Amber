import Icon from "@mdi/react";
import styles from "./styles.module.css";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSignedIn } from "../../../stores/user/userSelectors";
import { SettingsTab, settingsTabIcon } from "../types/SettingsTab";

interface Props {
	selectedTab: SettingsTab;
	onTabChange: (newTab: SettingsTab) => void;
}

// TODO: update tests
export default function SideBar({ selectedTab, onTabChange }: Props) {
	const isSignedIn = useAppSelector(selectIsSignedIn);

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
			/>
		));

	return <div className={styles.sideBar}>{...rows}</div>;
}

interface SideBarRowProps {
	tab: SettingsTab;
	selectedTab: SettingsTab;
	onTabChange: (newTab: SettingsTab) => void;
}

function SideBarRow({ tab, selectedTab, onTabChange }: SideBarRowProps) {
	return (
		<button
			className={`${selectedTab === tab ? "primary" : "transparent"} ${styles.row}`}
			onClick={() => onTabChange(tab)}>
			<Icon path={settingsTabIcon[tab]} size={1} />
			<p>{tab}</p>
		</button>
	);
}
