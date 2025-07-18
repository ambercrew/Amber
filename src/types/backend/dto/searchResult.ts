import Cell from "../entity/cell";
import Repetition from "../entity/repetition";

interface SearchResult {
	cells: Cell[];
	repetitions: Repetition[];
}

export default SearchResult;
