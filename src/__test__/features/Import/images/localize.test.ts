import { localizeImage } from "../../../../features/Import/images/localize";
import { fetchImage } from "../../../../api/import/api/importApi";

vi.mock(import("../../../../api/import/api/importApi"));

describe("localizeImage", () => {
	it("Should return the data uri as-is when it is already a non-svg data uri", async () => {
		// Arrange

		const url = "data:image/png;base64,AAAA";

		// Act

		const actual = await localizeImage(url, null);

		// Assert

		expect(actual).toEqual({ ok: true, src: url });
		expect(fetchImage).not.toHaveBeenCalled();
	});

	it("Should reject a data:image/svg+xml uri", async () => {
		// Arrange

		const url = "data:image/svg+xml;base64,AAAA";

		// Act

		const actual = await localizeImage(url, null);

		// Assert

		expect(actual).toEqual({ ok: false, originalUrl: url });
		expect(fetchImage).not.toHaveBeenCalled();
	});

	it("Should fetch and inline the image as a data uri when fetching succeeds", async () => {
		// Arrange

		vi.mocked(fetchImage).mockResolvedValue({
			mime: "image/png",
			bytesBase64: "AAAA",
		});
		const url = "https://example.com/a.png";

		// Act

		const actual = await localizeImage(url, "https://example.com");

		// Assert

		expect(fetchImage).toHaveBeenCalledWith(url, "https://example.com");
		expect(actual).toEqual({
			ok: true,
			src: "data:image/png;base64,AAAA",
		});
	});

	it("Should reject when the fetched image is an svg", async () => {
		// Arrange

		vi.mocked(fetchImage).mockResolvedValue({
			mime: "image/svg+xml",
			bytesBase64: "AAAA",
		});
		const url = "https://example.com/a.svg";

		// Act

		const actual = await localizeImage(url, null);

		// Assert

		expect(actual).toEqual({ ok: false, originalUrl: url });
	});

	it("Should reject when the fetched image exceeds the max data uri size", async () => {
		// Arrange

		const hugeBase64 = "A".repeat(15 * 1024 * 1024);
		vi.mocked(fetchImage).mockResolvedValue({
			mime: "image/png",
			bytesBase64: hugeBase64,
		});
		const url = "https://example.com/big.png";

		// Act

		const actual = await localizeImage(url, null);

		// Assert

		expect(actual).toEqual({ ok: false, originalUrl: url });
	});

	it("Should reject when fetching the image throws", async () => {
		// Arrange

		vi.mocked(fetchImage).mockRejectedValue(new Error("network error"));
		const url = "https://example.com/a.png";

		// Act

		const actual = await localizeImage(url, null);

		// Assert

		expect(actual).toEqual({ ok: false, originalUrl: url });
	});
});
