import { mdiMinus, mdiPlus } from "@mdi/js";
import styles from "./styles.module.css";
import { Icon } from "@mdi/react";
import getFileTreeIconPath from "../../FileTree/utils/getFileTreeIconPath";
import getFileIconClass from "../../../utils/getFileIconClass";

interface Props {
	expandable: boolean;
	isExapnded: boolean;
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
	isExapnded,
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
		isExpanded: isExapnded,
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
						<Icon path={isExapnded ? mdiMinus : mdiPlus} size={1} />
					</button>
				)}
				<button
					className={styles.fileNameButton}
					onClick={() => void onClick()}
					title={name}>
					<Icon
						path={iconPath}
						size={1}
						className={getFileIconClass(false, isFolder)}
					/>
					{name}
				</button>
			</div>
			<div className={styles.columns}>
				<p className={`${styles.new}`} title="New count">
					{newCount}
				</p>
				<p className={`${styles.learning}`} title="Learn count">
					{learningCount}
				</p>
				<p className={`${styles.review}`} title="Review count">
					{reviewCount}
				</p>
			</div>
		</div>
	);
}

export default Row;
