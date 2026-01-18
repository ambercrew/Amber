import { invoke } from "@tauri-apps/api/core";
import HomeStatistics from "../types/backend/dto/homeStatistics";
import { Rating } from "../types/backend/entity/rating";
import RepetitionUpdate from "../types/backend/valueObjects/repetitionUpdate";

export function registerReview(
	repetitionUpdate: RepetitionUpdate,
	rating: Rating,
	studyTime: number,
) {
	return invoke("register_review", { repetitionUpdate, rating, studyTime });
}

export function getHomeStatistics(): Promise<HomeStatistics> {
	return invoke("get_home_statistics");
}
