import { sanitizeHtml } from "./sanitize";
import { localizeImage } from "../images/localize";

export interface NormalizeOptions {
	/** Used to resolve relative image URLs and as the Referer header when
	 * fetching them. Absolute image URLs work regardless. */
	baseUrl: string | null;
}

/** Sanitizes HTML and localizes its images. The result is stored directly as
 * a Reading's content — the editor already knows how to load HTML. */
export async function normalize(
	html: string,
	opts: NormalizeOptions,
): Promise<string> {
	const sanitized = sanitizeHtml(html);
	const doc = new DOMParser().parseFromString(sanitized, "text/html");
	const images = Array.from(doc.querySelectorAll("img[src]"));

	const absoluteByAttr = new Map<string, string>();
	const uniqueUrls = new Set<string>();

	for (const img of images) {
		const src = img.getAttribute("src");
		if (!src) continue;

		const absolute = resolveUrl(src, opts.baseUrl);
		if (absolute === null) {
			img.removeAttribute("src");
			continue;
		}

		absoluteByAttr.set(src, absolute);
		uniqueUrls.add(absolute);
	}

	const localizedByUrl = new Map(
		await Promise.all(
			[...uniqueUrls].map(
				async url =>
					[url, await localizeImage(url, opts.baseUrl)] as const,
			),
		),
	);

	for (const img of images) {
		const src = img.getAttribute("src");
		if (!src) continue;

		const absolute = absoluteByAttr.get(src);
		if (!absolute) continue;

		const result = localizedByUrl.get(absolute);
		if (!result) continue;

		if (result.ok) {
			img.setAttribute("src", result.src);
		} else {
			img.setAttribute("src", result.originalUrl);
			img.setAttribute("data-broken-asset", "true");
		}
	}

	return doc.body.innerHTML;
}

function resolveUrl(src: string, baseUrl: string | null): string | null {
	if (src.startsWith("data:")) return src;
	try {
		return new URL(src, baseUrl ?? undefined).href;
	} catch {
		return null;
	}
}
