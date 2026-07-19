import { extractPdf as invokeExtractPdf } from "../../../api/import/api/importApi";

export interface PdfExtraction {
	title: string | null;
	html: string;
	pageCount: number;
}

export interface PdfProgress {
	done: number;
	total: number;
}

const BASE64_CHUNK_SIZE = 0x8000;

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
		binary += String.fromCharCode(
			...bytes.subarray(i, i + BASE64_CHUNK_SIZE),
		);
	}
	return btoa(binary);
}

export async function extractPdf(
	bytes: ArrayBuffer,
	onProgress?: (progress: PdfProgress) => void,
): Promise<PdfExtraction> {
	const bytesBase64 = bytesToBase64(new Uint8Array(bytes));
	return invokeExtractPdf(bytesBase64, onProgress);
}
