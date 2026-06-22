import { Icon } from "@mdi/react";
import styles from "./styles.module.css";

interface Action {
	icon: string;
	label: string;
	onClick: () => void;
	title?: string;
}

interface Props {
	icon: string;
	title: string;
	action?: Action;
}

export default function BoxHeader({ icon, title, action }: Props) {
	return (
		<div className={styles.header}>
			<p className={styles.headerTitle}>
				<Icon className={styles.icon} path={icon} size={1} />
				<span>{title}</span>
			</p>

			{action && (
				<button
					className={`transparent ${styles.headerButton}`}
					onClick={action.onClick}
					title={action.title}>
					<Icon path={action.icon} className={styles.icon} size={1} />
					<span>{action.label}</span>
				</button>
			)}
		</div>
	);
}
