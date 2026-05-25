import "@fontsource-variable/noto-sans";
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import App from "./features/App/components/App.tsx";
import { BrowserRouter } from "react-router";
import { setupStore } from "./stores/store.ts";
import DefaultDragDropProvider from "./components/DefaultDragDropProvider/DefaultDragDropProvider.tsx";
import { warn, debug, trace, info, error } from "@tauri-apps/plugin-log";

function forwardConsole(
	fnName: "log" | "debug" | "info" | "warn" | "error",
	logger: (message: string) => Promise<void>,
) {
	const original = console[fnName];
	console[fnName] = message => {
		original(message);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-floating-promises
		logger(message);
	};
}

forwardConsole("log", trace);
forwardConsole("debug", debug);
forwardConsole("info", info);
forwardConsole("warn", warn);
forwardConsole("error", error);

const store = setupStore();
createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Provider store={store}>
			<BrowserRouter>
				<DefaultDragDropProvider>
					<App />
				</DefaultDragDropProvider>
			</BrowserRouter>
		</Provider>
	</React.StrictMode>,
);
