import { CreateMetaDto } from "./createMetaDto";

export interface CreateCardDto {
	id: string;
	meta: CreateMetaDto;
	front: string;
	back: string;
}
