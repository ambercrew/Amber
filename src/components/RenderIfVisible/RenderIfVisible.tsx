import React, { useState, useRef, useEffect, RefObject } from "react";

interface Props {
	defaultHeight?: number;
	visibleOffset?: number;
	children: React.ReactNode;
	stayRendered?: boolean;
	root?: RefObject<HTMLElement | null>;
}

export default function RenderIfVisible({
	defaultHeight = 250,
	visibleOffset = 300,
	children,
	stayRendered = false,
	root,
}: Props) {
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const [placeholderHeight, setPlaceholderHeight] = useState(defaultHeight);
	const intersectionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// We are not returning here if the component is visible just to update
		// placeholder height.
		if (!intersectionRef.current) return;

		const localRef = intersectionRef.current;
		const observer = new IntersectionObserver(
			entries => {
				// Before switching off `isVisible`, set the height of the placeholder
				if (!entries[0].isIntersecting) {
					setPlaceholderHeight(localRef.offsetHeight);
				}
				if (window.requestIdleCallback) {
					window.requestIdleCallback(
						() => setIsVisible(entries[0].isIntersecting),
						{
							timeout: 130,
						},
					);
				} else {
					setIsVisible(entries[0].isIntersecting);
				}
			},
			{
				root: root?.current,
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
				<div style={{ height: placeholderHeight }} tabIndex={0}></div>
			)}
		</div>
	);
}
