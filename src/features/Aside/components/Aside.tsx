import { InfoIcon } from "@phosphor-icons/react";
import CollapsibleSidebar from "../../../components/CollapsibleSidebar/CollapsibleSidebar";
import ElementInfoPanel from "./ElementInfoPanel";

interface AsideProps {
	onCollapse: () => void;
}

function Aside({ onCollapse }: AsideProps) {
	return (
		<CollapsibleSidebar
			defaultValue="info"
			onCollapse={onCollapse}
			collapsePosition="left"
			tabs={[
				{
					value: "info",
					title: "Info",
					icon: <InfoIcon size={16} />,
					panel: <ElementInfoPanel />,
				},
			]}
		/>
	);
}

export default Aside;
