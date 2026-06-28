import { CreateMetaDto } from "./createMetaDto";

export interface CreateCardDto {
	meta: CreateMetaDto;
	front: string;
	back: string;
}
