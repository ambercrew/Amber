import { DragDropProvider, useDroppable, useDraggable } from "@dnd-kit/react";
import { DragDropProviderProps } from "../../components/DefaultDragDropProvider/DefaultDragDropProvider";

type useDroppableReturnType = ReturnType<typeof useDroppable>;
type useDraggableReturnType = ReturnType<typeof useDraggable>;

export function mockDndKit() {
	return {
		...mockDragDropProvider(),
		...mockUseDraggable(),
		...mockUseDroppable(),
	};
}

export function mockDragDropProvider() {
	const capturedProps: DragDropProviderProps[] = [];

	vi.mocked(DragDropProvider).mockImplementation(props => {
		capturedProps.push(props);
		return <>{props.children}</>;
	});

	return {
		getCapturedProviderProps: () => capturedProps,
	};
}

export function mockUseDraggable(
	returnValue: Partial<useDraggableReturnType> = {},
) {
	const capturedInput: Parameters<typeof useDraggable>[0][] = [];

	vi.mocked(useDraggable).mockImplementation(input => {
		capturedInput.push(input);
		return {
			isDragging: false,
			handleRef: vi.fn(),
			ref: vi.fn(),
			...returnValue,
		} as unknown as useDraggableReturnType;
	});

	return {
		getUseDraggableInputs: () => capturedInput,
	};
}

export function mockUseDroppable(
	returnValue: Partial<useDroppableReturnType> = {},
) {
	const capturedInput: Parameters<typeof useDroppable>[0][] = [];

	vi.mocked(useDroppable).mockImplementation(input => {
		capturedInput.push(input);
		return {
			ref: vi.fn(),
			...returnValue,
		} as unknown as useDroppableReturnType;
	});

	return {
		getUseDroppableInputs: () => capturedInput,
	};
}
