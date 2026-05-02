import { Grade, Rating as FsrsRating } from "ts-fsrs";
import { Rating } from "../../../api/cells/entities/rating";

function gradeToRating(grade: Grade): Rating {
	switch (grade) {
		case FsrsRating.Again:
			return "Again";
		case FsrsRating.Hard:
			return "Hard";
		case FsrsRating.Good:
			return "Good";
		case FsrsRating.Easy:
			return "Easy";
	}
}

export default gradeToRating;
