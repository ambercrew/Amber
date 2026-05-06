import { mdiMagnify } from "@mdi/js";
import InputWithIcon from "../../../components/InputWithIcon/InputWithIcon";
import styles from "./styles.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { isModKey } from "../../../utils/keyboardUtils";
import EditableCells from "../../EditableCells/components/EditableCells";
import { searchCells } from "../../../api/cells/api/searchApi";
import { useSearchParams } from "react-router";
import Cell from "../../../api/cells/entities/cell";
import { CallApiFn } from "../../../hooks/useApi";

interface Props {
	callApi: CallApiFn;
	onEditButtonClick: (fileId: string, cellId: string) => void;
}

const searchTextQueryParameter = "searchText";

function Searcher({ callApi, onEditButtonClick }: Props) {
	const [searchResult, setSearchResult] = useState<Cell[] | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const searchInputRef = useRef<HTMLInputElement>(null);
	const searchParamsSearchText =
		searchParams.get(searchTextQueryParameter) ?? "";
	const [previousSearchParamsSearchText, setPreviousSearchParamsSearchText] =
		useState<string | null>(null);
	const [searchText, setSearchText] = useState(searchParamsSearchText);

	const retrieveSearchResult = useCallback(async () => {
		await callApi(async () => {
			const result = await searchCells(searchParamsSearchText);
			setSearchResult(result);
		});
	}, [callApi, searchParamsSearchText]);

	if (previousSearchParamsSearchText !== searchParamsSearchText) {
		setPreviousSearchParamsSearchText(searchParamsSearchText);
		setSearchText(searchParamsSearchText);
	}

	useEffect(() => {
		void retrieveSearchResult();
	}, [searchParamsSearchText, retrieveSearchResult]);

	useGlobalKey(e => {
		if (isModKey(e) && !e.shiftKey && e.key.toLowerCase() === "f") {
			e.preventDefault();
			searchInputRef.current?.focus();
		}
	}, "keydown");

	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		searchParams.set(searchTextQueryParameter, searchText);
		setSearchParams(searchParams);
		// Retrieving the results happens during re-render useEffect.
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
					autoFocus
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
					callApi={callApi}
					autoFocusEditor={false}
					onCellsUpdateSave={retrieveSearchResult}
					fileMode="global search"
					onEditButtonClick={onEditButtonClick}
					className={styles.editableCells}
				/>
			)}
		</div>
	);
}

export default Searcher;
