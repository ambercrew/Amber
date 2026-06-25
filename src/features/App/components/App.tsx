import styles from "./styles.module.css";
import { useCallback, useEffect, useState } from "react";
import Alert from "../../../components/Alert/Alert";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { getReviewTreeFolderForRoot } from "../../../stores/fileSystem/fileSystemActions";
import SideBar from "../../SideBar/components/SideBar";
import Settings from "../../Settings/components/Settings";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { isModKey } from "../../../utils/keyboardUtils";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { SMALL_SCREEN_MAX_WIDTH_IN_PX } from "../../../config/constants";
import Updater from "../../Updater/components/Updater";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import useIsSmallScreen from "../../../hooks/useIsSmallScreen";
import AiChatWidget from "../../AiChatWidget/components/AiChatWidget";
import { initialLoadApplicationState } from "../../../stores/app/appActions.ts";
import useAppSelector from "../../../hooks/useAppSelector.ts";
import { selectAreSettingsLoaded } from "../../../stores/settings/settingsSelector.ts";
import useApi from "../../../hooks/useApi.ts";
import { isMobile } from "../../../utils/tauriUtils.ts";
import { TOOL_CALL_ACCEPTED_EVENT } from "../../../types/events/toolCallAcceptedEvent.ts";

function App() {
	const [showSettings, setShowSettings] = useState(false);
	const { callApi, errorMessage, clearErrorMessage } = useApi();
	const [isSideBarExpanded, setIsSideBarExpanded] = useState(true);
	const location = useLocation();
	const [previousLocation, setPreviousLocation] = useState(location);
	const isSmallScreen = useIsSmallScreen();
	const areSettingsLoaded = useAppSelector(selectAreSettingsLoaded);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	if (location !== previousLocation) {
		setPreviousLocation(location);
		if (window.innerWidth <= SMALL_SCREEN_MAX_WIDTH_IN_PX)
			setIsSideBarExpanded(false);
	}

	useEffect(() => {
		const contextMenuCb = (e: MouseEvent) => {
			if (!import.meta.env.DEV) e.preventDefault();
		};

		window.addEventListener("contextmenu", contextMenuCb);
		return () => {
			window.removeEventListener("contextmenu", contextMenuCb);
		};
	}, []);

	useEffect(() => {
		void dispatch(initialLoadApplicationState());
	}, [dispatch]);

	useEffect(() => {
		const cb = async () => await dispatch(getReviewTreeFolderForRoot());
		defaultGlobalSyncEventManager.addListener(
			ListenerType.PostSyncComplete,
			cb,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PostSyncComplete,
				cb,
			);
	}, [dispatch]);

	useEffect(() => {
		// Reloading the state.
		const id = setInterval(() => {
			void dispatch(getReviewTreeFolderForRoot());
		}, 60 * 1000);

		return () => clearInterval(id);
	}, [dispatch]);

	useEffect(() => {
		const cb = () => {
			void dispatch(getReviewTreeFolderForRoot());
		};

		window.addEventListener(TOOL_CALL_ACCEPTED_EVENT, cb);
		return () => window.removeEventListener(TOOL_CALL_ACCEPTED_EVENT, cb);
	}, [dispatch]);

	useGlobalKey(e => {
		if (isModKey(e) && e.key.toLowerCase() === "p") {
			e.preventDefault();
			setShowSettings(true);
		} else if (isModKey(e) && e.key.toLowerCase() === "h") {
			e.preventDefault();
			void navigate("/home");
		} else if (
			(isModKey(e) && e.key.toLowerCase() === "r") ||
			e.key === "F5" ||
			(isModKey(e) && e.key.toLowerCase() === "f")
		) {
			e.preventDefault();
		}
	}, "keydown");

	const handleSideBarCollapse = useCallback(() => {
		setIsSideBarExpanded(false);
	}, []);

	// Used to avoid showing in wrong theme, or zoom before settings are loaded.
	if (!areSettingsLoaded) return null;

	return (
		<div className={`${styles.workspace}`}>
			{!isMobile() && <Updater callApi={callApi} />}

			{errorMessage && (
				<div className={styles.errorDialog}>
					<Alert type="error" onClose={() => clearErrorMessage()}>
						<p>{errorMessage}</p>
					</Alert>
				</div>
			)}

			<SideBar
				onExpand={() => setIsSideBarExpanded(true)}
				onCollapse={handleSideBarCollapse}
				isExpanded={isSideBarExpanded}
			/>

			<div
				className={`${styles.workarea} ${isSmallScreen && isSideBarExpanded && styles.hidden}`}>
				<Routes>
					{["/"].map(path => (
						<Route key={path} path={path} element={<></>} />
					))}
				</Routes>

				<AiChatWidget />
			</div>

			{showSettings && (
				<Settings onClose={() => setShowSettings(false)} />
			)}
		</div>
	);
}

export default App;
