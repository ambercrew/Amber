import { useCallback, useState } from "react";
import useApi, { CallApiFn } from "./useApi";

/** A hook that lets you combine an error message with the useApi hook into
 * a single state so that you don't have to manage to error messages.
 * Be aware that the custom error message is cleared whenever a call to the API
 * is made.
 */
export default function useApiWithCustomError() {
	const [customErrorMessage, setCustomErrorMessage] = useState<string | null>(
		null,
	);
	const {
		isSendingRequest,
		errorMessage: apiErrorMessage,
		clearErrorMessage: clearApiErrorMessage,
		callApi,
	} = useApi();

	const clearErrorMessage = useCallback(() => {
		clearApiErrorMessage();
		setCustomErrorMessage(null);
	}, [clearApiErrorMessage]);

	const customCallApi: CallApiFn = useCallback(
		async (cb, ...rest) => {
			await callApi(
				async () => {
					setCustomErrorMessage(null);
					return await cb();
				},
				...rest,
			);
		},
		[callApi],
	);

	return {
		isSendingRequest,
		errorMessage: apiErrorMessage ?? customErrorMessage,
		callApi: customCallApi,
		clearErrorMessage,
		setCustomErrorMessage,
	};
}
