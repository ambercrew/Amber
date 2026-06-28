import { CreateMetaDto } from "./createMetaDto";

export interface CreateExtractDto {
	meta: CreateMetaDto;
	text: string;
}
