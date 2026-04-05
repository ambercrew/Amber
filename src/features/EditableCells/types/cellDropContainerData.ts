export const CELL_DROP_CONTAINER_TYPE = "CELL_DROP_CONTAINER_TYPE";

type CellDropContainerData =
	| {
			type: "cell";
			cellId: string;
	  }
	| {
			type: "add-cell-container";
	  };

export default CellDropContainerData;
