import Repetition from "../../../api/cells/entities/repetition";

function accumulateRepetitionsCounts(repetitions: Repetition[]) {
	const counts = {
		new: 0,
		learning: 0,
		review: 0,
	};
	repetitions.forEach(c => {
		switch (c.state) {
			case "new":
				counts.new += 1;
				break;
			case "learning":
			case "relearning":
				counts.learning += 1;
				break;
			case "review":
				counts.review += 1;
				break;
		}
	});

	return counts;
}

export default accumulateRepetitionsCounts;
