interface Props extends React.DetailedHTMLProps<
	React.InputHTMLAttributes<HTMLInputElement>,
	HTMLInputElement
> {
	onCancel: () => void;
}

function CancellableInput({ onCancel, ...props }: Props) {
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
