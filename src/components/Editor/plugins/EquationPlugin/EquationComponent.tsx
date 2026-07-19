import { renderToString } from "katex";
import "katex/dist/katex.min.css";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, TextInput } from "@mantine/core";
import { $isEquationNode } from "./EquationNode";

interface Props {
	equation: string;
	nodeKey: string;
}

export default function EquationComponent({ equation, nodeKey }: Props) {
	const [editor] = useLexicalComposerContext();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(equation);
	const inputRef = useRef<HTMLInputElement | null>(null);

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
			<TextInput
				ref={inputRef}
				value={draft}
				onChange={e => setDraft(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => commit(draft)}
				display="inline-block"
				styles={{
					input: {
						font: "inherit",
						fieldSizing: "content",
						minWidth: "4ch",
					},
				}}
			/>
		);
	}

	return (
		<Box
			component="span"
			onDoubleClick={startEditing}
			style={{
				cursor: "pointer",
				display: "inline-block",
				maxWidth: "100%",
				overflowX: "auto",
				verticalAlign: "top",
			}}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
