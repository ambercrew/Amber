import styles from "./styles.module.css";
import { Icon } from "@mdi/react";

export type TagType = "red" | "orange" | "green" | "blue" | "primary";

interface Props {
	text: string;
	icon?: string;
	type?: TagType;
	title?: string;
}

export default function Tag({ text, icon, title, type = "primary" }: Props) {
	return (
		<span className={styles.tag} data-type={type} title={title}>
			{icon && <Icon path={icon} size={1} />}
			{text}
		</span>
	);
}
