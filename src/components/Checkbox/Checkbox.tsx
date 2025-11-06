import styles from "./styles.module.css";

export default function CheckBox({
	...props
}: React.DetailedHTMLProps<
	React.InputHTMLAttributes<HTMLInputElement>,
	HTMLInputElement
>) {
	return (
		<div className={styles.container}>
			<input type="checkbox" {...props} />
			<div className={styles.circle}></div>
		</div>
	);
}
