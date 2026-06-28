import {
	Menu,
	RenderTreeNodePayload,
	Stack,
	TextInput,
	Tree,
} from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
	moveElement,
	MoveElementDto,
} from "../../../../api/elements/api/elementsApi";
import FolderNodeDto from "../../../../api/elements/dto/folderNodeDto";
import { useElementParams } from "../../../../hooks/useElementParams";
import { paths } from "../../../../paths";
import { ElementId } from "../../../../types/elements/elementId";
import { ElementNodeType } from "../../../../types/elements/elementNodeType";
import {
	dtosToTreeData,
	DropPayload,
	ElementNodeProps,
	findNodeType,
	isDropAllowed,
} from "../../utils/elementTreeUtils";
import { useElementTreeExpansion } from "../../hooks/useElementTreeExpansion";
import DeleteElementModal from "../DeleteElementModal";
import ElementTreeMenuItems from "./ElementTreeMenuItems";
import ElementTreeNode from "./ElementTreeNode";

interface ElementTreeProps {
	tree: FolderNodeDto[];
}

function ElementTree({ tree }: ElementTreeProps) {
	const navigate = useNavigate();
	const selected = useElementParams();
	const data = useMemo(() => dtosToTreeData(tree), [tree]);
	const [contextMenuNode, setContextMenuNode] = useState<{
		value: string;
		type: ElementNodeType;
	} | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<ElementId | null>(null);
	const [renamingTarget, setRenamingTarget] = useState<ElementId | null>(
		null,
	);

	const { treeController, search, handleSearchChange } =
		useElementTreeExpansion(data);

	function renderNode(payload: RenderTreeNodePayload) {
		const { node } = payload;
		const { type } = node.nodeProps as ElementNodeProps;
		const isSelected =
			selected?.id === node.value && selected?.type === type;

		const isRenaming =
			renamingTarget?.id === node.value && renamingTarget?.type === type;

		return (
			<ElementTreeNode
				payload={payload}
				search={search}
				isSelected={isSelected}
				isContextMenuOpen={
					contextMenuNode?.value === node.value &&
					contextMenuNode?.type === type
				}
				isRenaming={isRenaming}
				onSelect={() => void navigate(paths.element(type, node.value))}
				onContextMenu={() =>
					setContextMenuNode({ value: node.value, type })
				}
				onRenameClick={() =>
					setRenamingTarget({ type, id: node.value })
				}
				onRenameClose={() => setRenamingTarget(null)}
				onAfterCreate={() => treeController.expand(node.value)}
			/>
		);
	}

	return (
		<Stack>
			<TextInput
				placeholder="Search..."
				leftSection={<MagnifyingGlassIcon size={16} />}
				value={search}
				onChange={e => handleSearchChange(e.currentTarget.value)}
			/>
			<Menu
				withinPortal
				onClose={() => setContextMenuNode(null)}
				shadow="lg">
				<Menu.ContextMenu>
					<Tree
						data={data}
						tree={treeController}
						renderNode={renderNode}
						withLines
						onDragDrop={({ draggedNode, targetNode, position }) => {
							const draggedType = findNodeType(data, draggedNode);
							const targetType = findNodeType(data, targetNode);
							if (!draggedType || !targetType) return;
							const dto: MoveElementDto = {
								draggedId: {
									type: draggedType,
									id: draggedNode,
								},
								targetId: { type: targetType, id: targetNode },
								position,
							};
							// TODO: through actions
							void moveElement(dto);
						}}
						allowDrop={(payload: DropPayload) =>
							isDropAllowed(data, payload)
						}
					/>
				</Menu.ContextMenu>
				<Menu.Dropdown>
					{contextMenuNode && (
						<ElementTreeMenuItems
							elementId={{
								type: contextMenuNode.type,
								id: contextMenuNode.value,
							}}
							onRenameClick={() =>
								setRenamingTarget({
									type: contextMenuNode.type,
									id: contextMenuNode.value,
								})
							}
							onDeleteClick={() =>
								setDeleteTarget({
									type: contextMenuNode.type,
									id: contextMenuNode.value,
								})
							}
							onAfterCreate={() =>
								treeController.expand(contextMenuNode.value)
							}
						/>
					)}
				</Menu.Dropdown>
			</Menu>
			<DeleteElementModal
				elementId={deleteTarget}
				onClose={() => setDeleteTarget(null)}
			/>
		</Stack>
	);
}

export default ElementTree;
