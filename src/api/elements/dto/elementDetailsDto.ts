import { CardReviewDto } from "../../study/dto/cardReviewDto";
import { LearningAssetReviewDto } from "../../study/dto/learningAssetReviewDto";
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
	learningAssetReview: LearningAssetReviewDto | null;
	effectiveProfile: EffectiveProfileDto;
	profiles: StudyProfileDto[];
	inheritedProfileName: string | null;
	priority: PriorityInfoDto;
}
