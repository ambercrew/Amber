import { CreateMetaDto } from "./createMetaDto";

export interface CreateReadingDto {
	meta: CreateMetaDto;
	content: string;
}
