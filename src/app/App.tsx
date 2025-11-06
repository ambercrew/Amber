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
import { fileIdQueryParameter } from "../config/constants";
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
	const [editCellId, setEditCellId] = useState<string | null>(null);
	const selectedFileId = searchParams.get(fileIdQueryParameter);
	const location = useLocation();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

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
			const userInformation = await dispatch(loadInitialStateUser());
			await dispatch(
				initialLoadAndApplySettings(userInformation !== null),
			);
		})();

		document.addEventListener("contextmenu", e => {
			if (!import.meta.env.DEV) e.preventDefault();
		});

		document.addEventListener("keydown", e => {
			if ((e.ctrlKey && e.key.toLowerCase() === "r") || e.key === "F5") {
				e.preventDefault();
			}
		});
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
		setEditCellId(cellId);
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

			<SideBar onSettingsClick={() => setShowSettings(true)} />

			<div className={`${styles.workarea}`}>
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
								editCellId={editCellId}
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
				<SettingsPopup
					onClose={() => setShowSettings(false)}
					onError={setErrorMessage}
				/>
			)}
		</div>
	);
}

export default App;
