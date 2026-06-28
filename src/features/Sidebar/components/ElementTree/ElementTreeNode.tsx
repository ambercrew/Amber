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
import ElementNodeIcon from "../../../App/components/ElementNodeIcon";
import { ElementId } from "../../../../types/elements/elementId";
import { ElementNodeProps } from "../../utils/elementTreeUtils";
import DeleteElementModal from "../DeleteElementModal";
import ElementTreeMenuItems from "./ElementTreeMenuItems";
import RenameElementForm from "./RenameElementForm";

const ICON_SIZE = 18;

interface ElementTreeNodeProps {
	payload: RenderTreeNodePayload;
	search: string;
	isSelected: boolean;
	isContextMenuOpen: boolean;
	isRenaming: boolean;
	onSelect: () => void;
	onContextMenu: () => void;
	onRenameClick: () => void;
	onRenameClose: () => void;
	onAfterCreate: () => void;
}

function ElementTreeNode({
	payload,
	search,
	isSelected,
	isContextMenuOpen,
	isRenaming,
	onSelect,
	onContextMenu,
	onRenameClick,
	onRenameClose,
	onAfterCreate,
}: ElementTreeNodeProps) {
	const { node, expanded, elementProps } = payload;
	const { type, childrenCount } = node.nodeProps as ElementNodeProps;
	const id = node.value;
	const label = typeof node.label === "string" ? node.label : node.value;
	const hasChildren = node.children && node.children.length > 0;
	const [isHovered, setIsHovered] = useState(false);
	// Only controls the menu with three dots.
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<ElementId | null>(null);

	const { onClick: toggleExpanded, ...restElementProps } = elementProps;

	function handleCaretClick(e: React.MouseEvent) {
		e.stopPropagation();
		toggleExpanded?.(e as React.MouseEvent<HTMLElement>);
	}

	return (
		<>
			<Group
				gap={6}
				py={2}
				{...restElementProps}
				onClick={onSelect}
				onDoubleClick={onRenameClick}
				onContextMenu={onContextMenu}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				bg={
					isSelected
						? "var(--mantine-primary-color-light)"
						: isMenuOpen || isContextMenuOpen || isHovered
							? "var(--mantine-color-gray-light-hover)"
							: undefined
				}
				c={
					isSelected
						? "var(--mantine-primary-color-light-color)"
						: undefined
				}
				style={{ borderRadius: "var(--mantine-radius-sm)" }}>
				{hasChildren && (
					<ActionIcon
						variant="transparent"
						size="xs"
						c="inherit"
						aria-label={expanded ? "Collapse" : "Expand"}
						onClick={handleCaretClick}>
						{expanded ? (
							<CaretDownIcon size={ICON_SIZE} />
						) : (
							<CaretRightIcon size={ICON_SIZE} />
						)}
					</ActionIcon>
				)}
				<ElementNodeIcon
					type={type}
					expanded={expanded}
					size={ICON_SIZE}
				/>
				{isRenaming ? (
					<RenameElementForm
						elementId={{ type, id }}
						initialName={label}
						onClose={onRenameClose}
					/>
				) : (
					<Highlight
						highlight={search}
						flex={1}
						truncate="end"
						title={label}>
						{`${label} (${childrenCount})`}
					</Highlight>
				)}
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
							aria-label="Open actions menu"
							style={{
								visibility:
									isHovered || isMenuOpen || isContextMenuOpen
										? "visible"
										: "hidden",
							}}
							onClick={e => e.stopPropagation()}>
							<DotsThreeVerticalIcon
								size={ICON_SIZE}
								weight="bold"
							/>
						</ActionIcon>
					</Menu.Target>
					<Menu.Dropdown>
						<ElementTreeMenuItems
							elementId={{ type, id }}
							onRenameClick={onRenameClick}
							onDeleteClick={() => setDeleteTarget({ type, id })}
							onAfterCreate={onAfterCreate}
						/>
					</Menu.Dropdown>
				</Menu>
			</Group>
			<DeleteElementModal
				elementId={deleteTarget}
				onClose={() => setDeleteTarget(null)}
			/>
		</>
	);
}

export default ElementTreeNode;
