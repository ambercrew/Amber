import { useEffect, useRef } from "react";
import styles from "./styles.module.css";

export interface RadioOption {
	label: string;
	description?: string;
	value: string;

	buttonProps?: React.DetailedHTMLProps<
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	>;
}

interface Props {
	options: RadioOption[];
	value: string;
	onChange: (value: string) => void;
	autoFocus?: boolean;
	className?: string;
}

export default function RadioSelect({
	options,
	value,
	onChange,
	autoFocus,
	className,
}: Props) {
	const selectedRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!autoFocus) return;
		// Doing it this way so that it works with focus traps.
		const id = setTimeout(() => selectedRef.current?.focus(), 0);
		return () => clearTimeout(id);
	}, [autoFocus]);

	return (
		<div className={`${styles.list} ${className ?? ""}`}>
			{options.map(option => {
				const isSelected = option.value === value;
				return (
					<button
						{...option.buttonProps}
						ref={isSelected ? selectedRef : undefined}
						key={option.value}
						type="button"
						className={`${styles.option} ${isSelected ? styles.selected : ""}`}
						onClick={() => onChange(option.value)}>
						<div className={styles.content}>
							<span className={styles.label}>{option.label}</span>
							{option.description && (
								<span className={styles.description}>
									{option.description}
								</span>
							)}
						</div>
						<div className={styles.radio}>
							{isSelected && <div className={styles.radioDot} />}
						</div>
					</button>
				);
			})}
		</div>
	);
}
