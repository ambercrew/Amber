import { ForwardedRef, forwardRef } from "react";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

interface IProps
	extends React.DetailedHTMLProps<
		React.InputHTMLAttributes<HTMLInputElement>,
		HTMLInputElement
	> {
	iconName: string;
	containerClassName?: string;
}

function InputWithIcon(
	{ iconName, containerClassName, ...props }: IProps,
	ref: ForwardedRef<HTMLInputElement>,
) {
	return (
		<div className={`${styles.container} ${containerClassName}`}>
			<Icon path={iconName} size={1} className={styles.icon} />
			<input type="text" ref={ref} {...props} />
		</div>
	);
}

export default forwardRef(InputWithIcon);
