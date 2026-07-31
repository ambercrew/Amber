import { Stack, Text } from "@mantine/core";

interface InfoFieldProps {
	label: string;
	children: React.ReactNode;
}

function InfoField({ label, children }: InfoFieldProps) {
	return (
		<Stack gap={2}>
			<Text size="xs">{label}</Text>
			{children}
		</Stack>
	);
}

export default InfoField;
