import { mdiExclamationThick } from "@mdi/js";
import styles from "./styles.module.css";
import Icon from "@mdi/react";
import useGlobalKey from "../../hooks/useGlobalKey";

interface Props {
	title: string;
	text: string;
	onCancel: () => void;
	onConfirm: () => void;
}

function ConfirmationDialog({ title, text, onCancel, onConfirm }: Props) {
	useGlobalKey(handleKeyUp);

	function handleKeyUp(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onCancel();
		}
	}

	return (
		<div
			className="overlay"
			onClick={e => {
				e.stopPropagation();
				onCancel();
			}}>
			<div className={`${styles.box}`} onClick={e => e.stopPropagation()}>
				<div className={`${styles.titleBar}`}>
					<Icon path={mdiExclamationThick} size={1.4} />
					<p>{title}</p>
				</div>
				<hr />
				<p>{text}</p>
				<div className={`${styles.buttonsRow}`}>
					<button className="transparent" onClick={onConfirm}>
						Yes
					</button>
					<button className="primary" onClick={onCancel} autoFocus>
						No
					</button>
				</div>
			</div>
		</div>
	);
}

export default ConfirmationDialog;
