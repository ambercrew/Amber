import Repetition from "../../../types/backend/entity/repetition";

/**
 * Sort the repetitions so that the new repetitions appear last while the rest
 * have the same order.
 */
function sortReviewerRepetitions(repetitions: Repetition[]) {
	return repetitions.sort((a, b) => {
		if (a.state === "New" && b.state === "New") {
			return 0;
		} else if (a.state === "New") {
			return 1;
		} else if (b.state === "New") {
			return -1;
		} else {
			return 0;
		}
	});
}

export default sortReviewerRepetitions;
