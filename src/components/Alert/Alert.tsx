import { mdiCloseThick } from "@mdi/js";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

interface Props {
	type: "error" | "primary";
	className?: string;
	children: React.ReactNode;
	onClose?: () => void;
}

function Alert({ className, type, children, onClose }: Props) {
	return (
		<div
			className={`${styles.alert} ${type === "error" ? styles.error : styles.primary} ${className}`}>
			{children}
			{onClose && (
				<button type="button" onClick={onClose}>
					<Icon path={mdiCloseThick} size={1} />
				</button>
			)}
		</div>
	);
}

export default Alert;
