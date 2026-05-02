import { invoke } from "@tauri-apps/api/core";
import HomeStatistics from "../valueObjects/homeStatistics";
import { Rating } from "../entities/rating";
import UpdateRepetitionRequestDto from "../dto/updateRepetitionRequestDto";

export function registerReview(
	repetitionUpdate: UpdateRepetitionRequestDto,
	rating: Rating,
	studyTime: number,
) {
	return invoke("register_review", { repetitionUpdate, rating, studyTime });
}

export function getHomeStatistics(): Promise<HomeStatistics> {
	return invoke("get_home_statistics");
}
