import { UserInformationDto } from "../../../types/backend/dto/userInformationDto";
import SettingsDto from "../../../types/backend/dto/settingsDto";
import { SecurityTabState } from "./securityTabState";

export interface SettingsState {
	localSettings: SettingsDto | null;
	userInformation: UserInformationDto | null;
	securityTabState: SecurityTabState;
}
