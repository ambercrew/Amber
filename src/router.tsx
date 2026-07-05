import { createBrowserRouter } from "react-router";
import App from "./features/App/components/App";
import ElementViewer from "./features/ElementViewer/ElementViewer";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		children: [
			{
				index: true,
				element: <ElementViewer />,
			},
			{
				path: ":type/:id",
				element: <ElementViewer />,
			},
		],
	},
]);
