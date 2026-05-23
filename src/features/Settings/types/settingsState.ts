import { UserInformationDto } from "../../../api/backend/dto/userInformationDto";
import UpdateSettingsRequestDto from "../../../api/settings/dto/updateSettingsRequestDto";
import { SecurityTabState } from "./securityTabState";

export interface SettingsState {
	localSettings: UpdateSettingsRequestDto | null;
	userInformation: UserInformationDto | null;
	securityTabState: SecurityTabState;
	openaiApiKey: string | null;
}
