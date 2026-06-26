import { Skeleton, Stack } from "@mantine/core";

function PriorityQueuePanel() {
	return (
		<Stack p="md" gap="xs">
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} height={8} radius="xl" />
			))}
		</Stack>
	);
}

export default PriorityQueuePanel;
