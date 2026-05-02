import styles from "./styles.module.css";
import { useState } from "react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import Dialog from "../../../components/Dialog/Dialog";
import Form, {
	FORM_HEADER_ICON_SIZE,
	FormButtons,
	FormHeader,
} from "../../../components/Form/Form";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import SideBar from "./SideBar";
import DataTab from "./tabs/DataTab";
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
} from "../../../api/backend/api/userApi.ts";
import { setUserInformation } from "../../../stores/user/userReducer";
import { updatePassword } from "../../../api/backend/api/authApi.ts";
import Spinner from "../../../components/Spinner/Spinner";
import { SettingsState } from "../types/settingsState";
import useIsSmallScreen from "../../../hooks/useIsSmallScreen";
import { mdiMenu } from "@mdi/js";
import { Icon } from "@mdi/react";
import AiTab from "./tabs/AiTab";
import { reloadApplicationState } from "../../../stores/app/appActions.ts";
import { useNavigate } from "react-router";
import useApiWithCustomError from "../../../hooks/useApiWithCustomError.ts";

interface Props {
	onClose: () => void;
}

export default function Settings({ onClose }: Props) {
	const {
		isSendingRequest,
		errorMessage,
		callApi,
		clearErrorMessage,
		setCustomErrorMessage,
	} = useApiWithCustomError();
	const [selectedTab, setSelectedTab] = useState(SettingsTab.Appearance);
	// Only used for small screens.
	const [isSideBarExpanded, setIsSideBarExpanded] = useState(true);
	const isSmallScreen = useIsSmallScreen();

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
	const navigate = useNavigate();
	const dispatch = useAppDispatch();

	if (
		(selectedTab === SettingsTab.Profile ||
			selectedTab === SettingsTab.Security) &&
		!isSignedIn
	) {
		setSelectedTab(SettingsTab.Appearance);
	}

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (isSignedIn) {
			if (
				state.securityTabState.newPassword !==
				state.securityTabState.confirmNewPassword
			) {
				setCustomErrorMessage("Passwords do not match!");
				return;
			}

			if (
				!state.userInformation!.firstName ||
				!state.userInformation!.lastName
			) {
				setCustomErrorMessage("Fill first name and last name");
				return;
			}
		}

		const zoomPercentage = state.localSettings?.zoomPercentage ?? 100;
		if (zoomPercentage < 50 || zoomPercentage > 200) {
			setCustomErrorMessage(
				"Zoom percentage must be between 50% and 200%",
			);
			return;
		}

		await callApi(async () => {
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
				await dispatch(
					updateAndApplySettings({
						...state.localSettings,
					}),
				);
			}

			if (
				state.localSettings?.baseDatabaseDirectory !==
				globalSettings?.baseDatabaseDirectory
			) {
				await dispatch(reloadApplicationState(navigate));
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

	const handleTabChange = (newTab: SettingsTab) => {
		setIsSideBarExpanded(false);
		setSelectedTab(newTab);
	};

	const tabProps = { state, setState, executeRequest: callApi };

	return (
		<Dialog
			className={`${styles.box} ${isSmallScreen && styles.smallScreen}`}
			onHide={onClose}
			focusTrap={true}>
			<SideBar
				selectedTab={selectedTab}
				onTabChange={handleTabChange}
				className={`${isSmallScreen && !isSideBarExpanded && styles.hidden}`}
			/>

			<Form
				onSubmit={e => void handleSubmit(e)}
				className={`
                    ${styles.form}
                    ${isSendingRequest && styles.sendingRequest}
                    ${isSmallScreen && isSideBarExpanded && styles.hidden}`}>
				<div className={styles.headerContainer}>
					{isSmallScreen && (
						<button
							type="button"
							className={`transparent ${styles.expandButton}`}
							onClick={() => setIsSideBarExpanded(true)}>
							<Icon path={mdiMenu} size={FORM_HEADER_ICON_SIZE} />
						</button>
					)}

					<FormHeader
						icon={
							isSmallScreen ? null : settingsTabIcons[selectedTab]
						}
						title={selectedTab}
					/>
				</div>

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
				{selectedTab === SettingsTab.Ai && <AiTab {...tabProps} />}

				{errorMessage && (
					<Alert
						className={styles.alert}
						type="error"
						onClose={() => clearErrorMessage()}>
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
