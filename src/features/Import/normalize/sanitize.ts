import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"ul",
	"ol",
	"li",
	"blockquote",
	"pre",
	"code",
	"a",
	"strong",
	"b",
	"em",
	"i",
	"u",
	"s",
	"img",
	"hr",
	"br",
	"table",
	"thead",
	"tbody",
	"tr",
	"td",
	"th",
];

const ALLOWED_ATTR = ["href", "src", "alt"];

// Also allows relative/protocol-relative URLs (no scheme, or starting with
// "/" or "//") so that normalize() gets a chance to resolve them against the
// baseUrl — DOMPurify would otherwise strip them outright.
const ALLOWED_URI_REGEXP =
	/^(?:https?:|data:image\/|[^a-z]|[a-z\d+.-]+(?:[^a-z\d+.\-:]|$))/i;

export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOWED_URI_REGEXP,
		KEEP_CONTENT: true,
	});
}
