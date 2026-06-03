import styles from "./styles.module.css";
import Alert from "../../../components/Alert/Alert";
import FileTree from "../../FileTree/components/FileTree";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import {
	selectErrorMessage,
	selectRootFolder,
	selectSuccessMessage,
} from "../../../stores/fileSystem/fileSystemSelectors";
import {
	setErrorMessage,
	setSuccessMessage,
} from "../../../stores/fileSystem/fileSystemReducers";
import { useCallback, useMemo, useState } from "react";
import searchFolder from "../utils/searchFolder";
import {
	mdiAlertCircleOutline,
	mdiChevronDoubleLeft,
	mdiChevronDoubleRight,
	mdiCogOutline,
	mdiFileSearchOutline,
	mdiHelpCircleOutline,
	mdiHomeOutline,
	mdiLoginVariant,
	mdiMagnify,
} from "@mdi/js";
import { Icon } from "@mdi/react";
import InputWithIcon from "../../../components/InputWithIcon/InputWithIcon";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useLocation, useNavigate } from "react-router";
import UserDialog from "../../AuthDialog/components/UserDialog";
import {
	selectIsSignedIn,
	selectUserInformation,
} from "../../../stores/user/userSelectors";
import SyncRow from "./SyncRow";
import VerifyEmailDialog from "../../AuthDialog/components/VerifyEmailDialog";
import useIsSmallScreen from "../../../hooks/useIsSmallScreen";
import { isModKey } from "../../../utils/keyboardUtils";

interface Props {
	isExpanded: boolean;
	onExpand: () => void;
	onCollapse: () => void;
	onSettingsClick: () => void;
}

function SideBar({ isExpanded, onExpand, onCollapse, onSettingsClick }: Props) {
	const [searchText, setSearchText] = useState<string | null>(null);
	const [showUserDialog, setShowUserDialog] = useState(false);
	const [showVerifyEmailDialog, setShowVerifyEmailDialog] = useState(false);
	const rootFolder = useAppSelector(selectRootFolder);
	const errorMessage = useAppSelector(selectErrorMessage);
	const successMessage = useAppSelector(selectSuccessMessage);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [previousIsSignedIn, setPreviousIsSignedIn] = useState<
		boolean | null
	>(null);
	const isSignedIn = useAppSelector(selectIsSignedIn);
	const userInformation = useAppSelector(selectUserInformation);
	const location = useLocation();
	const isSmallScreen = useIsSmallScreen();
	const rootUiFolder = useMemo(
		() => searchFolder(rootFolder, searchText ?? ""),
		[rootFolder, searchText],
	);

	if (previousIsSignedIn !== isSignedIn) {
		setPreviousIsSignedIn(isSignedIn);
		setShowVerifyEmailDialog(
			isSignedIn && !userInformation?.isEmailVerified,
		);
	}

	const handleToggleExpand = () => {
		if (isExpanded) onCollapse();
		else onExpand();
	};

	const openHelpWebsite = useCallback(async () => {
		await openUrl("https://help.brainylearn.app/");
	}, []);

	useGlobalKey(e => {
		if (isModKey(e) && e.key === "\\") {
			handleToggleExpand();
		} else if (e.key === "F1") {
			void openHelpWebsite();
		} else if (isModKey(e) && e.shiftKey && e.key.toLowerCase() === "f") {
			void navigate("/search");
		}
	});

	const handleSettingsButtonClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onSettingsClick();
	};

	return (
		<aside
			className={`${styles.sideBar} ${!isExpanded && styles.closed} ${isSmallScreen && styles.smallScreen}`}>
			<div className={styles.sideBarTopContainer}>
				<div className={styles.header}>
					<div className={styles.titleRow}>
						<img src="icon.svg" alt="logo" />
						<h2>Brainy</h2>
					</div>

					<button
						className={`transparent center ${styles.toggleButton}`}
						onClick={() => handleToggleExpand()}
						title="Expand/Collapse sidebar (Ctrl + \)">
						<Icon
							path={
								isExpanded
									? mdiChevronDoubleLeft
									: mdiChevronDoubleRight
							}
							size={1}
						/>
					</button>
				</div>

				<div className={styles.rows}>
					<button
						className={`${
							location.pathname === "/" ||
							location.pathname.startsWith("/home")
								? "primary"
								: "transparent"
						} ${styles.row}`}
						title="Home (Ctrl + H)"
						onClick={() => void navigate("/home")}>
						<Icon path={mdiHomeOutline} size="1em" />
						<p>Home</p>
					</button>

					<button
						className={`${
							location.pathname.startsWith("/search")
								? "primary"
								: "transparent"
						} ${styles.row}`}
						title="Search (Ctrl + Shift + F)"
						onClick={() => void navigate("/search")}>
						<Icon path={mdiFileSearchOutline} size="1em" />
						<p>Search</p>
					</button>

					<button
						className={`transparent ${styles.row}`}
						title="Settings (Ctrl + P)"
						onClick={handleSettingsButtonClick}>
						<Icon path={mdiCogOutline} size="1em" />
						<p>Settings</p>
					</button>

					{isSignedIn && userInformation?.isEmailVerified && (
						<SyncRow />
					)}

					<button
						className={`transparent ${styles.row}`}
						title="Help (F1)"
						onClick={() => void openHelpWebsite()}>
						<Icon path={mdiHelpCircleOutline} size="1em" />
						<p>Help</p>
					</button>
				</div>

				<div className={styles.searchInputContainer}>
					<InputWithIcon
						iconName={mdiMagnify}
						value={searchText ?? ""}
						onChange={e => setSearchText(e.target.value)}
						placeholder="Search"
						className={styles.searchInput}
					/>
				</div>

				{errorMessage && (
					<Alert
						className={styles.alert}
						onClose={() => dispatch(setErrorMessage(""))}
						type="error">
						<p>{errorMessage}</p>
					</Alert>
				)}

				{successMessage && (
					<Alert
						className={styles.alert}
						onClose={() => dispatch(setSuccessMessage(""))}
						type="primary">
						<p>{successMessage}</p>
					</Alert>
				)}

				{isSignedIn && !userInformation?.isEmailVerified && (
					<button
						className={`secondary ${styles.verifyButton}`}
						onClick={() => setShowVerifyEmailDialog(true)}>
						<Icon path={mdiAlertCircleOutline} size={1} />
						<p>Verify your email!</p>
					</button>
				)}

				<FileTree folder={rootUiFolder} className={styles.fileTree} />
			</div>

			{!isSignedIn && (
				<button
					className={`transparent ${styles.bottomButton}`}
					onClick={() => setShowUserDialog(true)}>
					<Icon path={mdiLoginVariant} size={1} /> <p>Sign-in/up</p>
				</button>
			)}

			{showUserDialog && (
				<UserDialog onClose={() => setShowUserDialog(false)} />
			)}

			{showVerifyEmailDialog && (
				<VerifyEmailDialog
					onClose={() => setShowVerifyEmailDialog(false)}
				/>
			)}
		</aside>
	);
}

export default SideBar;
