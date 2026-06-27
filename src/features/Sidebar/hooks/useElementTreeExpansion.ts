import { getTreeExpandedState, TreeNodeData, useTree } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { useEffect, useRef, useState } from "react";
import { getMatchingAncestors } from "../utils/elementTreeUtils";

export function useElementTreeExpansion(data: TreeNodeData[]) {
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

	const [search, setSearch] = useState("");
	const preSearchExpandedState = useRef<Record<string, boolean> | null>(null);

	function handleSearchChange(value: string) {
		setSearch(value);
		if (value.trim()) {
			preSearchExpandedState.current ??= persistedExpandedState;
			treeController.setExpandedState(
				getTreeExpandedState(data, getMatchingAncestors(data, value)),
			);
		} else {
			treeController.setExpandedState(
				preSearchExpandedState.current ?? {},
			);
			preSearchExpandedState.current = null;
		}
	}

	return { treeController, search, handleSearchChange };
}
