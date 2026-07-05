import { useRef, useState } from "react";
import {
	Anchor,
	Button,
	Group,
	Modal,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { Dropzone, PDF_MIME_TYPE } from "@mantine/dropzone";
import { ArrowsInSimpleIcon } from "@phosphor-icons/react";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useApi from "../../../hooks/useApi";
import { selectIsImportModalOpened } from "../../../stores/app/appSelectors";
import { closeImportModal } from "../../../stores/app/appReducer";

const CLICKABLE_STYLE = { pointerEvents: "all" as const };

function ImportModal() {
	const opened = useAppSelector(selectIsImportModalOpened);
	const dispatch = useAppDispatch();

	const [value, setValue] = useState("");
	const { errorMessage, callApi, clearErrorMessage } = useApi();
	const openRef = useRef<() => void>(null);

	function reset() {
		setValue("");
		clearErrorMessage();
	}

	function handleClose() {
		reset();
		dispatch(closeImportModal());
	}

	async function handleReject() {
		await callApi(() => {
			throw new Error("Only PDF files are supported.");
		});
	}

	return (
		<Modal
			opened={opened}
			onClose={handleClose}
			title="Import"
			centered
			size="md">
			<Dropzone
				accept={PDF_MIME_TYPE}
				activateOnClick={false}
				openRef={openRef}
				onDrop={() => clearErrorMessage()}
				onReject={() => void handleReject()}
				p={0}
				style={{ border: "none" }}>
				<Stack gap="xs">
					<TextInput
						placeholder="Paste a link or content"
						autoFocus
						value={value}
						error={errorMessage}
						style={CLICKABLE_STYLE}
						onChange={e => {
							setValue(e.currentTarget.value);
							clearErrorMessage();
						}}
					/>
					<Text size="sm" c="dimmed">
						or drop a PDF anywhere here —{" "}
						<Anchor
							size="sm"
							component="button"
							type="button"
							style={CLICKABLE_STYLE}
							onClick={() => openRef.current?.()}>
							browse
						</Anchor>
					</Text>
					<Group justify="flex-end">
						<Button
							disabled={!value.trim()}
							onClick={handleClose}
							style={CLICKABLE_STYLE}>
							Import
						</Button>
					</Group>
				</Stack>

				<Dropzone.Accept>
					<Stack
						align="center"
						justify="center"
						gap="xs"
						pos="absolute"
						top={0}
						left={0}
						right={0}
						bottom={0}
						style={{
							border: "2px dashed var(--mantine-color-blue-5)",
							borderRadius: "var(--mantine-radius-md)",
							backgroundColor: "var(--mantine-color-blue-0)",
						}}>
						<ArrowsInSimpleIcon
							size={28}
							color="var(--mantine-color-blue-6)"
						/>
						<Text fw={600} c="blue">
							Drop to import
						</Text>
					</Stack>
				</Dropzone.Accept>
			</Dropzone>
		</Modal>
	);
}

export default ImportModal;
