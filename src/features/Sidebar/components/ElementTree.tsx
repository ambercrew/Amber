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
	FileTextIcon,
	CardsIcon,
	CaretDownIcon,
	CaretRightIcon,
	FolderIcon,
	FolderOpenIcon,
	QuotesIcon,
	MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import {
	dtosToTreeData,
	ElementNodeProps,
	getMatchingAncestors,
} from "../utils/elementTreeUtils";
import { ElementNodeType } from "../../../types/elements/elementNodeType";

interface ElementTreeProps {
	tree: FolderNodeDto[];
}

function ElementTree({ tree }: ElementTreeProps) {
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
	}, [data]);

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
		const { type } = node.nodeProps as ElementNodeProps;
		const label = typeof node.label === "string" ? node.label : node.value;
		const hasChildren = node.children && node.children.length > 0;

		return (
			<Group gap={6} {...elementProps}>
				{hasChildren ? (
					expanded ? (
						<CaretDownIcon size={12} />
					) : (
						<CaretRightIcon size={12} />
					)
				) : (
					<div style={{ width: 12 }} />
				)}
				<ElementNodeIcon type={type} expanded={expanded} />
				<Highlight
					highlight={search}
					flex={1}
					truncate="end"
					title={label}>
					{label}
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

interface ElementNodeIconProps {
	type: ElementNodeType;
	expanded: boolean;
}

// TODO: try to collect all front-end things in one place for different element types
function ElementNodeIcon({ type, expanded }: ElementNodeIconProps) {
	const size = 20;

	switch (type) {
		case "folder":
			return expanded ? (
				<FolderOpenIcon size={size} />
			) : (
				<FolderIcon size={size} />
			);
		case "reading":
			return <FileTextIcon size={size} />;
		case "extract":
			return <QuotesIcon size={size} />;
		case "card":
			return <CardsIcon size={size} />;
	}
}

export default ElementTree;
