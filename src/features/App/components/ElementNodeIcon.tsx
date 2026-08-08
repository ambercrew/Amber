import {
	CardsIcon,
	FileTextIcon,
	FolderIcon,
	FolderOpenIcon,
	ScissorsIcon,
} from "@phosphor-icons/react";
import { ElementNodeType } from "../../../types/elements/elementNodeType";

interface ElementNodeIconProps {
	type: ElementNodeType;
	expanded?: boolean;
	size: number;
}

function ElementNodeIcon({ type, expanded, size }: ElementNodeIconProps) {
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
			return <ScissorsIcon size={size} />;
		case "card":
			return <CardsIcon size={size} />;
	}
}

export default ElementNodeIcon;
