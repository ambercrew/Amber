import { useCallback } from "react";
import { useStore } from "react-redux";
import { useNavigate } from "react-router";
import { RootState } from "../stores/store";
import useAppDispatch from "../hooks/useAppDispatch";
import { CommandId, commands } from "./commands";

export function useRunCommand() {
	const dispatch = useAppDispatch();
	const store = useStore<RootState>();
	const navigate = useNavigate();

	return useCallback(
		(id: CommandId) => {
			const command = commands.find(c => c.id === id);
			if (!command) return;
			if (command.enabled && !command.enabled(store.getState())) return;
			command.execute(dispatch, () => store.getState(), navigate);
		},
		[dispatch, store, navigate],
	);
}
