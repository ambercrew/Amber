import { useState } from "react";
import useApi from "../../../../hooks/useApi";
import { Readability } from "@mozilla/readability";
import { mdiImport } from "@mdi/js";
import { Icon } from "@mdi/react";
import Spinner from "../../../../components/Spinner/Spinner";
import styles from "./styles.module.css";
import { fetch } from "@tauri-apps/plugin-http";
import IncrementalReading, {
	IncrementalReadingSource,
} from "../../../../api/cells/valueObjects/incrementalReading";
import EditableCellInput from "../EditableCellInput";
import Select from "../../../../components/Select/Select";

const SOURCE_TYPE_OPTIONS = [{ label: "Website", value: "url" }];

// Attributes commonly used by lazy-loading scripts to stash the real image
// URL until JS runs. Ordered by preference.
const LAZY_SRC_ATTRS = [
	"data-src",
	"data-delayed-url",
	"data-lazy-src",
	"data-original",
	"data-url",
	"data-hi-res-src",
];
const LAZY_SRCSET_ATTRS = ["data-srcset", "data-lazy-srcset"];

/**
 * Promotes lazy-loaded image URLs (held in data-* attributes of the
 * server-rendered HTML) into real src/srcset attributes, so Readability keeps
 * the images instead of dropping those without a usable src.
 */
function hydrateLazyImages(doc: Document) {
	doc.querySelectorAll("img").forEach(img => {
		if (!img.getAttribute("src")) {
			const lazySrc = LAZY_SRC_ATTRS.map(a => img.getAttribute(a)).find(
				Boolean,
			);
			if (lazySrc) img.setAttribute("src", lazySrc);
		}

		if (!img.getAttribute("srcset")) {
			const lazySrcset = LAZY_SRCSET_ATTRS.map(a =>
				img.getAttribute(a),
			).find(Boolean);
			if (lazySrcset) img.setAttribute("srcset", lazySrcset);
		}
	});
}

interface Props {
	onImport: (newValue: IncrementalReading) => void;
	autofocus: boolean;
}

export default function ImportContainer({ autofocus, onImport }: Props) {
	const [sourceType, setSourceType] =
		useState<IncrementalReadingSource["type"]>("url");
	const [url, setUrl] = useState("");
	const { callApi, errorMessage, clearErrorMessage, isSendingRequest } =
		useApi();

	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		clearErrorMessage();

		if (isSendingRequest) return;

		void callApi(async () => {
			const response = await fetch(url);
			const html = await response.text();
			if (!response.status.toString().startsWith("2")) {
				throw new Error("Error: " + html);
			}
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");
			// Readability needs the URL to resolve relative links
			// Set the base URL via a <base> tag
			const base = doc.createElement("base");
			base.href = url;
			doc.head.prepend(base);

			// The fetched HTML is server-rendered, so lazy-loaded images
			// still hold their real URL in a data-* attribute. Promote it
			// to src before Readability runs, otherwise Readability drops
			// images that have no usable src.
			hydrateLazyImages(doc);

			const article = new Readability(doc).parse();

			onImport({
				title: article?.title ?? null,
				content: article?.content ?? null,
				priority: "normal",
				completed: false,
				source: {
					type: "url",
					url,
				},
			});
		});
	};

	return (
		<form className={styles.verticalForm} onSubmit={handleSubmit}>
			<div className={styles.field}>
				<label htmlFor="source-type">Source type</label>
				<Select
					id="source-type"
					options={SOURCE_TYPE_OPTIONS}
					currentValue={sourceType}
					onChangeValue={v =>
						setSourceType(v as IncrementalReadingSource["type"])
					}
				/>
			</div>

			{sourceType === "url" && (
				<div className={styles.field}>
					<label htmlFor="source-url">Website address</label>
					<EditableCellInput
						id="source-url"
						type="text"
						placeholder="Enter URL to import"
						value={url}
						onChange={e => setUrl(e.target.value)}
						autoFocus={autofocus}
						required
					/>
				</div>
			)}

			{errorMessage && (
				<p className={styles.errorMessage}>{errorMessage}</p>
			)}

			<button
				className={`primary ${styles.rowButton}`}
				disabled={isSendingRequest}>
				{!isSendingRequest && (
					<>
						<Icon path={mdiImport} size={1} />
						<span>Import</span>
					</>
				)}
				{isSendingRequest && <Spinner size={0.5} />}
			</button>
		</form>
	);
}
