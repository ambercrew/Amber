import { useEffect } from "react";
import styles from "./styles.module.css";

interface Props {
	text: string;
	timeoutInMilliSeconds?: number;
	onHide: () => void;
}

export default function Toast({
	text,
	timeoutInMilliSeconds = 3000,
	onHide,
}: Props) {
	useEffect(() => {
		const id = setTimeout(onHide, timeoutInMilliSeconds);
		return () => clearTimeout(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className={styles.container}>
			<p>{text}</p>
		</div>
	);
}
