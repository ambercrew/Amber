import { ReviewTreeFolderDto } from "../../api/fileSystem/dto/reviewTreeFolderDto";
import UiFile from "./uiFile";

export default interface UiFolder extends ReviewTreeFolderDto {
	subfolders: UiFolder[];
	files: UiFile[];
	isVisible: boolean;
}
