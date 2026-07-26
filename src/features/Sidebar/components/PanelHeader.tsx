import { Group, Text } from "@mantine/core";
import { ReactNode } from "react";

interface PanelHeaderProps {
	title: string;
	children?: ReactNode;
}

function PanelHeader({ title, children }: PanelHeaderProps) {
	return (
		<Group justify="space-between" align="center">
			<Text size="sm" fw={600} c="dimmed" tt="uppercase">
				{title}
			</Text>
			<Group gap="xs">{children}</Group>
		</Group>
	);
}

export default PanelHeader;
