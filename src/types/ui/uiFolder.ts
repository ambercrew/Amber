import ParsedFolder from "../parsedFolder";
import UiFile from "./uiFile";

export default interface UiFolder extends ParsedFolder {
	subFolders: UiFolder[];
	files: UiFile[];
	isVisible: boolean;
}
