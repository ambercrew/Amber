import { defaultTreeNodeFilter, TreeNodeData } from "@mantine/core";

export function getMatchingAncestors(
	nodes: TreeNodeData[],
	query: string,
): string[] {
	const result: string[] = [];
	for (const node of nodes) {
		const childMatches = node.children
			? getMatchingAncestors(node.children, query)
			: [];
		if (defaultTreeNodeFilter(query, node) || childMatches.length > 0) {
			result.push(node.value, ...childMatches);
		}
	}
	return result;
}
