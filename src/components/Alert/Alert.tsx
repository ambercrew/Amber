import { mdiCloseThick } from "@mdi/js";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

interface Props {
	message: string;
	type: "error" | "primary";
	className?: string;
	onClose?: () => void;
}

function Alert({ message, className, type, onClose }: Props) {
	return (
		<div
			className={`${styles.alert} ${type === "error" ? styles.error : styles.primary} ${className}`}>
			<p>{message}</p>
			{onClose && (
				<button type="button" onClick={onClose}>
					<Icon path={mdiCloseThick} size={1} />
				</button>
			)}
		</div>
	);
}

export default Alert;
