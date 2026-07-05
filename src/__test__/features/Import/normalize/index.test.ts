import { normalize } from "../../../../features/Import/normalize";
import { localizeImage } from "../../../../features/Import/images/localize";

vi.mock(import("../../../../features/Import/images/localize"));

describe("normalize", () => {
	it("Should sanitize the html and return the body's innerHTML", async () => {
		// Arrange

		vi.mocked(localizeImage).mockResolvedValue({
			ok: false,
			originalUrl: "unused",
		});

		// Act

		const actual = await normalize("<script>bad()</script><p>kept</p>", {
			baseUrl: null,
		});

		// Assert

		expect(actual).toBe("<p>kept</p>");
	});

	it("Should replace an image src with the localized src when localization succeeds", async () => {
		// Arrange

		vi.mocked(localizeImage).mockResolvedValue({
			ok: true,
			src: "data:image/png;base64,AAAA",
		});
		const html = '<img src="https://example.com/a.png">';

		// Act

		const actual = await normalize(html, { baseUrl: null });

		// Assert

		expect(actual).toBe('<img src="data:image/png;base64,AAAA">');
	});

	it("Should mark the image as broken and keep the original url when localization fails", async () => {
		// Arrange

		vi.mocked(localizeImage).mockResolvedValue({
			ok: false,
			originalUrl: "https://example.com/a.png",
		});
		const html = '<img src="https://example.com/a.png">';

		// Act

		const actual = await normalize(html, { baseUrl: null });

		// Assert

		expect(actual).toBe(
			'<img src="https://example.com/a.png" data-broken-asset="true">',
		);
	});

	it("Should resolve a relative image url against the baseUrl before localizing", async () => {
		// Arrange

		vi.mocked(localizeImage).mockResolvedValue({
			ok: true,
			src: "data:image/png;base64,AAAA",
		});
		const html = '<img src="/images/a.png">';

		// Act

		await normalize(html, { baseUrl: "https://example.com/article" });

		// Assert

		expect(localizeImage).toHaveBeenCalledWith(
			"https://example.com/images/a.png",
			"https://example.com/article",
		);
	});

	it("Should remove the src when the image url cannot be resolved and there is no baseUrl", async () => {
		// Arrange

		const html = '<img src="/images/a.png">';

		// Act

		const actual = await normalize(html, { baseUrl: null });

		// Assert

		expect(actual).toBe("<img>");
		expect(localizeImage).not.toHaveBeenCalled();
	});

	it("Should only localize each unique image url once", async () => {
		// Arrange

		vi.mocked(localizeImage).mockResolvedValue({
			ok: true,
			src: "data:image/png;base64,AAAA",
		});
		const html =
			'<img src="https://example.com/a.png"><img src="https://example.com/a.png">';

		// Act

		await normalize(html, { baseUrl: null });

		// Assert

		expect(localizeImage).toHaveBeenCalledTimes(1);
	});

	it("Should localize a data uri src using the uri itself as the absolute url", async () => {
		// Arrange

		vi.mocked(localizeImage).mockResolvedValue({
			ok: true,
			src: "data:image/png;base64,AAAA",
		});
		const html = '<img src="data:image/png;base64,AAAA">';

		// Act

		const actual = await normalize(html, { baseUrl: null });

		// Assert

		expect(localizeImage).toHaveBeenCalledWith(
			"data:image/png;base64,AAAA",
			null,
		);
		expect(actual).toBe('<img src="data:image/png;base64,AAAA">');
	});
});
