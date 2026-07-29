import { CardReviewDto } from "../../study/dto/cardReviewDto";
import { ReadingReviewDto } from "../../study/dto/readingReviewDto";
import {
	EffectiveProfileDto,
	StudyProfileDto,
} from "../../study/dto/studyProfileDto";
import { BibliographicalSourceResponseDto } from "../../bibliographicalSources/dto/bibliographicalSourceDto";
import { PriorityInfoDto } from "./priorityInfoDto";

export interface ElementDetailsResponseDto {
	bibliographicalSource: BibliographicalSourceResponseDto | null;
	derivedFromName: string | null;
	cardReview: CardReviewDto | null;
	readingReview: ReadingReviewDto | null;
	effectiveProfile: EffectiveProfileDto;
	profiles: StudyProfileDto[];
	inheritedProfileName: string | null;
	priority: PriorityInfoDto;
}
