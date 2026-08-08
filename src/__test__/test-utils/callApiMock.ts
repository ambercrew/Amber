import { CallApiFn } from "../../hooks/useApi";

const callApiMock: CallApiFn = async (cb, onFinally) => {
	try {
		return await cb();
	} finally {
		if (onFinally) await onFinally();
	}
};
export default callApiMock;
