import Repetition from "../../../types/backend/entity/repetition";

function accumulateRepetitionsCounts(repetitions: Repetition[]) {
	const counts = {
		new: 0,
		learning: 0,
		review: 0,
	};
	repetitions.forEach(c => {
		switch (c.state) {
			case "New":
				counts.new += 1;
				break;
			case "Learning":
			case "Relearning":
				counts.learning += 1;
				break;
			case "Review":
				counts.review += 1;
				break;
		}
	});

	return counts;
}

export default accumulateRepetitionsCounts;
