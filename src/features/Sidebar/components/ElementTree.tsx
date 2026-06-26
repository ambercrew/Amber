import { Group, RenderTreeNodePayload, Text, Tree } from "@mantine/core";
import {
	Article,
	Cards,
	Folder,
	FolderOpen,
	Quotes,
} from "@phosphor-icons/react";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import {
	dtosToTreeData,
	ElementNodeProps,
	ElementNodeType,
} from "./elementTreeUtils";

interface ElementNodeIconProps {
	type: ElementNodeType;
	expanded: boolean;
}

interface ElementTreeProps {
	tree: FolderNodeDto[];
}

function ElementTree({ tree }: ElementTreeProps) {
	const data = dtosToTreeData(tree);

	return (
		<Tree
			data={data}
			renderNode={renderNode}
			selectOnClick
			clearSelectionOnOutsideClick
			withLines
		/>
	);
}

function renderNode({ node, expanded, elementProps }: RenderTreeNodePayload) {
	const { type } = node.nodeProps as ElementNodeProps;
	return (
		<Group gap={6} {...elementProps}>
			<ElementNodeIcon type={type} expanded={expanded} />
			<Text style={{ userSelect: "none" }}>{node.label}</Text>
		</Group>
	);
}

// TODO: try to collect all front-end things in one place for different element types
function ElementNodeIcon({ type, expanded }: ElementNodeIconProps) {
	const size = 20;

	switch (type) {
		case "folder":
			return expanded ? (
				<FolderOpen size={size} />
			) : (
				<Folder size={size} />
			);
		case "reading":
			return <Article size={size} />;
		case "extract":
			return <Quotes size={size} />;
		case "card":
			return <Cards size={size} />;
	}
}

export default ElementTree;
