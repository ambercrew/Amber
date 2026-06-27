import {
	ActionIcon,
	Group,
	Highlight,
	Menu,
	RenderTreeNodePayload,
} from "@mantine/core";
import {
	CaretDownIcon,
	CaretRightIcon,
	DotsThreeVerticalIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import ElementNodeIcon from "../../App/components/ElementNodeIcon";
import { ElementNodeProps } from "../utils/elementTreeUtils";
import ElementTreeMenuItems from "./ElementTreeMenuItems";

const ICON_SIZE = 18;

interface ElementTreeNodeProps {
	payload: RenderTreeNodePayload;
	search: string;
	isSelected: boolean;
	onSelect: () => void;
	onContextMenu: () => void;
}

function ElementTreeNode({
	payload,
	search,
	isSelected,
	onSelect,
	onContextMenu,
}: ElementTreeNodeProps) {
	const { node, expanded, elementProps } = payload;
	const { type, childrenCount } = node.nodeProps as ElementNodeProps;
	const label = typeof node.label === "string" ? node.label : node.value;
	const hasChildren = node.children && node.children.length > 0;
	const [isHovered, setIsHovered] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const { onClick: toggleExpanded, ...restElementProps } = elementProps;

	function handleCaretClick(e: React.MouseEvent) {
		e.stopPropagation();
		toggleExpanded?.(e as React.MouseEvent<HTMLElement>);
	}

	return (
		<Group
			gap={6}
			py={1}
			{...restElementProps}
			onClick={onSelect}
			onContextMenu={onContextMenu}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			bg={isSelected ? "var(--mantine-primary-color-light)" : undefined}
			c={
				isSelected
					? "var(--mantine-primary-color-light-color)"
					: undefined
			}
			style={{ borderRadius: "var(--mantine-radius-sm)" }}>
			{hasChildren &&
				(expanded ? (
					<CaretDownIcon
						size={ICON_SIZE}
						onClick={handleCaretClick}
					/>
				) : (
					<CaretRightIcon
						size={ICON_SIZE}
						onClick={handleCaretClick}
					/>
				))}
			<ElementNodeIcon type={type} expanded={expanded} size={ICON_SIZE} />
			<Highlight highlight={search} flex={1} truncate="end" title={label}>
				{`${label} (${childrenCount})`}
			</Highlight>
			<Menu
				withinPortal
				position="bottom-start"
				onOpen={() => setIsMenuOpen(true)}
				onClose={() => setIsMenuOpen(false)}
				shadow="lg">
				<Menu.Target>
					<ActionIcon
						variant="subtle"
						size="xs"
						style={{
							visibility:
								isHovered || isMenuOpen ? "visible" : "hidden",
						}}
						onClick={e => e.stopPropagation()}>
						<DotsThreeVerticalIcon size={ICON_SIZE} weight="bold" />
					</ActionIcon>
				</Menu.Target>
				<Menu.Dropdown>
					<ElementTreeMenuItems type={type} />
				</Menu.Dropdown>
			</Menu>
		</Group>
	);
}

export default ElementTreeNode;
