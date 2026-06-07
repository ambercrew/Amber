import { mdiMinus, mdiPlus } from "@mdi/js";
import styles from "./styles.module.css";
import { Icon } from "@mdi/react";
import getFileTreeIconPath from "../../FileTree/utils/getFileTreeIconPath";

interface Props {
	expandable: boolean;
	isExpanded: boolean;
	isFolder: boolean;
	name: string;
	newCount: number;
	learningCount: number;
	reviewCount: number;
	onExpandClick: () => void;
	onClick: () => void;
}

function Row({
	expandable,
	isExpanded,
	isFolder,
	name,
	newCount,
	learningCount,
	reviewCount,
	onExpandClick,
	onClick,
}: Props) {
	const iconPath = getFileTreeIconPath({
		isRoot: false,
		isFolder,
		isExpanded,
	});
	return (
		<div className={styles.row + " " + styles.treeRow}>
			<div className={styles.buttons}>
				{!expandable && ( // Empty span to have consistent style
					<span></span>
				)}

				{expandable && (
					<button
						onClick={onExpandClick}
						className={styles.expandButton}>
						<Icon path={isExpanded ? mdiMinus : mdiPlus} size={1} />
					</button>
				)}
				<button
					className={styles.fileNameButton}
					onClick={() => void onClick()}
					title={name}>
					<Icon path={iconPath} size={1} />
					{name}
				</button>
			</div>
			<div className={styles.columns}>
				<p className="new-color" title="New count">
					{newCount}
				</p>
				<p className="learning-color" title="Learn count">
					{learningCount}
				</p>
				<p className="review-color" title="Review count">
					{reviewCount}
				</p>
			</div>
		</div>
	);
}

export default Row;
