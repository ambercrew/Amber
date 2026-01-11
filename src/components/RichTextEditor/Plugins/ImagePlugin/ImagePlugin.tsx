import { useEffect } from "react";
import {
	$getSelection,
	$isRangeSelection,
	PASTE_COMMAND,
	COMMAND_PRIORITY_HIGH,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { $createImageNode } from "./ImageNode";
import { QUALITY_THRESHOLD_IN_PIXELS_WHEN_PASTING } from "../../constants";

export function ImagePlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerCommand(
			PASTE_COMMAND,
			(e: ClipboardEvent) => {
				let anyImage = false;
				for (const item of e.clipboardData?.items ?? []) {
					if (item.type.startsWith("image/")) {
						anyImage = true;
					}
				}
				for (const file of e.clipboardData?.files ?? []) {
					if (file.type.startsWith("image/")) {
						anyImage = true;
					}
				}

				if (!anyImage) return false;

				readImage()
					.then(async img => {
						const rgba = await img.rgba();
						const size = await img.size();

						// Create a canvas and draw the RGBA data.
						const canvas = document.createElement("canvas");
						canvas.width = size.width;
						canvas.height = size.height;
						const ctx = canvas.getContext("2d")!;

						// Create ImageData from RGBA buffer.
						const imageData = new ImageData(
							new Uint8ClampedArray(rgba),
							size.width,
							size.height,
						);

						ctx.putImageData(imageData, 0, 0);

						// Choosing quality for the image for compression.
						let quality =
							QUALITY_THRESHOLD_IN_PIXELS_WHEN_PASTING /
							Math.max(size.width, size.height);
						quality = Math.min(quality, 1);

						// Convert canvas to base64.
						const base64data = canvas.toDataURL(
							"image/jpeg",
							quality,
						);

						editor.update(() => {
							const selection = $getSelection();
							if ($isRangeSelection(selection)) {
								const imageNode = $createImageNode({
									src: base64data,
									width: size.width,
									height: size.height,
								});
								selection.insertNodes([imageNode]);
							}
						});
					})
					.catch(() => {
						/* No need to do anything on error, since they only fire when the content is not an image. */
					});

				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	return null;
}
