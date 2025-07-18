import { mdiCloseThick } from "@mdi/js";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

interface Props {
	message: string;
	className?: string;
	onClose?: () => void;
}

function ErrorBox({ message, onClose, className }: Props) {
	return (
		<div className={`${styles.errorBox} ${className}`}>
			<p>{message}</p>
			{onClose && (
				<button type="button" onClick={onClose}>
					<Icon path={mdiCloseThick} size={1} />
				</button>
			)}
		</div>
	);
}

export default ErrorBox;
