import { AppShell, Tabs, Group, ActionIcon, ScrollArea } from "@mantine/core";
import ElementTreePanel from "./ElementTreePanel";
import PriorityQueuePanel from "./PriorityQueuePanel";
import { TreeViewIcon, QueueIcon, XIcon } from "@phosphor-icons/react";
import { SMALL_SCREEN_BREAKPOINT } from "../../../hooks/useIsSmallScreen";

interface SidebarProps {
	onCollapse: () => void;
}

function Sidebar({ onCollapse }: SidebarProps) {
	return (
		<AppShell.Section py="sm" grow h="100%">
			<ScrollArea h="100%">
				<Tabs defaultValue="tree" variant="pills">
					<Group justify="center" style={{ position: "relative" }}>
						<Tabs.List>
							<Tabs.Tab
								value="tree"
								title="Element Tree - used for managing your learning materials">
								<TreeViewIcon size={16} />
							</Tabs.Tab>
							<Tabs.Tab
								value="priority-queue"
								title="Priority queue - used for reviewing your learning materials">
								<QueueIcon size={16} />
							</Tabs.Tab>
						</Tabs.List>
						<ActionIcon
							variant="subtle"
							onClick={onCollapse}
							hiddenFrom={SMALL_SCREEN_BREAKPOINT}
							mx="md"
							style={{ position: "absolute", right: 0 }}>
							<XIcon size={18} />
						</ActionIcon>
					</Group>

					<Tabs.Panel value="tree">
						<ElementTreePanel />
					</Tabs.Panel>
					<Tabs.Panel value="priority-queue">
						<PriorityQueuePanel />
					</Tabs.Panel>
				</Tabs>
			</ScrollArea>
		</AppShell.Section>
	);
}

export default Sidebar;
