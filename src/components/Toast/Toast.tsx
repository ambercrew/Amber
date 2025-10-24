import { useEffect } from "react";
import styles from "./styles.module.css";

interface IProps {
	text: string;
	timeoutInMilliSeconds?: number;
	onHide: () => void;
}

export default function Toast({
	text,
	timeoutInMilliSeconds = 3000,
	onHide,
}: IProps) {
	useEffect(() => {
		setTimeout(onHide, timeoutInMilliSeconds);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className={styles.container}>
			<p>{text}</p>
		</div>
	);
}
