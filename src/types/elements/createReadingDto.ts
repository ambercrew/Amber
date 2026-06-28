import { ReadingSource } from "./reading";

import { CreateMetaDto } from "./createMetaDto";

export interface CreateReadingDto {
	meta: CreateMetaDto;
	source: ReadingSource;
	body: string;
}
