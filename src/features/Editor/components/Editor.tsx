import { useCallback, useEffect, useState } from "react";
import TitleBar from "./TitleBar";
import styles from "./styles.module.css";
import Cell from "../../../types/backend/entity/cell";
import FileRepetitionCounts from "../../../types/backend/model/fileRepetitionCounts";
import { getFileCellsOrderedByIndex } from "../../../api/cellApi";
import { getStudyRepetitionCounts } from "../../../api/repetitionApi";
import errorToString from "../../../utils/errorToString";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { useSearchParams } from "react-router";
import { FILE_ID_QUERY_PARAMETER } from "../../../config/constants";
import EditableCells from "../../EditableCells/components/EditableCells";
import {
	TOOL_CALL_ACCEPTED_EVENT,
	ToolCallAcceptedPayload,
} from "../../../types/events/toolCallAcceptedEvent";

interface Props {
	initialSelectedCellId: string | null;
	onError: (error: string) => void;
	onStudyStart: () => void;
}

function Editor({ initialSelectedCellId, onError, onStudyStart }: Props) {
	const [searchText, setSearchText] = useState("");
	const [repetitionCounts, setRepetitionCounts] =
		useState<FileRepetitionCounts>({
			new: 0,
			learning: 0,
			relearning: 0,
			review: 0,
		});
	const [cells, setCells] = useState<Cell[]>([]);
	const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
	const [searchParams] = useSearchParams();
	const selectedFileId = searchParams.get(FILE_ID_QUERY_PARAMETER)!;

	useGlobalKey(e => {
		if (e.key === "F5") {
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
			setCells(fetchedCells);
		});
	}, [executeRequest, selectedFileId]);

	useEffect(() => {
		const cb = (e: CustomEvent<ToolCallAcceptedPayload>) => {
			if (e.detail.fileId !== selectedFileId) return;

			void retrieveSelectedFileCells();
			void retrieveRepetitionCounts();
		};

		window.addEventListener(TOOL_CALL_ACCEPTED_EVENT, cb);
		return () => window.removeEventListener("toolCallAccepted", cb);
	}, [retrieveRepetitionCounts, retrieveSelectedFileCells, selectedFileId]);

	useEffect(() => {
		const intervalId = setInterval(
			retrieveRepetitionCounts,
			60 * 1000, // One minute.
		);
		return () => clearInterval(intervalId);
	}, [retrieveRepetitionCounts]);

	useEffect(() => {
		void (async () => {
			await retrieveRepetitionCounts();
			await retrieveSelectedFileCells();
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
				searchText={searchText}
				onSearchTextChange={setSearchText}
				onStudyButtonClick={onStudyStart}
				onSearchInputFocus={() => setIsSearchInputFocused(true)}
				onSearchInputBlur={() => setIsSearchInputFocused(false)}
			/>

			<EditableCells
				cells={cells}
				searchText={searchText}
				onError={onError}
				initialSelectedCellId={initialSelectedCellId}
				fileId={selectedFileId}
				onCellsUpdateSave={handleCellsUpdate}
				fileMode="single"
				autoFocusEditor={!isSearchInputFocused}
				className={styles.editor}
			/>
		</div>
	);
}

export default Editor;
