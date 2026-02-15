import {
	mdiAccountOutline,
	mdiLockOutline,
	mdiPaletteOutline,
	mdiRobotOutline,
	mdiServerOutline,
} from "@mdi/js";

export enum SettingsTab {
	Appearance = "Appearance",
	Data = "Data",
	Ai = "AI",
	Profile = "Profile",
	Security = "Security",
}

export const settingsTabIcons: Record<SettingsTab, string> = {
	[SettingsTab.Appearance]: mdiPaletteOutline,
	[SettingsTab.Data]: mdiServerOutline,
	[SettingsTab.Profile]: mdiAccountOutline,
	[SettingsTab.Security]: mdiLockOutline,
	[SettingsTab.Ai]: mdiRobotOutline,
};
