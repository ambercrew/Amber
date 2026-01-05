import { UserInformationDto } from "../../../types/backend/dto/userInformationDto";
import Settings from "../../../types/backend/model/settings";
import { SecurityTabState } from "./securityTabState";

export interface SettingsState {
	localSettings: Settings | null;
	userInformation: UserInformationDto | null;
	securityTabState: SecurityTabState;
}
