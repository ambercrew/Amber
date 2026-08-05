import { htmlToLexicalJson } from "../../components/Editor/lexicalJsonConversion";
import { paths } from "../../paths";
import { createReadingAction } from "../../stores/elements/elementsActions";
import { ImportContext } from "./importContext";
import { splitContent } from "./splitContent";

export async function createImportedReading(
	ctx: ImportContext,
	name: string,
	content: string,
	bibliographicalSourceId?: string | null,
): Promise<void> {
	const id = crypto.randomUUID();
	await ctx.dispatch(
		createReadingAction({
			id,
			meta: {
				name,
				parent: ctx.parent,
				origin: { type: "custom", bibliographicalSourceId },
			},
			splits: splitContent(content).map(html => htmlToLexicalJson(html)),
		}),
	);
	await ctx.navigate(paths.element("reading", id));
}
