import { RepetitionWithFsrsProfileId } from "../components/Reviewer";

/**
 * Sort the repetitions so that the new repetitions appear last while the rest
 * have the same order.
 */
function sortReviewerRepetitions(repetitions: RepetitionWithFsrsProfileId[]) {
	return repetitions.sort((a, b) => {
		if (a.repetition.state === "new" && b.repetition.state === "new") {
			return 0;
		} else if (a.repetition.state === "new") {
			return 1;
		} else if (b.repetition.state === "new") {
			return -1;
		} else {
			return 0;
		}
	});
}

export default sortReviewerRepetitions;
