import { Badge, Group, Text } from "@mantine/core";

interface StudyProfileOptionProps {
	label: string;
	isDefault: boolean;
}

function StudyProfileOption({ label, isDefault }: StudyProfileOptionProps) {
	return (
		<Group gap="xs" flex={1} justify="space-between" wrap="nowrap">
			<Text truncate="end" size="sm">
				{label}
			</Text>
			{isDefault && (
				<Badge size="xs" variant="light">
					Default
				</Badge>
			)}
		</Group>
	);
}

export default StudyProfileOption;
