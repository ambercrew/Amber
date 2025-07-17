import Editor from "../Editor/Editor";
import styles from "./styles.module.css";
import { useEffect, useRef, useState } from "react";
import ErrorBox from "../../ui/ErrorBox/ErrorBox";
import Reviewer from "../Reviewer/Reviewer";
import Home from "../Home/Home";
import useAppDispatch from "../../hooks/useAppDispatch";
import { fetchFiles } from "../../store/actions/fileSystemActions";
import SideBar from "../SideBar/SideBar";
import SettingsPopup from "../SettingsPopup/SettingsPopup";
import { getSettings } from "../../api/settingsApi";
import applySettings from "../../util/applySettings";
import useGlobalKey from "../../hooks/useGlobalKey";
import {
	Route,
	Routes,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router";
import { fileIdQueryParameter } from "../../constants";
import FromRouteState from "../../type/fromRouteState";
import Searcher from "../Searcher/Searcher";
import Updater from "../Updater/Updater";

function App() {
	const [showSettings, setShowSettings] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [searchParams] = useSearchParams();
	const studyFileIds = useRef<number[]>([]);
	const editCellId = useRef<number | null>(null);
	const selectedFileId = Number(searchParams.get(fileIdQueryParameter));
	const location = useLocation();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const handleEditorStudyClick = () => {
		studyFileIds.current = [selectedFileId];
		void navigate("/reviewer", {
			state: {
				from: location.pathname,
				fromSearch: location.search,
			} as FromRouteState,
		});
	};

	const handleHomeStudyClick = (fileIds: number[]) => {
		studyFileIds.current = fileIds;
		void navigate("/reviewer");
	};

	useEffect(() => {
		void dispatch(fetchFiles());
		void (async () => {
			const settings = await getSettings();
			applySettings(settings);
		})();

		document.addEventListener("contextmenu", e => {
			if (!import.meta.env.DEV) e.preventDefault();
		});

		document.addEventListener("keydown", e => {
			if ((e.ctrlKey && e.key.toLowerCase() === "r") || e.code === "F5") {
				e.preventDefault();
			}
		});
	}, [dispatch]);

	useGlobalKey(e => {
		if (e.ctrlKey && e.key.toLowerCase() === "p") {
			e.preventDefault();
			setShowSettings(true);
		} else if (e.ctrlKey && e.key.toLowerCase() === "h") {
			e.preventDefault();
			void navigate("/home");
		} else if (e.code === "F5") {
			e.preventDefault();
		}
	}, "keydown");

	const handleEditButtonClick = (fileId: number, cellId: number) => {
		editCellId.current = cellId;
		searchParams.set(fileIdQueryParameter, fileId.toString());
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
					<ErrorBox
						message={errorMessage}
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
								editCellId={editCellId.current}
								onError={setErrorMessage}
								onStudyStart={() => handleEditorStudyClick()}
							/>
						}
					/>
					<Route
						path="/reviewer"
						element={
							<Reviewer
								onEditButtonClick={handleEditButtonClick}
								onError={setErrorMessage}
								fileIds={studyFileIds.current}
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
