interface IProps
	extends React.DetailedHTMLProps<
		React.InputHTMLAttributes<HTMLInputElement>,
		HTMLInputElement
	> {
	onCancel: () => void;
}

function CancellableInput({ onCancel, ...props }: IProps) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onCancel();
		}
	};

	return (
		<input
			type="text"
			onKeyDown={handleKeyDown}
			onBlur={onCancel}
			{...props}
		/>
	);
}

export default CancellableInput;
