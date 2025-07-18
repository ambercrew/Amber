import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./stores/store.ts";
import App from "./app/App.tsx";
import { BrowserRouter } from "react-router";

createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Provider store={store}>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</Provider>
	</React.StrictMode>,
);
