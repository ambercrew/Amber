import {
	mdiAccountOutline,
	mdiLockOutline,
	mdiPaletteOutline,
	mdiServerOutline,
} from "@mdi/js";

export enum SettingsTab {
	Appearance = "Appearance",
	Data = "Data",
	Profile = "Profile",
	Security = "Security",
}

export const settingsTabIcons: Record<SettingsTab, string> = {
	[SettingsTab.Appearance]: mdiPaletteOutline,
	[SettingsTab.Data]: mdiServerOutline,
	[SettingsTab.Profile]: mdiAccountOutline,
	[SettingsTab.Security]: mdiLockOutline,
};
