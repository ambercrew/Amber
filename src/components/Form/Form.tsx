import Icon from "@mdi/react";
import styles from "./styles.module.css";

/** Used to create forms, comes with other components that helps,
 * in styling.
 */
export default function Form({
	className,
	...props
}: React.DetailedHTMLProps<
	React.InputHTMLAttributes<HTMLFormElement>,
	HTMLFormElement
>) {
	return <form {...props} className={`${styles.form} ${className}`} />;
}

interface FormHeaderProps {
	icon?: string | null;
	title: string;
}

export const FORM_HEADER_ICON_SIZE = 1.6;

export function FormHeader({ icon, title }: FormHeaderProps) {
	return (
		<div className={`row ${styles.header}`}>
			{icon && <Icon path={icon} size={FORM_HEADER_ICON_SIZE} />}
			<p>{title}</p>
		</div>
	);
}

export interface FormRowsProps {
	rows: {
		label?: string;
		labelHtmlFor?: string;
		children: React.ReactNode;
	}[];
}

export function FormRows({ rows }: FormRowsProps) {
	return (
		<div className={styles.rows}>
			{rows.map((row, i) => (
				<div key={i} className={styles.row}>
					{row.label && (
						<label htmlFor={row.labelHtmlFor}>{row.label}</label>
					)}
					{row.children}
				</div>
			))}
		</div>
	);
}

interface FormButtonsProps {
	onClose: () => void;
	submitText: string;
	submitButtonType?: "primary" | "red";
}

export function FormButtons({
	onClose,
	submitText,
	submitButtonType,
}: FormButtonsProps) {
	return (
		<div className={styles.buttons}>
			<button className="transparent" type="button" onClick={onClose}>
				Cancel
			</button>
			<button className={submitButtonType ?? "primary"} type="submit">
				{submitText}
			</button>
		</div>
	);
}
