import { Icon } from "@mdi/react";
import { mdiFileDocumentOutline } from "@mdi/js";
import styles from "./styles.module.css";
import { IncrementalReadingPriority } from "../../../api/cells/valueObjects/incrementalReading";
import DueIncrementalReadingDto from "../../../api/incrementalReading/dto/dueIncrementalReadingDto";
import Tag, { TagType } from "../../../components/Tag/Tag";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectFileById } from "../../../stores/fileSystem/fileSystemSelectors";

const priorityTag: Record<
	IncrementalReadingPriority,
	{ type: TagType; label: string }
> = {
	high: { type: "red", label: "High" },
	normal: { type: "orange", label: "Normal" },
	low: { type: "blue", label: "Low" },
};

interface ReadingQueueRowProps {
	reading: DueIncrementalReadingDto;
	onClick: () => void;
}

export default function ReadingQueueRow({
	reading,
	onClick,
}: ReadingQueueRowProps) {
	const file = useAppSelector(state => selectFileById(state, reading.fileId));
	const priority = priorityTag[reading.priority];

	return (
		<button
			className={`transparent ${styles.readingRow}`}
			onClick={onClick}
			title={reading.title}>
			<div className={styles.readingInfo}>
				<p className={styles.readingTitle}>{reading.title}</p>
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
			<Tag text={priority.label} type={priority.type} />
		</button>
	);
}
