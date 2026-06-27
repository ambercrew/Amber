import { TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useRef } from "react";
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
	const inputRef = useRef<HTMLInputElement>(null);
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
			<TextInput
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
				}}
			/>
		</form>
	);
}

export default RenameElementForm;
