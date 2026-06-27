import "@fontsource-variable/noto-sans";
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import App from "./features/App/components/App.tsx";
import { BrowserRouter } from "react-router";
import { setupStore } from "./stores/store.ts";
import { warn, debug, trace, info, error } from "@tauri-apps/plugin-log";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import theme from "./theme.ts";

function forwardConsole(
	fnName: "log" | "debug" | "info" | "warn" | "error",
	logger: (message: string) => Promise<void>,
) {
	const original = console[fnName];
	console[fnName] = (...data: unknown[]) => {
		original(...data);
		const message = data
			.map(arg =>
				typeof arg === "string"
					? arg
					: (JSON.stringify(arg) ?? String(arg)),
			)
			.join(" ");
		void logger(message);
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
			<MantineProvider theme={theme}>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</MantineProvider>
		</Provider>
	</React.StrictMode>,
);
