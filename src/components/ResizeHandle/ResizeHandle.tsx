import { Box } from "@mantine/core";
import { useSplitter } from "@mantine/hooks";
import styles from "./ResizeHandle.module.css";

type SplitterHandleProps = ReturnType<
	ReturnType<typeof useSplitter>["getHandleProps"]
>;

interface ResizeHandleProps {
	/** Edge of the panel the handle is anchored to. */
	side: "left" | "right";
	/** Props from `splitter.getHandleProps({ index })`. */
	handleProps: SplitterHandleProps;
}

function ResizeHandle({ side, handleProps }: ResizeHandleProps) {
	return <Box {...handleProps} data-side={side} className={styles.handle} />;
}

export default ResizeHandle;
