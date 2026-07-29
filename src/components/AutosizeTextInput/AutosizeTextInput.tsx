import { type KeyboardEvent, type Ref } from "react";
import { Textarea, TextareaProps } from "@mantine/core";

interface AutosizeTextInputProps extends TextareaProps {
	ref?: Ref<HTMLTextAreaElement>;
}

/**
 * A single-line text field that grows vertically so long values wrap and stay
 * fully visible instead of scrolling horizontally. Enter is suppressed to keep
 * the value single-line, but is still forwarded to `onKeyDown`.
 */
function AutosizeTextInput({ onKeyDown, ...props }: AutosizeTextInputProps) {
	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter") e.preventDefault();
		onKeyDown?.(e);
	}

	return (
		<Textarea autosize minRows={1} onKeyDown={handleKeyDown} {...props} />
	);
}

export default AutosizeTextInput;
