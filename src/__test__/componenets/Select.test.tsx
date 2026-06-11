import { screen } from "@testing-library/react";
import Select from "../../components/Select/Select";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import userEvent from "@testing-library/user-event";

vi.mock(import("../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

it("Should be able to change selection", async () => {
	// Arrange

	const onChangeValueFn = vi.fn();
	renderWithProviders(
		<Select
			options={[
				{
					label: "choice 1",
					value: "choice-1",
				},
				{
					label: "choice 2",
					value: "choice-2",
				},
				{
					label: "choice 3",
					value: "choice-3",
				},
			]}
			currentValue={"choice-2"}
			onChangeValue={onChangeValueFn}
		/>,
	);

	// Act

	// Asserting that options are not shown when not open.
	expect(await screen.findByText("choice 2")).not.toBeNull();
	expect(screen.queryByText("choice 3")).toBeNull();

	await userEvent.click(screen.getByText("choice 2"));
	await userEvent.click(screen.getByText("choice 3"));

	// Assert

	expect(onChangeValueFn).toHaveBeenCalledOnce();
	expect(onChangeValueFn).toHaveBeenCalledWith("choice-3");
});

it("Should hide options when escape is pressed", async () => {
	// Arrange

	const onChangeValueFn = vi.fn();
	renderWithProviders(
		<Select
			options={[
				{
					label: "choice 1",
					value: "choice-1",
				},
				{
					label: "choice 2",
					value: "choice-2",
				},
				{
					label: "choice 3",
					value: "choice-3",
				},
			]}
			currentValue={"choice-2"}
			onChangeValue={onChangeValueFn}
		/>,
	);

	// Act

	await userEvent.click(screen.getByText("choice 2"));
	expect(screen.queryByText("choice 3")).not.toBeNull();
	await userEvent.keyboard("{Escape}");

	// Assert

	expect(screen.queryByText("choice 3")).toBeNull();
});

it("Should focus back on the dropdown when the options are hidden", async () => {
	// Arrange

	const onChangeValueFn = vi.fn();
	renderWithProviders(
		<Select
			options={[
				{
					label: "choice 1",
					value: "choice-1",
				},
				{
					label: "choice 2",
					value: "choice-2",
				},
				{
					label: "choice 3",
					value: "choice-3",
				},
			]}
			currentValue={"choice-2"}
			onChangeValue={onChangeValueFn}
		/>,
	);

	// Act

	await userEvent.click(screen.getByText("choice 2"));
	expect(document.activeElement?.classList).not.toContain("select");
	await userEvent.keyboard("{Escape}");

	// Assert

	expect(document.activeElement?.classList).toContain("select");
});

it("Should be able to navigate using arrows", async () => {
	// Arrange

	const onChangeValueFn = vi.fn();
	renderWithProviders(
		<Select
			options={[
				{
					label: "choice 1",
					value: "choice-1",
				},
				{
					label: "choice 2",
					value: "choice-2",
				},
				{
					label: "choice 3",
					value: "choice-3",
				},
			]}
			currentValue={"choice-2"}
			onChangeValue={onChangeValueFn}
		/>,
	);

	const event = new KeyboardEvent("keydown", {
		key: "ArrowDown",
		bubbles: true,
	});
	const preventDefaultSpy = vi.spyOn(event, "preventDefault");

	// Act

	await userEvent.click(screen.getByText("choice 2"));
	screen.getByText("choice 3").dispatchEvent(event);
	screen.getByText("choice 3").dispatchEvent(event);
	await userEvent.keyboard("{Enter}");

	// Assert

	expect(onChangeValueFn).toHaveBeenCalledOnce();
	expect(onChangeValueFn).toHaveBeenCalledWith("choice-1");

	// Asserting that scrolling was not called.
	expect(preventDefaultSpy).toHaveBeenCalledTimes(2);
});
