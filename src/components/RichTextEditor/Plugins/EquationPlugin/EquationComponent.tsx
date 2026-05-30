import { renderToString } from "katex";
import "katex/dist/katex.min.css";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";
import { useEffect, useMemo, useRef, useState } from "react";
import { $isEquationNode } from "./EquationNode";
import styles from "./EquationComponent.module.css";

interface Props {
	equation: string;
	nodeKey: string;
}

export default function EquationComponent({ equation, nodeKey }: Props) {
	const [editor] = useLexicalComposerContext();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(equation);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [editing]);

	const html = useMemo(() => {
		try {
			return renderToString(equation, {
				displayMode: false,
				throwOnError: false,
				output: "html",
			});
		} catch {
			return equation;
		}
	}, [equation]);

	function commit(value: string) {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if ($isEquationNode(node)) {
				if (draft.length === 0) {
					node.remove();
				} else {
					node.setEquation(value);
				}
			}
		});
		setEditing(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			e.preventDefault();
			commit(draft);
		} else if (e.key === "Escape") {
			setDraft(equation);
			setEditing(false);
		}
	}

	function startEditing() {
		setDraft(equation);
		setEditing(true);
	}

	if (editing) {
		return (
			<input
				ref={inputRef}
				value={draft}
				size={draft.length}
				onChange={e => setDraft(e.target.value)}
				onKeyDown={handleKeyDown}
				className={styles.input}
				onBlur={() => commit(draft)}
			/>
		);
	}

	return (
		<span
			className={styles.equation}
			onDoubleClick={startEditing}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
