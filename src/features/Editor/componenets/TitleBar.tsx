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

interface Props {
	repetitionCounts: FileRepetitionCounts;
	searchText: string;
	searchInputRef: React.RefObject<HTMLInputElement | null>;
	onSearchTextChange: (value: string) => void;
	onStudyButtonClick: () => void;
}

function TitleBar({
	repetitionCounts,
	searchText,
	searchInputRef,
	onSearchTextChange,
	onStudyButtonClick,
}: Props) {
	const [searchParams] = useSearchParams();
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
			searchInputRef.current?.focus();
		}
	}, "keydown");

	return (
		<div className={styles.titleBar}>
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

			<InputWithIcon
				iconName={mdiMagnify}
				placeholder="Search (Ctrl + f)"
				value={searchText}
				onChange={e => onSearchTextChange(e.target.value)}
				containerClassName={styles.searchInputContainer}
				ref={searchInputRef}
				inputClassName={styles.searchInput}
			/>
		</div>
	);
}

export default TitleBar;
