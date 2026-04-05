import Editor from "../../Editor/components/Editor";
import styles from "./styles.module.css";
import { useEffect, useRef, useState } from "react";
import Alert from "../../../components/Alert/Alert";
import Reviewer from "../../Reviewer/components/Reviewer";
import Home from "../../Home/components/Home";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { getReviewTreeFolderForRoot } from "../../../stores/fileSystem/fileSystemActions";
import SideBar from "../../SideBar/components/SideBar";
import Settings from "../../Settings/components/Settings";
import useGlobalKey from "../../../hooks/useGlobalKey";
import {
	Route,
	Routes,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router";
import {
	FILE_ID_QUERY_PARAMETER,
	SMALL_SCREEN_MAX_WIDTH_IN_PX,
} from "../../../config/constants";
import FromRouteState from "../../../types/fromRouteState";
import Searcher from "../../Searcher/components/Searcher";
import Updater from "../../Updater/components/Updater";
import { loadInitialUserState } from "../../../stores/user/userActions";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import { initialLoadAndApplySettings } from "../../../stores/settings/settingsActions";
import { sync } from "../../../stores/sync/syncActions";
import SettingsType from "../../../types/backend/model/settings";
import useIsSmallScreen from "../../../hooks/useIsSmallScreen";
import AiChatWidget from "../../AiChatWidget/components/AiChatWidget";

function App() {
	const [areSettingsLoaded, setAreSettingsLoaded] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [searchParams] = useSearchParams();
	const [studyFileIds, setStudyFileIds] = useState<string[]>([]);
	const [editorInitialSelectedCellId, setInitialSelectedCellId] = useState<
		string | null
	>(null);
	const [isSideBarExpanded, setIsSideBarExpanded] = useState(true);
	const location = useLocation();
	const [previousLocation, setPreviousLocation] = useState(location);
	const loadedInitialState = useRef(false);
	const selectedFileId = searchParams.get(FILE_ID_QUERY_PARAMETER);
	const isSmallScreen = useIsSmallScreen();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	if (location !== previousLocation) {
		setPreviousLocation(location);
		if (window.innerWidth <= SMALL_SCREEN_MAX_WIDTH_IN_PX)
			setIsSideBarExpanded(false);
	}

	const handleEditorStudyClick = () => {
		setStudyFileIds([selectedFileId!]);
		void navigate("/reviewer", {
			state: {
				from: location.pathname,
				fromSearch: location.search,
			} as FromRouteState,
		});
	};

	const handleHomeStudyClick = (fileIds: string[]) => {
		setStudyFileIds(fileIds);
		void navigate("/reviewer");
	};

	useEffect(() => {
		void (async () => {
			if (loadedInitialState.current) return;
			loadedInitialState.current = true;

			let settings: SettingsType | null = null;
			try {
				// Settings must be loaded on start always before anything else!
				settings = await dispatch(initialLoadAndApplySettings());
			} finally {
				setAreSettingsLoaded(true);
			}

			await dispatch(getReviewTreeFolderForRoot());
			await dispatch(loadInitialUserState());

			// Sync on app close is added as an event in the settings actions.
			if (settings?.autoSync) await dispatch(sync());
		})();

		const contextMenuCb = (e: MouseEvent) => {
			if (!import.meta.env.DEV) e.preventDefault();
		};
		window.addEventListener("contextmenu", contextMenuCb);

		return () => {
			window.removeEventListener("contextmenu", contextMenuCb);
		};
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

	useGlobalKey(e => {
		if (e.ctrlKey && e.key.toLowerCase() === "p") {
			e.preventDefault();
			setShowSettings(true);
		} else if (e.ctrlKey && e.key.toLowerCase() === "h") {
			e.preventDefault();
			void navigate("/home");
		} else if (
			(e.ctrlKey && e.key.toLowerCase() === "r") ||
			e.key === "F5" ||
			(e.ctrlKey && e.key.toLowerCase() === "f")
		) {
			e.preventDefault();
		}
	}, "keydown");

	const handleEditButtonClick = (fileId: string, cellId: string) => {
		setInitialSelectedCellId(cellId);
		searchParams.set(FILE_ID_QUERY_PARAMETER, fileId);
		void navigate({
			pathname: "editor",
			search: searchParams.toString(),
		});
	};

	// Used to avoid showing in wrong theme, or zoom before settings are loaded.
	if (!areSettingsLoaded) return null;

	return (
		<div className={`${styles.workspace}`}>
			<Updater />

			{errorMessage && (
				<div className={styles.errorDialog}>
					<Alert type="error" onClose={() => setErrorMessage(null)}>
						<p>{errorMessage}</p>
					</Alert>
				</div>
			)}

			<SideBar
				onSettingsClick={() => setShowSettings(true)}
				onExpand={() => setIsSideBarExpanded(true)}
				onCollapse={() => setIsSideBarExpanded(false)}
				isExpanded={isSideBarExpanded}
			/>

			<div
				className={`${styles.workarea} ${isSmallScreen && isSideBarExpanded && styles.hidden}`}>
				<Routes>
					{["/", "/home"].map(path => (
						<Route
							key={path}
							path={path}
							element={
								<Home
									onStudyClick={handleHomeStudyClick}
									onError={setErrorMessage}
								/>
							}
						/>
					))}
					<Route
						path="/editor"
						element={
							<Editor
								initialSelectedCellId={
									editorInitialSelectedCellId
								}
								onError={setErrorMessage}
								onStudyStart={() => handleEditorStudyClick()}
								key={selectedFileId}
							/>
						}
					/>
					<Route
						path="/reviewer"
						element={
							<Reviewer
								onEditButtonClick={handleEditButtonClick}
								onError={setErrorMessage}
								fileIds={studyFileIds}
							/>
						}
					/>
					<Route
						path="/search"
						element={
							<Searcher
								onError={setErrorMessage}
								onEditButtonClick={handleEditButtonClick}
							/>
						}
					/>
				</Routes>
			</div>

			{showSettings && (
				<Settings onClose={() => setShowSettings(false)} />
			)}

			{location.pathname !== "/reviewer" && <AiChatWidget />}
		</div>
	);
}

export default App;
