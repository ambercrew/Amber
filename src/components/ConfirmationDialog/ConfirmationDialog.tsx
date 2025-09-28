import { mdiExclamationThick } from "@mdi/js";
import styles from "./styles.module.css";
import Icon from "@mdi/react";
import Dialog from "../Dialog/Dialog";

interface Props {
	title: string;
	text: string;
	icon?: string;
	onCancel: () => void;
	onConfirm: () => void;
}

function ConfirmationDialog({
	title,
	text,
	icon = mdiExclamationThick,
	onCancel,
	onConfirm,
}: Props) {
	return (
		<Dialog onHide={onCancel} className={styles.box}>
			<div className={`${styles.titleBar}`}>
				<Icon path={icon} size={1.4} />
				<p>{title}</p>
			</div>
			<p>{text}</p>
			<div className={`${styles.buttonsRow}`}>
				<button className="transparent" onClick={onConfirm}>
					Yes
				</button>
				<button className="primary" onClick={onCancel} autoFocus>
					No
				</button>
			</div>
		</Dialog>
	);
}

export default ConfirmationDialog;
