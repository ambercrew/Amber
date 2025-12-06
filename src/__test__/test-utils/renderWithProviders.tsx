import React, { JSX, PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { AppStore, RootState, setupStore } from "../../stores/store";
import { createMemoryHistory } from "history";
import { Router } from "react-router";

interface IExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
	preloadedState?: Partial<RootState>;
	store?: AppStore;
}

/** A helper function for rendering that sets the default store used in the app,
 * additionally it adds a React Router.
 */
export function renderWithProviders(
	ui: React.ReactElement,
	{
		preloadedState = {},
		store = setupStore(preloadedState),
		...renderOptions
	}: IExtendedRenderOptions = {},
) {
	const history = createMemoryHistory();
	function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
		return (
			<Router location={history.location} navigator={history}>
				<Provider store={store}>{children}</Provider>
			</Router>
		);
	}
	return {
		store,
		history,
		...render(ui, { wrapper: Wrapper, ...renderOptions }),
	};
}
