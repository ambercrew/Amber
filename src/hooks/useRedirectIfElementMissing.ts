import { useEffect } from "react";
import { useNavigate } from "react-router";
import { selectElementTree } from "../stores/elements/elementsSelectors";
import useAppSelector from "./useAppSelector";
import { useElementParams } from "./useElementParams";
import { elementExists } from "../api/elements/api/elementsApi";

export function useRedirectIfElementMissing() {
	const params = useElementParams();
	const tree = useAppSelector(selectElementTree);
	const navigate = useNavigate();

	useEffect(() => {
		if (!params?.type || !params.id) {
			void navigate(-1);
			return;
		}
		void elementExists({ type: params.type, id: params.id }).then(
			exists => {
				if (!exists) void navigate(-1);
			},
		);
	}, [params?.type, params?.id, navigate, tree]);
}
