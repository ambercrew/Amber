import { hydrateLazyImages } from "../../../../features/Import/normalize/hydrateLazyImages";

function parse(html: string): Document {
	return new DOMParser().parseFromString(html, "text/html");
}

describe("hydrateLazyImages", () => {
	it("Should leave the src untouched when an image already has one", () => {
		// Arrange

		const doc = parse(
			'<img src="https://example.com/real.png" data-src="https://example.com/lazy.png">',
		);

		// Act

		hydrateLazyImages(doc);

		// Assert

		expect(doc.querySelector("img")?.getAttribute("src")).toBe(
			"https://example.com/real.png",
		);
	});

	it("Should promote data-src to src when src is missing", () => {
		// Arrange

		const doc = parse('<img data-src="https://example.com/lazy.png">');

		// Act

		hydrateLazyImages(doc);

		// Assert

		expect(doc.querySelector("img")?.getAttribute("src")).toBe(
			"https://example.com/lazy.png",
		);
	});

	it("Should prefer earlier attributes in the lazy attribute preference order", () => {
		// Arrange

		const doc = parse(
			'<img data-original="https://example.com/original.png" data-src="https://example.com/lazy.png">',
		);

		// Act

		hydrateLazyImages(doc);

		// Assert

		expect(doc.querySelector("img")?.getAttribute("src")).toBe(
			"https://example.com/lazy.png",
		);
	});

	it("Should promote the largest srcset candidate to src when no lazy src attribute is present", () => {
		// Arrange

		const doc = parse(
			'<img srcset="https://example.com/small.png 320w, https://example.com/large.png 1024w">',
		);

		// Act

		hydrateLazyImages(doc);

		// Assert

		expect(doc.querySelector("img")?.getAttribute("src")).toBe(
			"https://example.com/large.png",
		);
	});

	it("Should promote the largest data-srcset candidate to src", () => {
		// Arrange

		const doc = parse(
			'<img data-srcset="https://example.com/small.png 1x, https://example.com/large.png 2x">',
		);

		// Act

		hydrateLazyImages(doc);

		// Assert

		expect(doc.querySelector("img")?.getAttribute("src")).toBe(
			"https://example.com/large.png",
		);
	});

	it("Should leave src unset when no src, lazy attribute, or srcset is found", () => {
		// Arrange

		const doc = parse("<img>");

		// Act

		hydrateLazyImages(doc);

		// Assert

		expect(doc.querySelector("img")?.getAttribute("src")).toBeNull();
	});

	it("Should hydrate every image in the document", () => {
		// Arrange

		const doc = parse(
			'<img data-src="https://example.com/one.png"><img data-src="https://example.com/two.png">',
		);

		// Act

		hydrateLazyImages(doc);

		// Assert

		const [first, second] = doc.querySelectorAll("img");
		expect(first.getAttribute("src")).toBe("https://example.com/one.png");
		expect(second.getAttribute("src")).toBe("https://example.com/two.png");
	});
});
