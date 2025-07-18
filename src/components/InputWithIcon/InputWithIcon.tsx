import { ForwardedRef, forwardRef } from "react";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

interface IProps {
	iconName: string;
	value: string;
	placeholder: string;
	inputClassName?: string;
	id?: string;
	autoFocus?: boolean;
	containerClassName?: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function InputWithIcon(
	{
		iconName,
		value,
		placeholder,
		inputClassName,
		containerClassName,
		id,
		autoFocus,
		onChange,
	}: IProps,
	ref: ForwardedRef<HTMLInputElement>,
) {
	return (
		<div className={`${styles.container} ${containerClassName}`}>
			<Icon path={iconName} size={1} className={styles.icon} />
			<input
				type="text"
				placeholder={placeholder}
				onChange={onChange}
				value={value}
				className={inputClassName}
				id={id}
				autoFocus={autoFocus}
				ref={ref}
			/>
		</div>
	);
}

export default forwardRef(InputWithIcon);
