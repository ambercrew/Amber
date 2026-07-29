import { useForm } from "@mantine/form";
import { useEffect, useRef } from "react";
import AutosizeTextInput from "../../../../components/AutosizeTextInput/AutosizeTextInput";
import { useDispatch } from "react-redux";
import { renameElementAction } from "../../../../stores/elements/elementsActions";
import { AppDispatch } from "../../../../stores/store";
import { ElementId } from "../../../../types/elements/elementId";

interface RenameElementFormProps {
	elementId: ElementId;
	initialName: string;
	onClose: () => void;
}

function RenameElementForm({
	elementId,
	initialName,
	onClose,
}: RenameElementFormProps) {
	const dispatch = useDispatch<AppDispatch>();
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const form = useForm({
		initialValues: { name: initialName },
		validate: { name: value => (value.length > 0 ? null : "Required") },
	});

	useEffect(() => {
		// The menus move focus away from the input with auto-focus property.
		const id = setTimeout(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		}, 0);
		return () => clearTimeout(id);
	}, []);

	function handleSubmit(values: { name: string }) {
		void dispatch(renameElementAction(elementId, values.name));
		onClose();
	}

	return (
		<form style={{ flex: 1 }} onSubmit={form.onSubmit(handleSubmit)}>
			<AutosizeTextInput
				ref={inputRef}
				w="100%"
				size="sm"
				aria-label="Rename element"
				{...form.getInputProps("name")}
				onBlur={onClose}
				onClick={e => e.stopPropagation()}
				onKeyDown={e => {
					e.stopPropagation();
					if (e.key === "Escape") onClose();
					// The field is a textarea, so Enter does not submit implicitly.
					if (e.key === "Enter")
						e.currentTarget.form?.requestSubmit();
				}}
			/>
		</form>
	);
}

export default RenameElementForm;
