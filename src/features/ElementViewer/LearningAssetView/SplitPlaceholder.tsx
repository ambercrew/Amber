interface SplitPlaceholderProps {
	/** Reserved height (px) so scrolling past unmounted splits doesn't shift. */
	height: number;
}

/** Stand-in for an unmounted split: reserves its (measured or estimated) height. */
export default function SplitPlaceholder({ height }: SplitPlaceholderProps) {
	return <div style={{ height }} />;
}
