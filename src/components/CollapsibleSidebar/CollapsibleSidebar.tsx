import { ReactNode } from "react";
import { AppShell, Tabs, Group, ActionIcon, ScrollArea } from "@mantine/core";
import { XIcon } from "@phosphor-icons/react";
import { SMALL_SCREEN_BREAKPOINT } from "../../hooks/useIsSmallScreen";

export interface SidebarTab {
	value: string;
	title: string;
	icon: ReactNode;
	panel: ReactNode;
}

interface CollapsibleSidebarProps {
	tabs: SidebarTab[];
	defaultValue: string;
	onCollapse: () => void;
	/** Side the collapse button is anchored to. Defaults to "right". */
	collapsePosition?: "left" | "right";
}

function CollapsibleSidebar({
	tabs,
	defaultValue,
	onCollapse,
	collapsePosition = "right",
}: CollapsibleSidebarProps) {
	return (
		<AppShell.Section py="sm" grow h="100%">
			<ScrollArea h="100%">
				<Tabs defaultValue={defaultValue} variant="pills">
					<Group justify="center" style={{ position: "relative" }}>
						<Tabs.List>
							{tabs.map(tab => (
								<Tabs.Tab
									key={tab.value}
									value={tab.value}
									title={tab.title}>
									{tab.icon}
								</Tabs.Tab>
							))}
						</Tabs.List>
						<ActionIcon
							variant="subtle"
							onClick={onCollapse}
							hiddenFrom={SMALL_SCREEN_BREAKPOINT}
							mx="md"
							style={{
								position: "absolute",
								[collapsePosition]: 0,
							}}>
							<XIcon size={18} />
						</ActionIcon>
					</Group>

					{tabs.map(tab => (
						<Tabs.Panel key={tab.value} value={tab.value}>
							{tab.panel}
						</Tabs.Panel>
					))}
				</Tabs>
			</ScrollArea>
		</AppShell.Section>
	);
}

export default CollapsibleSidebar;
