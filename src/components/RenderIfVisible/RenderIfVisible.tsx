import React, { useState, useRef, useEffect } from "react";

interface Props {
	defaultHeight?: number;
	visibleOffset?: number;
	children: React.ReactNode;
	stayRendered?: boolean;
	root?: HTMLElement | null;
}

const RenderIfVisible = ({
	defaultHeight = 300,
	visibleOffset = 400,
	children,
	stayRendered = false,
	root = null,
}: Props) => {
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const placeholderHeight = useRef<number>(defaultHeight);
	const intersectionRef = useRef<HTMLDivElement>(null);

	// Set visibility with intersection observer
	useEffect(() => {
		if (!intersectionRef.current) return;

		const localRef = intersectionRef.current;
		const observer = new IntersectionObserver(
			entries => {
				// Before switching off `isVisible`, set the height of the placeholder
				if (!entries[0].isIntersecting) {
					placeholderHeight.current = localRef.offsetHeight;
				}
				if (window.requestIdleCallback) {
					window.requestIdleCallback(
						() => setIsVisible(entries[0].isIntersecting),
						{
							timeout: 300,
						},
					);
				} else {
					setIsVisible(entries[0].isIntersecting);
				}
			},
			{
				root,
				rootMargin: `${visibleOffset}px 0px`,
				threshold: 0.15,
			},
		);

		observer.observe(localRef);
		return () => observer.unobserve(localRef);
	});

	return (
		<div style={{ width: "100%" }} ref={intersectionRef}>
			{isVisible || stayRendered ? (
				children
			) : (
				<div
					style={{ height: placeholderHeight.current }}
					tabIndex={0}></div>
			)}
		</div>
	);
};

export default RenderIfVisible;
