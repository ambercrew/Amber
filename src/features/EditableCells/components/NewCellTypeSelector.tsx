import { useRef, useState } from "react";
import styles from "./styles.module.css";
import Icon from "@mdi/react";
import getCellIcon from "../../../utils/getCellIcon";
import {
	allCellTypes,
	CellType,
	cellTypesDisplayNames,
} from "../../../types/backend/entity/cell";
import InputWithIcon from "../../../components/InputWithIcon/InputWithIcon";
import { mdiMagnify } from "@mdi/js";
import useOutsideClick from "../../../hooks/useOutsideClick";
import useGlobalKey from "../../../hooks/useGlobalKey";

interface Props {
	className?: string;
	onClick: (cellType: CellType) => void;
	onHide: () => void;
}

function NewCellTypeSelector({ className, onClick, onHide }: Props) {
	const [searchText, setSearchText] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	useOutsideClick(containerRef as React.RefObject<HTMLElement>, onHide);

	useGlobalKey(e => {
		if (e.key === "Escape") {
			onHide();
		}
	});

	return (
		<div
			className={`${className} ${styles.newCellSelector}`}
			ref={containerRef}
			onClick={e => e.stopPropagation()}>
			<label htmlFor="search-type">Insert New Cell</label>
			<InputWithIcon
				id="search-type"
				placeholder="Search"
				onChange={e => setSearchText(e.target.value)}
				autoFocus
				iconName={mdiMagnify}
				value={searchText}
			/>

			{allCellTypes
				.filter(key =>
					cellTypesDisplayNames[key]
						.toLowerCase()
						.includes(searchText.toLowerCase()),
				)
				.map(cellType => (
					<button
						key={cellType}
						className="transparent"
						onClick={() => onClick(cellType)}>
						<Icon path={getCellIcon(cellType)} size={1} />
						<span>{cellTypesDisplayNames[cellType]}</span>
					</button>
				))}
		</div>
	);
}

export default NewCellTypeSelector;
