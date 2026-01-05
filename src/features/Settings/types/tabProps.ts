import { SettingsState } from "./settingsState";

export interface TabProps {
	state: SettingsState;
	setState: (newState: SettingsState) => void;
	executeRequest: (cb: () => Promise<void>) => Promise<void>;
}
