import { ReactNode, useState } from "react";
import { AppShell, Tabs, Group, ActionIcon, ScrollArea } from "@mantine/core";
import { XIcon } from "@phosphor-icons/react";
import { SMALL_SCREEN_BREAKPOINT } from "../../hooks/useIsSmallScreen";

export interface SidebarTab {
	value: string;
	title: string;
	icon: ReactNode;
	panel: ReactNode;
	/**
	 * Whether CollapsibleSidebar should scroll the panel's content for it.
	 * Set to false when the panel manages its own height and scrolling
	 * (e.g. a chat view that pins an input to the bottom). Defaults to true.
	 */
	scrollable?: boolean;
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
	const [value, setValue] = useState(defaultValue);
	const activeValue = tabs.some(tab => tab.value === value)
		? value
		: (tabs[0]?.value ?? "");

	return (
		<AppShell.Section
			grow
			style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
			<Tabs
				value={activeValue}
				onChange={v => v && setValue(v)}
				variant="pills"
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
				}}>
				<Group
					justify="center"
					py="sm"
					style={{ position: "relative" }}>
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
					<Tabs.Panel
						key={tab.value}
						value={tab.value}
						style={{
							flex: 1,
							minHeight: 0,
							display: "flex",
							flexDirection: "column",
						}}>
						{tab.scrollable === false ? (
							tab.panel
						) : (
							<ScrollArea style={{ flex: 1 }}>
								{tab.panel}
							</ScrollArea>
						)}
					</Tabs.Panel>
				))}
			</Tabs>
		</AppShell.Section>
	);
}

export default CollapsibleSidebar;
