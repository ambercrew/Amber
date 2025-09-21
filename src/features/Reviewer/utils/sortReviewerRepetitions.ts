import Repetition from "../../../types/backend/entity/repetition";

/**
 * Sort the repetitions so that the new repetitions appear last while the rest
 * have the same order.
 */
function sortReviewerRepetitions(repetitions: Repetition[]) {
	return repetitions.sort((a, b) => {
		if (a.state === "new" && b.state === "new") {
			return 0;
		} else if (a.state === "new") {
			return 1;
		} else if (b.state === "new") {
			return -1;
		} else {
			return 0;
		}
	});
}

export default sortReviewerRepetitions;
