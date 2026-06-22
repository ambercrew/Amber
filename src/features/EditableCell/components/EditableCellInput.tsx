import { useEffect, useRef } from "react";

type Props = React.DetailedHTMLProps<
	React.InputHTMLAttributes<HTMLInputElement>,
	HTMLInputElement
>;

/** A wrapper for the default input element, that focuses the input whenever the
 * autoFocus property changes so that it aligns with everything else in EditableCells
 */
export default function EditableCellInput({ autoFocus, ...props }: Props) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
	}, [autoFocus]);

	return <input ref={inputRef} {...props} />;
}
