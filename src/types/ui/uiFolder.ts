import { ReviewTreeFolder } from "../backend/dto/reviewTreeFolder";
import UiFile from "./uiFile";

export default interface UiFolder extends ReviewTreeFolder {
	subfolders: UiFolder[];
	files: UiFile[];
	isVisible: boolean;
}
