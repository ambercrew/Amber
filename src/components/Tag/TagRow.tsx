import styles from "./styles.module.css";

interface Props {
	children: React.ReactNode;
}

export default function TagRow({ children }: Props) {
	return <div className={styles.tagRow}>{children}</div>;
}
