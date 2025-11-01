import { LexicalEditor, RangeSelection } from "lexical";
import styles from "../../styles.module.css";
import Icon from "@mdi/react";

export interface IFloatingMenuButton {
	icon: string;
	name: string;
	title: string;
	onClick: (editor: LexicalEditor, isActive: boolean) => void;
	isActive: (selection: RangeSelection) => boolean;
	isVisible?: (selection: RangeSelection) => boolean;
}

interface IProps {
	editor: LexicalEditor;
	floatingButtonProps: IFloatingMenuButton;
	activeState: Record<string, boolean>;
	visibleState: Record<string, boolean>;
}

export default function FloatingMenuButton({
	editor,
	floatingButtonProps,
	activeState,
	visibleState,
}: IProps) {
	return (
		visibleState[floatingButtonProps.name] && (
			<button
				onClick={() =>
					floatingButtonProps.onClick(
						editor,
						activeState[floatingButtonProps.name],
					)
				}
				className={`transparent ${activeState[floatingButtonProps.name] && styles.activeButton}`}
				title={floatingButtonProps.title}
				aria-label={floatingButtonProps.title}>
				<Icon path={floatingButtonProps.icon} size={1} />
			</button>
		)
	);
}
