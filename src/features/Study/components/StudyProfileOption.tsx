import { Badge, Group, Text } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react";

interface StudyProfileOptionProps {
	label: string;
	isDefault: boolean;
	checked: boolean;
}

function StudyProfileOption({
	label,
	isDefault,
	checked,
}: StudyProfileOptionProps) {
	return (
		<Group gap="xs" flex={1} justify="space-between" wrap="nowrap">
			<Group gap="xs" wrap="nowrap">
				<CheckIcon
					size={16}
					style={{ visibility: checked ? "visible" : "hidden" }}
				/>
				<Text truncate="end" size="sm">
					{label}
				</Text>
			</Group>
			{isDefault && (
				<Badge size="xs" variant="light">
					Default
				</Badge>
			)}
		</Group>
	);
}

export default StudyProfileOption;
