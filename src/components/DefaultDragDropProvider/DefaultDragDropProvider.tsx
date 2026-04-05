import { DragDropProvider } from "@dnd-kit/react";
import {
	Feedback,
	PointerActivationConstraints,
	PointerSensor,
} from "@dnd-kit/dom";
import { isMobile } from "../../utils/tauriUtils";

export type DragDropProviderProps = React.ComponentProps<
	typeof DragDropProvider
>;

export default function DefaultDragDropProvider({
	plugins,
	...rest
}: DragDropProviderProps) {
	const sensorActivationConstraint = isMobile()
		? new PointerActivationConstraints.Delay({ value: 200, tolerance: 10 })
		: new PointerActivationConstraints.Distance({ value: 5 });

	return (
		<DragDropProvider
			plugins={defaults => [
				...defaults,
				...(typeof plugins === "function"
					? plugins(defaults)
					: (plugins ?? defaults)),
				Feedback.configure({ dropAnimation: null }),
			]}
			sensors={[
				PointerSensor.configure({
					activationConstraints: [sensorActivationConstraint],
				}),
			]}
			{...rest}
		/>
	);
}
