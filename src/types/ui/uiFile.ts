import { ReviewTreeFileDto } from "../../api/fileSystem/dto/reviewTreeFileDto";

export default interface UiFile extends ReviewTreeFileDto {
	isVisible: boolean;
}
