import { useState } from "react";
import { AppShell, Group, ActionIcon } from "@mantine/core";
import {
	IconLayoutSidebarLeftCollapse,
	IconBinaryTree,
	IconSortDescending,
} from "@tabler/icons-react";
import TreePanel from "./TreePanel";
import PriorityQueuePanel from "./PriorityQueuePanel";

type Tab = "tree" | "priority queue";

interface SidebarProps {
	onCollapse: () => void;
}

function Sidebar({ onCollapse }: SidebarProps) {
	const [activeTab, setActiveTab] = useState<Tab>("tree");

	return (
		<>
			<AppShell.Section p="sm">
				<Group justify="center" style={{ position: "relative" }}>
					<Group gap={4}>
						<ActionIcon
							variant={activeTab === "tree" ? "filled" : "subtle"}
							onClick={() => setActiveTab("tree")}
							title="Library - used for managing concepts and elements">
							<IconBinaryTree size={16} />
						</ActionIcon>
						<ActionIcon
							variant={
								activeTab === "priority queue"
									? "filled"
									: "subtle"
							}
							onClick={() => setActiveTab("priority queue")}
							title="Priority queue - used for reviewing your learning materials">
							<IconSortDescending size={16} />
						</ActionIcon>
					</Group>
					<ActionIcon
						variant="subtle"
						onClick={onCollapse}
						hiddenFrom="sm"
						style={{ position: "absolute", right: 0 }}>
						<IconLayoutSidebarLeftCollapse size={16} />
					</ActionIcon>
				</Group>
			</AppShell.Section>

			<AppShell.Section grow style={{ overflowY: "auto" }}>
				{activeTab === "tree" ? <TreePanel /> : <PriorityQueuePanel />}
			</AppShell.Section>
		</>
	);
}

export default Sidebar;
