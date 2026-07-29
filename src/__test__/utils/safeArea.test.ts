import { safeAreaTopStyle, SAFE_AREA_TOP } from "../../utils/safeArea";
import { isMobile } from "../../utils/tauriUtils";

vi.mock(import("../../utils/tauriUtils"));

describe("safeAreaTopStyle", () => {
	it("Should pad the top when running on mobile", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(true);

		// Act

		const actual = safeAreaTopStyle();

		// Assert

		expect(actual).toEqual({ paddingTop: SAFE_AREA_TOP });
	});

	it("Should return no style when running on desktop", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(false);

		// Act

		const actual = safeAreaTopStyle();

		// Assert

		expect(actual).toBeUndefined();
	});
});
