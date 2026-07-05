import * as mupdf from "mupdf";

interface WorkerRequest {
	id: number;
	bytes: ArrayBuffer;
}

type WorkerResponse =
	| { id: number; progress: { done: number; total: number } }
	| {
			id: number;
			result: { title: string | null; html: string; pageCount: number };
	  }
	| { id: number; error: string };

const ctx = self as unknown as {
	onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
	postMessage: (message: WorkerResponse) => void;
};

ctx.onmessage = e => {
	const { id, bytes } = e.data;

	try {
		const doc = mupdf.Document.openDocument(bytes, "application/pdf");
		const pageCount = doc.countPages();
		let html = "";
		let sawText = false;

		for (let i = 0; i < pageCount; i++) {
			const page = doc.loadPage(i);
			const structuredText = page.toStructuredText("preserve-images");
			const pageHtml = structuredText.asHTML(i);

			if (!sawText && /<p[\s>]/.test(pageHtml)) sawText = true;
			html += pageHtml;

			structuredText.destroy();
			page.destroy();
			ctx.postMessage({
				id,
				progress: { done: i + 1, total: pageCount },
			});
		}

		const title = doc.getMetaData("info:Title") ?? null;
		doc.destroy();

		if (!sawText) {
			ctx.postMessage({ id, error: "no-text-layer" });
			return;
		}

		ctx.postMessage({ id, result: { title, html, pageCount } });
	} catch (err) {
		ctx.postMessage({ id, error: String(err) });
	}
};
