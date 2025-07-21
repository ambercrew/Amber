import { useCallback, useEffect, useRef, useState } from "react";
import TitleBar from "./TitleBar";
import styles from "./styles.module.css";
import Cell from "../../../types/backend/entity/cell";
import FileRepetitionCounts from "../../../types/backend/model/fileRepetitionCounts";
import { getFileCellsOrderedByIndex } from "../../../api/cellApi";
import {
	getFileRepetitions,
	getStudyRepetitionCounts,
} from "../../../api/repetitionApi";
import errorToString from "../../../utils/errorToString";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { useSearchParams } from "react-router";
import { fileIdQueryParameter } from "../../../config/constants";
import Repetition from "../../../types/backend/entity/repetition";
import EditableCells from "../../EditableCells/components/EditableCells";

interface Props {
	editCellId: number | null;
	onError: (error: string) => void;
	onStudyStart: () => void;
}

function Editor({ editCellId, onError, onStudyStart }: Props) {
	const [repetitions, setRepetitions] = useState<Repetition[]>([]);
	const [searchText, setSearchText] = useState("");
	const [repetitionCounts, setRepetitionCounts] =
		useState<FileRepetitionCounts>({
			new: 0,
			learning: 0,
			relearning: 0,
			review: 0,
		});
	const [cells, setCells] = useState<Cell[]>([]);
	const [searchParams] = useSearchParams();
	const isCellsLoaded = useRef(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const selectedFileId = Number(searchParams.get(fileIdQueryParameter));

	useGlobalKey(e => {
		if (e.code === "F5") {
			onStudyStart();
		}
	}, "keydown");

	const executeRequest = useCallback(
		async <T,>(cb: () => Promise<T>): Promise<T | null> => {
			try {
				return await cb();
			} catch (e) {
				console.error(e);
				onError(errorToString(e));
			}
			return null;
		},
		[onError],
	);

	const retrieveRepetitionCounts = useCallback(async () => {
		await executeRequest(async () => {
			const repetitionCounts =
				await getStudyRepetitionCounts(selectedFileId);
			setRepetitionCounts(repetitionCounts);
		});
	}, [executeRequest, selectedFileId]);

	const retrieveSelectedFileCells = useCallback(async () => {
		return await executeRequest(async () => {
			const fetchedCells =
				await getFileCellsOrderedByIndex(selectedFileId);
			const fetchedRepetitions = await getFileRepetitions(selectedFileId);
			setCells(fetchedCells);
			setRepetitions(fetchedRepetitions);
		});
	}, [executeRequest, selectedFileId]);

	useEffect(() => {
		const intervalId = setInterval(
			retrieveRepetitionCounts,
			60 * 1000, // One minute.
		);
		return () => clearInterval(intervalId);
	}, [retrieveRepetitionCounts]);

	useEffect(() => {
		void (async () => {
			isCellsLoaded.current = false;
			await retrieveRepetitionCounts();
			await retrieveSelectedFileCells();
			isCellsLoaded.current = true;
			setSearchText("");
		})();
	}, [retrieveSelectedFileCells, retrieveRepetitionCounts]);

	const handleCellsUpdate = useCallback(async () => {
		await retrieveSelectedFileCells();
		await retrieveRepetitionCounts();
	}, [retrieveRepetitionCounts, retrieveSelectedFileCells]);

	return (
		<div className={styles.container} key={selectedFileId}>
			<TitleBar
				repetitionCounts={repetitionCounts}
				onStudyButtonClick={onStudyStart}
				searchText={searchText}
				onSearchTextChange={setSearchText}
				searchInputRef={searchInputRef}
			/>

			{isCellsLoaded.current && (
				<EditableCells
					cells={cells}
					searchText={searchText}
					repetitions={repetitions}
					onError={onError}
					editCellId={editCellId}
					fileId={selectedFileId}
					onCellsUpdateSave={handleCellsUpdate}
					autoFocusEditor={
						document.activeElement !== searchInputRef.current
					}
					enableFileSpecificFunctionality={
						searchText !== null && searchText.length === 0
					}
					className={styles.editor}
				/>
			)}
		</div>
	);
}

export default Editor;
