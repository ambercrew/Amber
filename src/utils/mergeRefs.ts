import { ForwardedRef } from "react";

export default function mergeRefs<T>(...refs: ForwardedRef<T>[]) {
	return (node: T | null) => {
		refs.forEach(ref => {
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		});
	};
}
