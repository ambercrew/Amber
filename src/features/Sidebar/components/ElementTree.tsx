import {
	ActionIcon,
	getTreeExpandedState,
	Group,
	Highlight,
	Menu,
	RenderTreeNodePayload,
	Stack,
	TextInput,
	Tree,
	useTree,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
	BookOpenIcon,
	CaretDownIcon,
	CaretRightIcon,
	DotsThreeVerticalIcon,
	FolderPlusIcon,
	MagnifyingGlassIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { setSelectedElementId } from "../../../stores/elements/elementsReducer";
import { selectSelectedElementId } from "../../../stores/elements/elementsSelectors";
import { ElementId } from "../../../types/elements/elementId";
import { ElementNodeType } from "../../../types/elements/elementNodeType";
import {
	dtosToTreeData,
	ElementNodeProps,
	getMatchingAncestors,
} from "../utils/elementTreeUtils";
import ElementNodeIcon from "../../App/components/ElementNodeIcon";

const ICON_SIZE = 18;

interface ElementTreeProps {
	tree: FolderNodeDto[];
}

// TODO: refactor
function ElementTree({ tree }: ElementTreeProps) {
	const dispatch = useAppDispatch();
	const selectedElementId = useAppSelector(selectSelectedElementId);
	const [search, setSearch] = useState("");
	const data = useMemo(() => dtosToTreeData(tree), [tree]);
	const [hoveredValue, setHoveredValue] = useState<string | null>(null);
	const [dotsMenuOpenFor, setDotsMenuOpenFor] = useState<string | null>(null);
	const [contextMenuNode, setContextMenuNode] = useState<{
		value: string;
		type: ElementNodeType;
	} | null>(null);

	function renderMenuItems(type: ElementNodeType) {
		return (
			<>
				{type === "folder" && (
					<>
						<Menu.Item leftSection={<FolderPlusIcon size={16} />}>
							New Folder
						</Menu.Item>
						<Menu.Item leftSection={<BookOpenIcon size={16} />}>
							New Reading
						</Menu.Item>
						<Menu.Divider />
					</>
				)}
				<Menu.Item leftSection={<PencilSimpleIcon size={16} />}>
					Rename
				</Menu.Item>
				<Menu.Divider />
				<Menu.Item leftSection={<TrashIcon size={16} />} color="red">
					Delete
				</Menu.Item>
			</>
		);
	}

	const [persistedExpandedState, setPersistedExpandedState] = useLocalStorage<
		Record<string, boolean>
	>({
		key: "element-tree-expanded",
		defaultValue: {},
		getInitialValueInEffect: false,
	});

	const treeController = useTree({
		initialExpandedState: persistedExpandedState,
		onNodeExpand: value =>
			setPersistedExpandedState(prev => ({ ...prev, [value]: true })),
		onNodeCollapse: value =>
			setPersistedExpandedState(prev => ({ ...prev, [value]: false })),
	});

	// Data loads after first render leading to initial expanded state not being applied.
	const restoredRef = useRef(false);
	useEffect(() => {
		if (!restoredRef.current && data.length > 0) {
			treeController.setExpandedState(persistedExpandedState);
			restoredRef.current = true;
		}
	}, [data, persistedExpandedState, treeController]);

	function handleSearchChange(value: string) {
		setSearch(value);
		if (value.trim()) {
			treeController.setExpandedState(
				getTreeExpandedState(data, getMatchingAncestors(data, value)),
			);
		} else {
			treeController.setExpandedState({});
		}
	}

	function renderNode({
		node,
		expanded,
		elementProps,
	}: RenderTreeNodePayload) {
		const { type, childrenCount } = node.nodeProps as ElementNodeProps;
		const label = typeof node.label === "string" ? node.label : node.value;
		const hasChildren = node.children && node.children.length > 0;
		const isSelected =
			selectedElementId?.id === node.value &&
			selectedElementId?.type === type;
		const showDots =
			hoveredValue === node.value || dotsMenuOpenFor === node.value;

		const { onClick: toggleExpanded, ...restElementProps } = elementProps;

		function handleCaretClick(e: React.MouseEvent) {
			e.stopPropagation();
			toggleExpanded?.(e as React.MouseEvent<HTMLElement>);
		}

		function handleSelect() {
			dispatch(
				setSelectedElementId({ type, id: node.value } as ElementId),
			);
		}

		return (
			<Group
				gap={6}
				py={1}
				{...restElementProps}
				onClick={handleSelect}
				onContextMenu={() =>
					setContextMenuNode({ value: node.value, type })
				}
				onMouseEnter={() => setHoveredValue(node.value)}
				onMouseLeave={() => setHoveredValue(null)}
				bg={
					isSelected
						? "var(--mantine-primary-color-light)"
						: undefined
				}
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
				<ElementNodeIcon
					type={type}
					expanded={expanded}
					size={ICON_SIZE}
				/>
				<Highlight
					highlight={search}
					flex={1}
					truncate="end"
					title={label}>
					{`${label} (${childrenCount})`}
				</Highlight>
				{/* Rendering a second menu since the first one is used for context menu and this one for the button. */}
				<Menu
					withinPortal
					position="bottom-start"
					onOpen={() => setDotsMenuOpenFor(node.value)}
					onClose={() => setDotsMenuOpenFor(null)}
					shadow="lg">
					<Menu.Target>
						<ActionIcon
							variant="subtle"
							size="xs"
							style={{
								visibility: showDots ? "visible" : "hidden",
							}}
							onClick={e => e.stopPropagation()}>
							<DotsThreeVerticalIcon
								size={ICON_SIZE}
								weight="bold"
							/>
						</ActionIcon>
					</Menu.Target>
					<Menu.Dropdown>{renderMenuItems(type)}</Menu.Dropdown>
				</Menu>
			</Group>
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
					/>
				</Menu.ContextMenu>
				<Menu.Dropdown>
					{contextMenuNode && renderMenuItems(contextMenuNode.type)}
				</Menu.Dropdown>
			</Menu>
		</Stack>
	);
}

export default ElementTree;
