import { invoke } from "@tauri-apps/api/core";
import { FetchedPageDto } from "../dto/fetchedPageDto";
import { FetchedImageDto } from "../dto/fetchedImageDto";

export function fetchPage(url: string): Promise<FetchedPageDto> {
	return invoke("fetch_page", { url });
}

export function fetchImage(
	url: string,
	referer: string | null,
): Promise<FetchedImageDto> {
	return invoke("fetch_image", { url, referer });
}
