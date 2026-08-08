import { Container, Stack, Text } from "@mantine/core";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react";

export default function ElementsBrowser() {
	return (
		<Container size="sm" py="lg">
			<Stack align="center" gap={4}>
				<ListMagnifyingGlassIcon size={28} />
				<Text>Elements browser</Text>
			</Stack>
		</Container>
	);
}
