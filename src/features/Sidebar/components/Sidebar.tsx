import { useState } from "react";
import { AppShell, Group, ActionIcon } from "@mantine/core";
import FileTreePanel from "./FileTreePanel";
import PriorityQueuePanel from "./PriorityQueuePanel";
import { TreeViewIcon, QueueIcon, XIcon } from "@phosphor-icons/react";

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
					<Group gap="xs">
						<ActionIcon
							variant={activeTab === "tree" ? "filled" : "subtle"}
							onClick={() => setActiveTab("tree")}
							title="File Tree - used for managing your learning materials">
							<TreeViewIcon size={20} />
						</ActionIcon>
						<ActionIcon
							variant={
								activeTab === "priority queue"
									? "filled"
									: "subtle"
							}
							onClick={() => setActiveTab("priority queue")}
							title="Priority queue - used for reviewing your learning materials">
							<QueueIcon size={20} />
						</ActionIcon>
					</Group>
					<ActionIcon
						variant="subtle"
						onClick={onCollapse}
						hiddenFrom="sm"
						style={{ position: "absolute", right: 0 }}>
						<XIcon size={20} />
					</ActionIcon>
				</Group>
			</AppShell.Section>

			<AppShell.Section grow style={{ overflowY: "auto" }}>
				{activeTab === "tree" ? (
					<FileTreePanel />
				) : (
					<PriorityQueuePanel />
				)}
			</AppShell.Section>
		</>
	);
}

export default Sidebar;
