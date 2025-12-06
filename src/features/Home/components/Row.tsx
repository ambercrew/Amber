import { mdiMinus, mdiPlus } from "@mdi/js";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

interface Props {
	expandable: boolean;
	isExapnded: boolean;
	indentationLevel: number;
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
	indentationLevel,
	name,
	newCount,
	learningCount,
	reviewCount,
	onExpandClick,
	onClick,
}: Props) {
	return (
		<div className={styles.row + " " + styles.treeRow}>
			<div
				className={styles.buttons}
				style={{ paddingLeft: `${indentationLevel * 12}px` }}>
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
					onClick={() => void onClick()}>
					{name}
				</button>
			</div>
			<div className={styles.columns}>
				<p className={newCount === 0 ? "dimmed" : "new-color"}>
					{newCount}
				</p>
				<p
					className={
						learningCount === 0 ? "dimmed" : "learning-color"
					}>
					{learningCount}
				</p>
				<p className={reviewCount === 0 ? "dimmed" : "review-color"}>
					{reviewCount}
				</p>
			</div>
		</div>
	);
}

export default Row;
