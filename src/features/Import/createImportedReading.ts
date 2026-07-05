import { paths } from "../../paths";
import { createReadingAction } from "../../stores/elements/elementsActions";
import { ImportContext } from "./importContext";

export async function createImportedReading(
	ctx: ImportContext,
	name: string,
	content: string,
): Promise<void> {
	const id = crypto.randomUUID();
	await ctx.dispatch(
		createReadingAction({
			id,
			meta: { name, parent: ctx.parent },
			content,
		}),
	);
	await ctx.navigate(paths.element("reading", id));
}
