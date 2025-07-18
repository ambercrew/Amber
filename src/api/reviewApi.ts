import { invoke } from "@tauri-apps/api/core";
import HomeStatistics from "../types/backend/dto/homeStatistics";
import Repetition from "../types/backend/entity/repetition";
import { Rating } from "../types/backend/entity/rating";

export function registerReview(
	newRepetition: Repetition,
	rating: Rating,
	studyTime: number,
) {
	return invoke("register_review", { newRepetition, rating, studyTime });
}

export function getHomeStatistics(): Promise<HomeStatistics> {
	return invoke("get_home_statistics");
}
