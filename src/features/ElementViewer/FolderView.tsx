import { Button, Container, Group, Stack, Text } from "@mantine/core";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import useAppDispatch from "../../hooks/useAppDispatch";
import { openImportModal } from "../../stores/app/appReducer";

export default function FolderView() {
	const dispatch = useAppDispatch();

	return (
		<Container size="sm" py="lg">
			<Group justify="center">
				<Button
					variant="default"
					size="xl"
					h="auto"
					py="md"
					onClick={() => dispatch(openImportModal())}>
					<Stack align="center" gap={4}>
						<UploadSimpleIcon size={28} />
						<Text>Import</Text>
					</Stack>
				</Button>
			</Group>
		</Container>
	);
}
