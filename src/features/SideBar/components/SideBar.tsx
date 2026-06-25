import styles from "./styles.module.css";
import useAppSelector from "../../../hooks/useAppSelector";
import { useCallback, useEffect, useState } from "react";
import {
	mdiChevronDoubleLeft,
	mdiChevronDoubleRight,
	mdiLoginVariant,
} from "@mdi/js";
import { Icon } from "@mdi/react";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useNavigate } from "react-router";
import UserDialog from "../../AuthDialog/components/UserDialog";
import {
	selectIsSignedIn,
	selectUserInformation,
} from "../../../stores/user/userSelectors";
import VerifyEmailDialog from "../../AuthDialog/components/VerifyEmailDialog";
import useIsSmallScreen from "../../../hooks/useIsSmallScreen";
import { isModKey } from "../../../utils/keyboardUtils";

interface Props {
	isExpanded: boolean;
	onExpand: () => void;
	onCollapse: () => void;
}

function SideBar({ isExpanded, onExpand, onCollapse }: Props) {
	const [showUserDialog, setShowUserDialog] = useState(false);
	const [showVerifyEmailDialog, setShowVerifyEmailDialog] = useState(false);
	const navigate = useNavigate();
	const [previousIsSignedIn, setPreviousIsSignedIn] = useState<
		boolean | null
	>(null);
	const isSignedIn = useAppSelector(selectIsSignedIn);
	const userInformation = useAppSelector(selectUserInformation);
	const isSmallScreen = useIsSmallScreen();

	useEffect(() => {
		if (isSmallScreen) onCollapse();
	}, [isSmallScreen, onCollapse]);

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

	return (
		<aside
			className={`${styles.sideBar} ${!isExpanded && styles.closed} ${isSmallScreen && styles.smallScreen}`}>
			<div className={styles.sideBarTopContainer}>
				<div className={styles.header}>
					<h2 className={styles.title}>Brainy</h2>

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
			</div>

			{!isSignedIn && (
				<div className={styles.bottomButtonContainer}>
					<button
						className={`transparent ${styles.bottomButton}`}
						onClick={() => setShowUserDialog(true)}>
						<Icon path={mdiLoginVariant} size={1} />{" "}
						<p>Sign-in/up</p>
					</button>
				</div>
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
