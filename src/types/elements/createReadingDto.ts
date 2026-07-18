import { CreateMetaDto } from "./createMetaDto";

export interface CreateReadingDto {
	id: string;
	meta: CreateMetaDto;
	splits: string[];
}
