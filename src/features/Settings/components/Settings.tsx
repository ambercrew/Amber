import styles from "./styles.module.css";
import { useState } from "react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import Dialog from "../../../components/Dialog/Dialog";
import Form, { FormButtons, FormHeader } from "../../../components/Form/Form";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import SideBar from "./SideBar";
import DataTab from "./tabs/DataTab";
import errorToString from "../../../utils/errorToString";
import { updateAndApplySettings } from "../../../stores/settings/settingsActions";
import { SettingsTab, settingsTabIcons } from "../types/settingsTab";
import AppearanceTab from "./tabs/AppearanceTab";
import {
	selectIsSignedIn,
	selectUserInformation,
} from "../../../stores/user/userSelectors";
import ProfileTab from "./tabs/ProfileTab";
import SecurityTab from "./tabs/SecurityTab";
import DeleteUserDialog from "../../AuthDialog/components/DeleteUserDialog";
import Alert from "../../../components/Alert/Alert";
import {
	getUserInformation,
	updateUserInformation,
} from "../../../api/userApi";
import { setUserInformation } from "../../../stores/user/userReducer";
import { updatePassword } from "../../../api/authApi";
import Spinner from "../../../components/Spinner/Spinner";
import { SettingsState } from "../types/settingsState";

interface Props {
	onClose: () => void;
}

// TODO: update tests
export default function Settings({ onClose }: Props) {
	const [isSendingRequest, setIsSendingRequest] = useState(false);
	const [selectedTab, setSelectedTab] = useState(SettingsTab.Appearance);
	const [errorMessage, setErrorMessage] = useState("");

	const globalSettings = useAppSelector(selectSettings);
	const userInformation = useAppSelector(selectUserInformation);
	const [state, setState] = useState<SettingsState>({
		localSettings: globalSettings,
		securityTabState: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
			showDeleteUserDialog: false,
		},
		userInformation,
	});

	const isSignedIn = useAppSelector(selectIsSignedIn);
	const dispatch = useAppDispatch();

	if (
		(selectedTab === SettingsTab.Profile ||
			selectedTab === SettingsTab.Security) &&
		!isSignedIn
	) {
		setSelectedTab(SettingsTab.Appearance);
	}

	const executeRequest = async (cb: () => Promise<void>) => {
		try {
			await cb();
		} catch (e) {
			console.error(e);
			setErrorMessage(errorToString(e));
		} finally {
			setIsSendingRequest(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (isSignedIn) {
			if (
				state.securityTabState.newPassword !==
				state.securityTabState.confirmNewPassword
			) {
				setErrorMessage("Passwords do not match!");
				return;
			}

			if (
				!state.userInformation!.firstName ||
				!state.userInformation!.lastName
			) {
				setErrorMessage("Fill first name and last name");
				return;
			}
		}

		const zoomPercentage = state.localSettings?.zoomPercentage ?? 0;
		if (zoomPercentage < 50 || zoomPercentage > 200) {
			setErrorMessage("Zoom percentage must be between 50% and 200%");
			return;
		}

		await executeRequest(async () => {
			setIsSendingRequest(true);
			if (isSignedIn) {
				if (
					state.userInformation?.firstName !==
						userInformation?.firstName ||
					state.userInformation?.lastName !==
						userInformation?.lastName
				) {
					await updateUserInformation(
						state.userInformation!.firstName,
						state.userInformation!.lastName,
					);
					dispatch(setUserInformation(await getUserInformation()));
				}

				if (state.securityTabState.newPassword.length > 0) {
					await updatePassword(
						state.securityTabState.currentPassword,
						state.securityTabState.newPassword,
					);
				}
			}

			if (state.localSettings) {
				await dispatch(updateAndApplySettings(state.localSettings));
			}

			onClose();
		});
	};

	const handleHideDeleteUserDialog = () => {
		setState({
			...state,
			securityTabState: {
				...state.securityTabState,
				showDeleteUserDialog: false,
			},
		});
	};

	const tabProps = { state, setState, executeRequest };

	return (
		<Dialog className={styles.box} onHide={onClose} focusTrap={true}>
			<SideBar selectedTab={selectedTab} onTabChange={setSelectedTab} />

			<Form
				onSubmit={e => void handleSubmit(e)}
				className={`${styles.form} ${isSendingRequest && styles.sendingRequest}`}>
				<FormHeader
					icon={settingsTabIcons[selectedTab]}
					title={selectedTab}
				/>

				{selectedTab === SettingsTab.Appearance && (
					<AppearanceTab {...tabProps} />
				)}
				{selectedTab === SettingsTab.Data && <DataTab {...tabProps} />}
				{selectedTab === SettingsTab.Profile && (
					<ProfileTab {...tabProps} />
				)}
				{selectedTab === SettingsTab.Security && (
					<SecurityTab {...tabProps} />
				)}

				{errorMessage && (
					<Alert
						className={styles.alert}
						type="error"
						onClose={() => setErrorMessage("")}>
						<p>{errorMessage}</p>
					</Alert>
				)}

				{isSendingRequest && <Spinner />}

				{!isSendingRequest && (
					<FormButtons onClose={onClose} submitText="Apply" />
				)}
			</Form>

			{state.securityTabState.showDeleteUserDialog && (
				<DeleteUserDialog onHide={handleHideDeleteUserDialog} />
			)}
		</Dialog>
	);
}
