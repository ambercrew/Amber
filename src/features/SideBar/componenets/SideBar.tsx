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
import { useCallback, useEffect, useMemo, useState } from "react";
import searchFolder from "../utils/searchFolder";
import { mdiChevronLeft, mdiCog, mdiHelp, mdiHome, mdiMagnify } from "@mdi/js";
import Icon from "@mdi/react";
import InputWithIcon from "../../../components/InputWithIcon/InputWithIcon";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useLocation, useNavigate } from "react-router";
import { SMALL_SCREEN_MAX_WIDTH_IN_PX } from "../../../config/constants";

interface Props {
	onSettingsClick: () => void;
}

function SideBar({ onSettingsClick }: Props) {
	const [searchText, setSearchText] = useState<string | null>(null);
	const [isExpanded, setIsExpanded] = useState(true);
	const rootFolder = useAppSelector(selectRootFolder);
	const errorMessage = useAppSelector(selectErrorMessage);
	const successMessage = useAppSelector(selectSuccessMessage);
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const rootUiFolder = useMemo(
		() => searchFolder(rootFolder, searchText ?? ""),
		[rootFolder, searchText],
	);

	useEffect(() => {
		if (window.innerWidth > SMALL_SCREEN_MAX_WIDTH_IN_PX) return;
		setIsExpanded(false);
	}, [location]);

	const openHelpWebiste = useCallback(() => {
		void openUrl("https://ramialkawadri.github.io/Brainy-docs/");
	}, []);

	useGlobalKey(e => {
		if (e.ctrlKey && e.key == "\\") {
			setIsExpanded(!isExpanded);
		} else if (e.key === "F1") {
			openHelpWebiste();
		} else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
			void navigate("/search");
		}
	});

	const handleSettingsButtonClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onSettingsClick();
	};

	// TODO: add show login dialog button
	return (
		<div className={`${styles.sideBar} ${!isExpanded && styles.closed}`}>
			<div className={styles.header}>
				<div className={styles.titleRow}>
					<img src="icon.svg" />
					<h2>Brainy</h2>
				</div>

				<button
					className={`transparent center ${styles.toggleButton}`}
					onClick={() => setIsExpanded(!isExpanded)}
					title="Expand/Collapse sidebar (Ctrl + \)">
					<Icon path={mdiChevronLeft} size={1} />
				</button>
			</div>

			<div className={styles.rows}>
				<button
					className={`${
						(location.pathname === "/" ||
							location.pathname.startsWith("/home")) &&
						styles.active
					} ${styles.row}`}
					title="Home (Ctrl + H)"
					onClick={() => void navigate("/home")}>
					<Icon path={mdiHome} size="1em" />
					<p>Home</p>
				</button>

				<button
					className={`${
						location.pathname.startsWith("/search") && styles.active
					} ${styles.row}`}
					title="Search (Ctrl + Shift + F)"
					onClick={() => void navigate("/search")}>
					<Icon path={mdiMagnify} size="1em" />
					<p>Search</p>
				</button>

				<button
					className={`${styles.row}`}
					title="Settings (Ctrl + P)"
					onClick={handleSettingsButtonClick}>
					<Icon path={mdiCog} size="1em" />
					<p>Settings</p>
				</button>

				<button
					className={`${styles.row}`}
					title="Help (F1)"
					onClick={openHelpWebiste}>
					<Icon path={mdiHelp} size="1em" />
					<p>Help</p>
				</button>
			</div>

			<div className={styles.searchInputContainer}>
				<InputWithIcon
					iconName={mdiMagnify}
					value={searchText ?? ""}
					onChange={e => setSearchText(e.target.value)}
					placeholder="Search"
					inputClassName={styles.searchInput}
				/>
			</div>

			{errorMessage && (
				<Alert
					className={styles.alert}
					message={errorMessage}
					onClose={() => dispatch(setErrorMessage(""))}
					type="error"
				/>
			)}

			{successMessage && (
				<Alert
					className={styles.alert}
					message={successMessage}
					onClose={() => dispatch(setSuccessMessage(""))}
					type="primary"
				/>
			)}

			<FileTree folder={rootUiFolder} />
		</div>
	);
}

export default SideBar;
