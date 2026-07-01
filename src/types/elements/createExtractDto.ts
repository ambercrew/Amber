import { CreateMetaDto } from "./createMetaDto";

export interface CreateExtractDto {
	meta: CreateMetaDto;
	content: string;
}
