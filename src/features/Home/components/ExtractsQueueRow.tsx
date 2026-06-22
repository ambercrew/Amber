import { Icon } from "@mdi/react";
import { mdiFileDocumentOutline } from "@mdi/js";
import styles from "./styles.module.css";
import CellWithPendingExtractsDto from "../../../api/incrementalReading/dto/cellWithPendingExtractsDto";
import Tag from "../../../components/Tag/Tag";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectFileById } from "../../../stores/fileSystem/fileSystemSelectors";

interface ExtractsQueueRowProps {
	cell: CellWithPendingExtractsDto;
	onClick: () => void;
}

export default function ExtractsQueueRow({
	cell,
	onClick,
}: ExtractsQueueRowProps) {
	const file = useAppSelector(state => selectFileById(state, cell.fileId));

	return (
		<button
			className={`transparent ${styles.readingRow}`}
			onClick={onClick}
			title={cell.title}>
			<div className={styles.readingInfo}>
				<p className={styles.readingTitle}>{cell.title}</p>
				{file && (
					<p className={styles.readingFile}>
						<Icon
							className={styles.icon}
							path={mdiFileDocumentOutline}
							size={1}
						/>
						<span>{file.name}</span>
					</p>
				)}
			</div>
			<Tag text={`${cell.pendingCount} pending`} type="blue" />
		</button>
	);
}
