import styles from "./styles.module.css";
import Row from "./Row";
import { ReviewTreeFolderDto } from "../../../api/fileSystem/dto/reviewTreeFolderDto";
import useLocalStorage from "../../../hooks/useLocalStorage";
import { ReviewTreeFileDto } from "../../../api/fileSystem/dto/reviewTreeFileDto";

interface Props {
	folder?: ReviewTreeFolderDto;
	file?: ReviewTreeFileDto;
	name?: string;
	onFileClick: (file: ReviewTreeFileDto) => void;
	onFolderClick: (folder: ReviewTreeFolderDto) => void;
}

function ReviewTree({ name, folder, file, onFileClick, onFolderClick }: Props) {
	const [isExpanded, setIsExpanded] = useLocalStorage(
		`is-review-tree-expanded-${file?.id ?? folder?.id}`,
		!name,
	);
	const newCount = file
		? file.repetitionCounts.new
		: folder!.repetitionCounts.new;
	const learningCount = file
		? file.repetitionCounts.learning + file.repetitionCounts.relearning
		: folder!.repetitionCounts.learning +
			folder!.repetitionCounts.relearning;
	const reviewCount = file
		? file.repetitionCounts.review
		: folder!.repetitionCounts?.review;

	return (
		<div className={name && styles.tree}>
			{name && (
				<Row
					expandable={folder !== undefined}
					isExapnded={isExpanded}
					isFolder={folder !== undefined}
					name={name}
					newCount={newCount}
					learningCount={learningCount}
					reviewCount={reviewCount}
					onExpandClick={() => setIsExpanded(!isExpanded)}
					onClick={() =>
						file ? onFileClick(file) : onFolderClick(folder!)
					}
				/>
			)}

			<div className={styles.treeChildren}>
				{isExpanded &&
					folder?.subfolders.map(f => (
						<ReviewTree
							key={f.id}
							name={f.name}
							folder={f}
							onFileClick={onFileClick}
							onFolderClick={onFolderClick}
						/>
					))}

				{isExpanded &&
					folder?.files.map(f => (
						<ReviewTree
							key={f.id}
							name={f.name}
							file={f}
							onFileClick={onFileClick}
							onFolderClick={onFolderClick}
						/>
					))}
			</div>
		</div>
	);
}

export default ReviewTree;
