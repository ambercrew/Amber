import { fetchImage } from "../../../api/import/api/importApi";

export type LocalizedImage =
	{ ok: true; src: string } | { ok: false; originalUrl: string };

const MAX_DATA_URI_BYTES = 10 * 1024 * 1024;

/** The only module that knows how imported images are stored — swap this to
 * write into a content-addressed file store instead of inlining data URIs. */
export async function localizeImage(
	absoluteUrl: string,
	referer: string | null,
): Promise<LocalizedImage> {
	if (absoluteUrl.startsWith("data:")) {
		if (absoluteUrl.startsWith("data:image/svg+xml")) {
			return { ok: false, originalUrl: absoluteUrl };
		}
		return { ok: true, src: absoluteUrl };
	}

	try {
		const { mime, bytesBase64 } = await fetchImage(absoluteUrl, referer);

		if (mime === "image/svg+xml") {
			return { ok: false, originalUrl: absoluteUrl };
		}

		const approxBytes = (bytesBase64.length * 3) / 4;
		if (approxBytes > MAX_DATA_URI_BYTES) {
			return { ok: false, originalUrl: absoluteUrl };
		}

		return { ok: true, src: `data:${mime};base64,${bytesBase64}` };
	} catch {
		return { ok: false, originalUrl: absoluteUrl };
	}
}
