import { ChainedCommands, Editor } from "@tiptap/react";
import styles from "./styles.module.css";
import Icon from "@mdi/react";

export interface Command {
	icon: string;
	name: string;
	title: string;
	onClick: (chaindedCommand: ChainedCommands) => ChainedCommands;
}

interface Props {
	command: Command;
	editor: Editor;
}

function BubbleMenuCommand({ command, editor }: Props) {
	return (
		<button
			onClick={() => command.onClick(editor.chain().focus()).run()}
			className={`transparent ${editor.isActive(command.name) && styles.activeButton}`}
			title={command.title}
			aria-label={command.title}>
			<Icon path={command.icon} size={0.8} />
		</button>
	);
}

export default BubbleMenuCommand;
