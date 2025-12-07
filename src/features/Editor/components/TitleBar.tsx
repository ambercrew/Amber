import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { mdiMagnify, mdiPlayOutline } from "@mdi/js";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectFileById } from "../../../stores/fileSystem/fileSystemSelectors";
import FileRepetitionCounts from "../../../types/backend/model/fileRepetitionCounts";
import { useSearchParams } from "react-router";
import { fileIdQueryParameter } from "../../../config/constants";
import InputWithIcon from "../../../components/InputWithIcon/InputWithIcon";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { useEffect, useRef, useState } from "react";

interface Props {
	repetitionCounts: FileRepetitionCounts;
	searchText: string;
	onSearchTextChange: (value: string) => void;
	onStudyButtonClick: () => void;
	onSearchInputFocus: () => void;
	onSearchInputBlur: () => void;
}

function TitleBar({
	repetitionCounts,
	searchText,
	onSearchTextChange,
	onStudyButtonClick,
	onSearchInputFocus,
	onSearchInputBlur,
}: Props) {
	// Only used for small screens.
	const [showSearchBar, setShowSearchBar] = useState(false);
	const [searchParams] = useSearchParams();
	const searchInputRef = useRef<HTMLInputElement>(null);
	const selectedFileId = searchParams.get(fileIdQueryParameter);
	const selectedFile = useAppSelector(state =>
		selectFileById(state, selectedFileId!),
	);

	const isStudyButtonDisabled =
		repetitionCounts.new +
			repetitionCounts.learning +
			repetitionCounts.relearning +
			repetitionCounts.review ===
		0;

	useGlobalKey(e => {
		if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "f") {
			e.preventDefault();
			setShowSearchBar(true);
			searchInputRef.current?.focus();
		}
	}, "keydown");

	useEffect(() => {
		if (!searchInputRef.current) return;

		if (showSearchBar) searchInputRef.current.focus();
		// Removing search text when the search bar is hidden.
		else onSearchTextChange("");
	}, [showSearchBar, onSearchTextChange]);

	const handleSearchInputFocus = () => {
		setShowSearchBar(true);
		onSearchInputFocus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Escape") {
			setShowSearchBar(false);
		}
	};

	return (
		<div className={styles.titleBar}>
			<div className={styles.titleAndSearchButton}>
				<div className={styles.info}>
					<button
						className={`transparent ${styles.studyButton}`}
						onClick={onStudyButtonClick}
						disabled={isStudyButtonDisabled}>
						<Icon path={mdiPlayOutline} size={1} />
						<span className={styles.label}>Study</span>
					</button>
					<div>
						<p>{selectedFile?.name}</p>
						<div className={styles.repetitionCounts}>
							<span>New: {repetitionCounts.new}</span>
							<span>&#x2022;</span>
							<span>
								Learn:&nbsp;
								{repetitionCounts.learning +
									repetitionCounts.relearning}
							</span>
							<span>&#x2022;</span>
							<span>Review: {repetitionCounts.review}</span>
						</div>
					</div>
				</div>

				{/* Only shown on small screens */}
				<button
					className={`transparent ${styles.searchButton}`}
					onClick={() => setShowSearchBar(!showSearchBar)}>
					<Icon path={mdiMagnify} size={1} />
				</button>
			</div>

			<InputWithIcon
				iconName={mdiMagnify}
				placeholder="Search (Ctrl + F)"
				value={searchText}
				onChange={e => onSearchTextChange(e.target.value)}
				containerClassName={`${styles.searchInputContainer} ${showSearchBar && styles.shown}`}
				ref={searchInputRef}
				className={styles.searchInput}
				onFocus={handleSearchInputFocus}
				onBlur={onSearchInputBlur}
				onKeyDown={handleKeyDown}
			/>
		</div>
	);
}

export default TitleBar;
