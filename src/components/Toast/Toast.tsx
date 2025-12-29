import { useEffect } from "react";
import styles from "./styles.module.css";

interface Props {
	timeoutInMilliSeconds?: number;
	className?: string;
	children: React.ReactNode;
	onHide: () => void;
}

export default function Toast({
	children,
	className,
	timeoutInMilliSeconds = 3000,
	onHide,
}: Props) {
	useEffect(() => {
		const id = setTimeout(onHide, timeoutInMilliSeconds);
		return () => clearTimeout(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <div className={`${styles.container} ${className}`}>{children}</div>;
}
