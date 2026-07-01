import { createBrowserRouter } from "react-router";
import App from "./features/App/components/App";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		children: [
			{
				path: ":type/:id",
				element: <></>,
			},
		],
	},
]);
