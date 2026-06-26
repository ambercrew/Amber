import { Alert, Stack } from "@mantine/core";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { clearTreeError } from "../../../stores/elements/elementsReducer";
import { selectElementTreeError } from "../../../stores/elements/elementsSelectors";

function FileTreePanel() {
	const dispatch = useAppDispatch();
	const error = useAppSelector(selectElementTreeError);

	return (
		<Stack p="md" gap="xs">
			{error && (
				<Alert
					color="red"
					title={error}
					withCloseButton
					onClose={() => dispatch(clearTreeError())}
				/>
			)}
		</Stack>
	);
}

export default FileTreePanel;
