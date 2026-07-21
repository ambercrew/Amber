import { TreeViewIcon, QueueIcon } from "@phosphor-icons/react";
import CollapsibleSidebar from "../../../components/CollapsibleSidebar/CollapsibleSidebar";
import ElementTreePanel from "./ElementTreePanel";
import PriorityQueuePanel from "./PriorityQueuePanel";

interface SidebarProps {
	onCollapse: () => void;
}

function Sidebar({ onCollapse }: SidebarProps) {
	return (
		<CollapsibleSidebar
			defaultValue="tree"
			onCollapse={onCollapse}
			tabs={[
				{
					value: "tree",
					title: "Element Tree - used for managing your learning materials",
					icon: <TreeViewIcon size={16} />,
					panel: <ElementTreePanel />,
				},
				{
					value: "priority-queue",
					title: "Priority queue - used for reviewing your learning materials",
					icon: <QueueIcon size={16} />,
					panel: <PriorityQueuePanel />,
				},
			]}
		/>
	);
}

export default Sidebar;
