import { ReviewTreeFile } from "../backend/dto/reviewTreeFolder";

export default interface UiFile extends ReviewTreeFile {
	isVisible: boolean;
}
