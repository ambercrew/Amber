import { useEffect } from "react";
import { getDueElements } from "../../../api/study/api/studyApi";
import useApi from "../../../hooks/useApi";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { queueLoaded } from "../../../stores/study/studyReducer";
import { selectStudyStatus } from "../../../stores/study/studySelectors";

// Lets the sidebar preview which elements are due before a session starts,
// without affecting status/counts/etc. Once a session is active, the queue
// is only ever driven by the session engine itself.
export function useDueElementsPreview() {
	const dispatch = useAppDispatch();
	const status = useAppSelector(selectStudyStatus);
	const { callApi } = useApi();

	const isStudying = status === "studying";

	function refresh() {
		void callApi(async () => {
			const queue = await getDueElements();
			dispatch(queueLoaded(queue));
		});
	}

	useEffect(() => {
		if (isStudying) return;
		refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isStudying, callApi, dispatch]);
}
