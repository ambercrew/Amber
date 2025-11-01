import { mdiMagnify } from "@mdi/js";
import InputWithIcon from "../../../components/InputWithIcon/InputWithIcon";
import styles from "./styles.module.css";
import { useCallback, useRef, useState } from "react";
import useGlobalKey from "../../../hooks/useGlobalKey";
import errorToString from "../../../utils/errorToString";
import EditableCells from "../../EditableCells/components/EditableCells";
import { searchCells } from "../../../api/searchApi";
import { useSearchParams } from "react-router";
import Cell from "../../../types/backend/entity/cell";

interface Props {
	onError: (error: string) => void;
	onEditButtonClick: (fileId: string, cellId: string) => void;
}

const searchTextQueryParameter = "searchText";

function Searcher({ onError, onEditButtonClick }: Props) {
	const [searchResult, setSearchResult] = useState<Cell[] | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const searchInputRef = useRef<HTMLInputElement>(null);
	const searchParamsSearchText =
		searchParams.get(searchTextQueryParameter) ?? "";
	const [previousSearchParamsSearchText, setPreviousSearchParamsSearchText] =
		useState<string | null>(null);
	const [searchText, setSearchText] = useState(searchParamsSearchText);

	const retrieveSearchResult = useCallback(async () => {
		try {
			const result = await searchCells(searchParamsSearchText);
			setSearchResult(result);
		} catch (e) {
			console.error(e);
			onError(errorToString(e));
		}
	}, [onError, searchParamsSearchText]);

	if (previousSearchParamsSearchText !== searchParamsSearchText) {
		setPreviousSearchParamsSearchText(searchParamsSearchText);
		setSearchText(searchParamsSearchText);
		void retrieveSearchResult();
	}

	useGlobalKey(e => {
		if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "f") {
			e.preventDefault();
			searchInputRef.current?.focus();
		}
	}, "keydown");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		searchParams.set(searchTextQueryParameter, searchText);
		setSearchParams(searchParams);
	};

	return (
		<div className={styles.container}>
			<form
				className={styles.searchInputContainer}
				onSubmit={e => handleSubmit(e)}>
				<InputWithIcon
					iconName={mdiMagnify}
					placeholder="Search (Ctrl + F)"
					value={searchText}
					onChange={e => setSearchText(e.target.value)}
					ref={searchInputRef}
				/>
			</form>

			{!searchResult && (
				<p className={styles.noSearchLabel}>
					Type something and press Enter.
				</p>
			)}

			{searchResult?.length === 0 && (
				<p className={styles.noSearchLabel}>No result found!</p>
			)}

			{searchResult && searchResult.length > 0 && (
				<EditableCells
					cells={searchResult}
					onError={onError}
					autoFocusEditor={true}
					onCellsUpdateSave={retrieveSearchResult}
					editCellId={null}
					fileMode="global search"
					onEditButtonClick={onEditButtonClick}
					className={styles.editableCells}
				/>
			)}
		</div>
	);
}

export default Searcher;
