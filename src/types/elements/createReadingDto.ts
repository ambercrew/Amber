import { CreateMetaDto } from "./createMetaDto";

export interface CreateReadingDto {
	meta: CreateMetaDto;
	body: string;
}
