export interface PdfExtraction {
	title: string | null;
	html: string;
	pageCount: number;
}

export interface PdfProgress {
	done: number;
	total: number;
}

type WorkerResponse =
	| { id: number; progress: PdfProgress }
	| { id: number; result: PdfExtraction }
	| { id: number; error: string };

let worker: Worker | null = null;
let nextId = 0;

function getWorker(): Worker {
	worker ??= new Worker(new URL("./worker.ts", import.meta.url), {
		type: "module",
	});
	return worker;
}

/** The only module that imports `mupdf` — kept swappable given its
 * AGPL-3.0 license. Runs the extraction in a Web Worker since MuPDF's WASM
 * API is synchronous and CPU-bound. */
export function extractPdf(
	bytes: ArrayBuffer,
	onProgress?: (progress: PdfProgress) => void,
): Promise<PdfExtraction> {
	const id = nextId++;
	const w = getWorker();

	return new Promise((resolve, reject) => {
		function handleMessage(e: MessageEvent<WorkerResponse>) {
			const data = e.data;
			if (data.id !== id) return;

			if ("progress" in data) {
				onProgress?.(data.progress);
				return;
			}

			w.removeEventListener("message", handleMessage);
			if ("error" in data) reject(new Error(data.error));
			else resolve(data.result);
		}

		w.addEventListener("message", handleMessage);
		w.postMessage({ id, bytes }, [bytes]);
	});
}
