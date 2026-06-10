import React, { forwardRef, HTMLAttributes } from "react";
import useBackButtonPress from "../../hooks/useBackButtonPress";
import useFocusRestore from "../../hooks/useFocusRestore";

const noop = () => {
	/* empty */
};

interface Props extends HTMLAttributes<HTMLDivElement> {
	onHide?: () => void;
	children: React.ReactNode;
}

const Popover = forwardRef<HTMLDivElement, Props>(function Popover(
	{ onHide, className, children, onKeyUp, ...rest },
	ref,
) {
	useFocusRestore();
	useBackButtonPress(onHide ?? noop);

	const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape") onHide?.();
		onKeyUp?.(e);
	};

	return (
		<div
			ref={ref}
			className={className ? `pop-over ${className}` : "pop-over"}
			onKeyUp={handleKeyUp}
			{...rest}>
			{children}
		</div>
	);
});

export default Popover;
