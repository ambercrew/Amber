import { Collapse, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";

interface InfoGroupProps {
	title: string;
	storageKey: string;
	defaultOpened?: boolean;
	children: React.ReactNode;
}

function InfoGroup({
	title,
	storageKey,
	defaultOpened = true,
	children,
}: InfoGroupProps) {
	const [opened, setOpened] = useLocalStorage({
		key: `element-info-panel.${storageKey}.opened`,
		defaultValue: defaultOpened,
	});

	return (
		<Stack gap="sm">
			<UnstyledButton onClick={() => setOpened(o => !o)}>
				<Group gap="xs">
					{opened ? (
						<CaretDownIcon size={14} />
					) : (
						<CaretRightIcon size={14} />
					)}
					<Text size="sm" fw={600}>
						{title}
					</Text>
				</Group>
			</UnstyledButton>
			<Collapse expanded={opened}>
				<Stack gap="sm">{children}</Stack>
			</Collapse>
		</Stack>
	);
}

export default InfoGroup;
