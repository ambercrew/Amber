import {
	getTreeExpandedState,
	Group,
	Highlight,
	RenderTreeNodePayload,
	Stack,
	TextInput,
	Tree,
	useTree,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
	CaretDownIcon,
	CaretRightIcon,
	MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { setSelectedElementId } from "../../../stores/elements/elementsReducer";
import { selectSelectedElementId } from "../../../stores/elements/elementsSelectors";
import { ElementId } from "../../../types/elements/elementId";
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

function ElementTree({ tree }: ElementTreeProps) {
	const dispatch = useAppDispatch();
	const selectedElementId = useAppSelector(selectSelectedElementId);
	const [search, setSearch] = useState("");
	const data = useMemo(() => dtosToTreeData(tree), [tree]);

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
				{...restElementProps}
				onClick={handleSelect}
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
			</Group>
		);
	}

	return (
		<Stack gap="xs">
			<TextInput
				placeholder="Search..."
				leftSection={<MagnifyingGlassIcon size={16} />}
				value={search}
				onChange={e => handleSearchChange(e.currentTarget.value)}
			/>
			<Tree
				data={data}
				tree={treeController}
				renderNode={renderNode}
				withLines
			/>
		</Stack>
	);
}

export default ElementTree;
