import { CreateMetaDto } from "./createMetaDto";

export interface CreateExtractDto {
	id: string;
	meta: CreateMetaDto;
	content: string;
}
