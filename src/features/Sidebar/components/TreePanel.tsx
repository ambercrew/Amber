import { useState } from "react";
import { NavLink } from "@mantine/core";
import {
	IconDashboard,
	IconUsers,
	IconChartPie,
	IconShieldLock,
	IconSettings,
} from "@tabler/icons-react";

function TreePanel() {
	const [activeKey, setActiveKey] = useState("1");

	return (
		<nav>
			<NavLink
				active={activeKey === "1"}
				label="Overview"
				leftSection={<IconDashboard size={16} />}
				onClick={() => setActiveKey("1")}
			/>
			<NavLink label="Customers" leftSection={<IconUsers size={16} />}>
				<NavLink
					active={activeKey === "2-1"}
					label="Users"
					onClick={() => setActiveKey("2-1")}
				/>
				<NavLink
					active={activeKey === "2-2"}
					label="Groups"
					onClick={() => setActiveKey("2-2")}
				/>
			</NavLink>
			<NavLink label="Analytics" leftSection={<IconChartPie size={16} />}>
				<NavLink
					active={activeKey === "3-1"}
					label="Geo"
					onClick={() => setActiveKey("3-1")}
				/>
				<NavLink
					active={activeKey === "3-2"}
					label="Devices"
					onClick={() => setActiveKey("3-2")}
				/>
				<NavLink
					active={activeKey === "3-3"}
					label="Loyalty"
					onClick={() => setActiveKey("3-3")}
				/>
				<NavLink
					active={activeKey === "3-4"}
					label="Visit Depth"
					onClick={() => setActiveKey("3-4")}
				/>
			</NavLink>
			<NavLink
				label="Security"
				leftSection={<IconShieldLock size={16} />}>
				<NavLink
					active={activeKey === "4-1"}
					label="Users"
					onClick={() => setActiveKey("4-1")}
				/>
				<NavLink
					active={activeKey === "4-2"}
					label="Roles"
					onClick={() => setActiveKey("4-2")}
				/>
				<NavLink
					active={activeKey === "4-3"}
					label="Permissions"
					onClick={() => setActiveKey("4-3")}
				/>
			</NavLink>
			<NavLink label="Settings" leftSection={<IconSettings size={16} />}>
				<NavLink
					active={activeKey === "5-1"}
					label="Applications"
					onClick={() => setActiveKey("5-1")}
				/>
				<NavLink
					active={activeKey === "5-2"}
					label="Channels"
					onClick={() => setActiveKey("5-2")}
				/>
				<NavLink
					active={activeKey === "5-3"}
					label="Versions"
					onClick={() => setActiveKey("5-3")}
				/>
			</NavLink>
		</nav>
	);
}

export default TreePanel;
