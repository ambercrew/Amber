import { useRef, useState } from "react";
import styles from "./styles.module.css";
import { Icon } from "@mdi/react";
import getCellIcon from "../../../utils/getCellIcon";
import {
	allCellTypes,
	CellType,
	cellTypesDisplayNames,
} from "../../../types/backend/entity/cell";
import InputWithIcon from "../../../components/InputWithIcon/InputWithIcon";
import { mdiMagnify } from "@mdi/js";
import useOutsideClick from "../../../hooks/useOutsideClick";

interface Props {
	className?: string;
	onClick: (cellType: CellType) => void;
	onHide: () => void;
}

function NewCellTypeSelector({ className, onClick, onHide }: Props) {
	const [searchText, setSearchText] = useState("");
	const [focusedCellType, setFocusedCellType] = useState<CellType>(
		allCellTypes[0],
	);
	const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	useOutsideClick(containerRef as React.RefObject<HTMLElement>, onHide);

	const filteredCellTypes = allCellTypes.filter(key =>
		cellTypesDisplayNames[key]
			.toLowerCase()
			.includes(searchText.toLowerCase()),
	);

	const getCurrentFocusedCellTypeIndex = () =>
		filteredCellTypes.findIndex(el => el === focusedCellType);

	if (
		getCurrentFocusedCellTypeIndex() === -1 &&
		filteredCellTypes.length > 0
	) {
		setFocusedCellType(filteredCellTypes[0]);
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onHide();
		} else if (e.key === "ArrowUp" || (e.shiftKey && e.key === "Tab")) {
			e.preventDefault();
			if (filteredCellTypes.length > 0) {
				const currentIndex = getCurrentFocusedCellTypeIndex();
				const newIndex =
					(currentIndex - 1 + filteredCellTypes.length) %
					filteredCellTypes.length;
				setFocusedCellType(filteredCellTypes[newIndex]);
			}
		} else if (e.key === "ArrowDown" || e.key === "Tab") {
			e.preventDefault();
			if (filteredCellTypes.length > 0) {
				const currentIndex = getCurrentFocusedCellTypeIndex();
				const newIndex = (currentIndex + 1) % filteredCellTypes.length;
				setFocusedCellType(filteredCellTypes[newIndex]);
			}
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (filteredCellTypes.length > 0) {
				onClick(focusedCellType);
			}
		}
	};

	return (
		<div
			className={`${className} ${styles.newCellSelector}`}
			ref={containerRef}
			onClick={e => e.stopPropagation()}
			onKeyDown={handleKeyDown}>
			<label htmlFor="search-type">Insert New Cell</label>
			<InputWithIcon
				id="search-type"
				placeholder="Search"
				onChange={e => setSearchText(e.target.value)}
				autoFocus
				iconName={mdiMagnify}
				value={searchText}
				onBlur={e => e.target.focus()}
			/>

			{filteredCellTypes.map((cellType, i) => (
				<button
					key={cellType}
					className={`transparent ${cellType === focusedCellType && "focus"}`}
					ref={el => {
						buttonRefs.current[i] = el;
					}}
					onFocus={() => setFocusedCellType(cellType)}
					onMouseDown={() => setFocusedCellType(cellType)}
					onClick={() => onClick(cellType)}>
					<Icon path={getCellIcon(cellType)} size={1} />
					<span>{cellTypesDisplayNames[cellType]}</span>
				</button>
			))}
		</div>
	);
}

export default NewCellTypeSelector;
