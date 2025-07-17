import { Grade, Rating as FsrsRating } from "ts-fsrs";
import { Rating } from "../type/backend/entity/rating";

function gradeToRating(grade: Grade): Rating {
	switch (grade) {
		case FsrsRating.Again:
			return "Again";
		case FsrsRating.Hard:
			return "Again";
		case FsrsRating.Good:
			return "Good";
		case FsrsRating.Easy:
			return "Easy";
	}
}

export default gradeToRating;
