import { List, Text } from "@mantine/core";
import AppModal from "../../../components/AppModal/AppModal";

interface AiCapabilitiesModalProps {
	opened: boolean;
	onClose: () => void;
}

function AiCapabilitiesModal({ opened, onClose }: AiCapabilitiesModalProps) {
	return (
		<AppModal opened={opened} onClose={onClose} title="What the AI can do">
			<Text mb="xs">The assistant currently has access to:</Text>
			<List spacing="xs">
				<List.Item>
					The name and origin of the element you have open
				</List.Item>
				<List.Item>
					The content of the currently opened element
				</List.Item>
				<List.Item>Snippets you provide as context</List.Item>
				<List.Item>Documents you upload to the chat</List.Item>
				<List.Item>Creating cards on your behalf</List.Item>
			</List>
		</AppModal>
	);
}

export default AiCapabilitiesModal;
