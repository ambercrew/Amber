import Editor from "../features/Editor/componenets/Editor";
import styles from "./styles.module.css";
import { useEffect, useState } from "react";
import Alert from "../components/Alert/Alert";
import Reviewer from "../features/Reviewer/components/Reviewer";
import Home from "../features/Home/componenets/Home";
import useAppDispatch from "../hooks/useAppDispatch";
import { getReviewTreeFolderForRoot } from "../stores/fileSystem/fileSystemActions";
import SideBar from "../features/SideBar/componenets/SideBar";
import SettingsPopup from "../features/SettingsPopup/componenets/SettingsPopup";
import useGlobalKey from "../hooks/useGlobalKey";
import {
	Route,
	Routes,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router";
import {
	fileIdQueryParameter,
	SMALL_SCREEN_MAX_WIDTH_IN_PX,
} from "../config/constants";
import FromRouteState from "../types/fromRouteState";
import Searcher from "../features/Searcher/componenets/Searcher";
import Updater from "../features/Updater/componenets/Updater";
import { loadInitialStateUser } from "../stores/user/userActions";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../stores/sync/managers/syncEventManager";
import { initialLoadAndApplySettings } from "../stores/settings/settingsActions";

function App() {
	const [showSettings, setShowSettings] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [searchParams] = useSearchParams();
	const [studyFileIds, setStudyFileIds] = useState<string[]>([]);
	const [editorInitialSelectedCellId, setInitialSelectedCellId] = useState<
		string | null
	>(null);
	const [isSideBarExpanded, setIsSideBarExpanded] = useState(true);
	const [isSmallScreen, setIsSmallScreen] = useState(
		window.innerWidth <= SMALL_SCREEN_MAX_WIDTH_IN_PX,
	);
	const location = useLocation();
	const [previousLocation, setPreviousLocation] = useState(location);
	const selectedFileId = searchParams.get(fileIdQueryParameter);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	useEffect(() => {
		const cb = () =>
			setIsSmallScreen(window.innerWidth <= SMALL_SCREEN_MAX_WIDTH_IN_PX);
		window.addEventListener("resize", cb);
		return () => window.removeEventListener("resize", cb);
	}, []);

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
			await dispatch(getReviewTreeFolderForRoot());
			await dispatch(loadInitialStateUser());
			await dispatch(initialLoadAndApplySettings());
		})();

		const contextMenuCb = (e: MouseEvent) => {
			if (!import.meta.env.DEV) e.preventDefault();
		};
		window.addEventListener("contextmenu", contextMenuCb);

		const keyDownCb = (e: KeyboardEvent) => {
			if (
				(e.ctrlKey && e.key.toLowerCase() === "r") ||
				e.key === "F5" ||
				(e.ctrlKey && e.key.toLowerCase() === "f")
			) {
				e.preventDefault();
			}
		};
		window.addEventListener("keydown", keyDownCb);

		return () => {
			window.removeEventListener("contextmenu", contextMenuCb);
			window.removeEventListener("keydown", keyDownCb);
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
	});

	useGlobalKey(e => {
		if (e.ctrlKey && e.key.toLowerCase() === "p") {
			e.preventDefault();
			setShowSettings(true);
		} else if (e.ctrlKey && e.key.toLowerCase() === "h") {
			e.preventDefault();
			void navigate("/home");
		} else if (e.key === "F5") {
			e.preventDefault();
		}
	}, "keydown");

	const handleEditButtonClick = (fileId: string, cellId: string) => {
		setInitialSelectedCellId(cellId);
		searchParams.set(fileIdQueryParameter, fileId);
		void navigate({
			pathname: "editor",
			search: searchParams.toString(),
		});
	};

	return (
		<div className={`${styles.workspace}`}>
			<Updater />

			{errorMessage && (
				<div className={styles.errorDialog}>
					<Alert
						message={errorMessage}
						type="error"
						onClose={() => setErrorMessage(null)}
					/>
				</div>
			)}

			<SideBar
				onSettingsClick={() => setShowSettings(true)}
				onExpand={() => setIsSideBarExpanded(true)}
				onCollapse={() => setIsSideBarExpanded(false)}
				isExpanded={isSideBarExpanded}
			/>

			{
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
									onStudyStart={() =>
										handleEditorStudyClick()
									}
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
			}

			{showSettings && (
				<SettingsPopup
					onClose={() => setShowSettings(false)}
					onError={setErrorMessage}
				/>
			)}
		</div>
	);
}

export default App;
