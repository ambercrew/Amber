import Icon from "@mdi/react";
import styles from "./styles.module.css";

/** Used to create forms, comes with other components that helps,
 * in styling.
 */
export default function Form({
	...props
}: React.DetailedHTMLProps<
	React.InputHTMLAttributes<HTMLFormElement>,
	HTMLFormElement
>) {
	return <form {...props} className={styles.form} />;
}

interface IFormHeaderProps {
	icon: string;
	title: string;
}

export function FormHeader({ icon, title }: IFormHeaderProps) {
	return (
		<div className={`row ${styles.header}`}>
			<Icon path={icon} size={1.2} />
			<p>{title}</p>
		</div>
	);
}

interface IFormRowsProps {
	rows: {
		label: string;
		labelHtmlFor: string;
		children: React.ReactNode;
	}[];
}

export function FormRows({ rows }: IFormRowsProps) {
	return (
		<div className={styles.rows}>
			{rows.map((row, i) => (
				<div key={i} className={styles.row}>
					<label htmlFor={row.labelHtmlFor}>{row.label}</label>
					{row.children}
				</div>
			))}
		</div>
	);
}

interface IFormButtonsProps {
	onClose: () => void;
	submitText: string;
}

export function FormButtons({ onClose, submitText }: IFormButtonsProps) {
	return (
		<div className={styles.buttons}>
			<button className="transparent" type="button" onClick={onClose}>
				Cancel
			</button>
			<button className="primary" type="submit">
				{submitText}
			</button>
		</div>
	);
}
