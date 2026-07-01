import { createBrowserRouter } from "react-router";
import App from "./features/App/components/App";
import ElementEditor from "./features/ElementEditor/ElementEditor";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		children: [
			{
				path: ":type/:id",
				element: <ElementEditor />,
			},
		],
	},
]);
