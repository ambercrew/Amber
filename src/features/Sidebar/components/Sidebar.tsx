import { TreeViewIcon, QueueIcon, TrashIcon } from "@phosphor-icons/react";
import CollapsibleSidebar from "../../../components/CollapsibleSidebar/CollapsibleSidebar";
import ElementTreePanel from "./ElementTreePanel";
import PriorityQueuePanel from "./PriorityQueuePanel";
import TrashPanel from "./TrashPanel";

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
					padded: false,
				},
				{
					value: "trash",
					title: "Trash - deleted elements you can still restore",
					icon: <TrashIcon size={16} />,
					panel: <TrashPanel />,
					padded: false,
				},
			]}
		/>
	);
}

export default Sidebar;
