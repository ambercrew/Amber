import { mdiCloseThick } from "@mdi/js";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

interface Props extends React.DetailedHTMLProps<
	React.InputHTMLAttributes<HTMLInputElement>,
	HTMLInputElement
> {
	type: "error" | "primary" | "secondary";
	children: React.ReactNode;
	onClose?: () => void;
}

function Alert({ className, type, children, onClose, ...props }: Props) {
	return (
		<div
			className={`${styles.alert}
                ${type === "error" && styles.error}
                ${type === "primary" && styles.primary}
                ${type === "secondary" && styles.secondary}
                ${className}`}
			{...props}>
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
