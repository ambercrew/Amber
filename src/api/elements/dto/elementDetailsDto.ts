import { CardReviewDto } from "../../study/dto/cardReviewDto";
import { ReadingReviewDto } from "../../study/dto/readingReviewDto";
import {
	EffectiveProfileDto,
	StudyProfileDto,
} from "../../study/dto/studyProfileDto";
import { SourceResponseDto } from "../../sources/dto/sourceDto";

export interface ElementDetailsResponseDto {
	source: SourceResponseDto | null;
	derivedFromName: string | null;
	cardReview: CardReviewDto | null;
	readingReview: ReadingReviewDto | null;
	effectiveProfile: EffectiveProfileDto;
	profiles: StudyProfileDto[];
	inheritedProfileName: string | null;
}
