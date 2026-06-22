import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { Readability } from "@mozilla/readability";
import { fetch } from "@tauri-apps/plugin-http";
import ImportContainer from "../../../../../features/EditableCell/components/IncrementalReading/ImportContainer";
import IncrementalReading from "../../../../../api/cells/valueObjects/incrementalReading";
import { renderWithProviders } from "../../../../test-utils/renderWithProviders";

vi.mock("@tauri-apps/plugin-http", () => ({ fetch: vi.fn() }));
vi.mock("@mozilla/readability", () => ({ Readability: vi.fn() }));

describe("ImportContainer", () => {
	const URL = "https://example.com/article";

	const mockFetchResponse = (status: number, body: string) => {
		vi.mocked(fetch).mockResolvedValue({
			status,
			text: () => Promise.resolve(body),
		} as unknown as Response);
	};

	const mockParsedArticle = (
		article: { title: string | null; content: string | null } | null,
	) => {
		vi.mocked(Readability).mockImplementation(function (this: Readability) {
			this.parse = (() => article) as Readability["parse"];
			return this;
		} as unknown as () => Readability);
	};

	const typeUrlAndImport = async (
		user: ReturnType<typeof userEvent.setup>,
	) => {
		await user.type(
			screen.getByPlaceholderText("Enter URL to import"),
			URL,
		);
		await user.click(screen.getByRole("button", { name: "Import" }));
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("Should call onImport with the parsed article when fetch succeeds", async () => {
		// Arrange

		const user = userEvent.setup();
		const onImportMock = vi.fn<(value: IncrementalReading) => void>();
		mockFetchResponse(200, "<html><body>article</body></html>");
		mockParsedArticle({ title: "My title", content: "<p>content</p>" });

		renderWithProviders(
			<ImportContainer autofocus={false} onImport={onImportMock} />,
		);

		// Act

		await typeUrlAndImport(user);

		// Assert

		await waitFor(() => expect(onImportMock).toHaveBeenCalled());
		expect(onImportMock).toHaveBeenCalledWith({
			title: "My title",
			content: "<p>content</p>",
			priority: "normal",
			completed: false,
			source: { type: "url", url: URL },
		});
	});

	it("Should call onImport with null title and content when the article cannot be parsed", async () => {
		// Arrange

		const user = userEvent.setup();
		const onImportMock = vi.fn<(value: IncrementalReading) => void>();
		mockFetchResponse(200, "<html><body>article</body></html>");
		mockParsedArticle(null);

		renderWithProviders(
			<ImportContainer autofocus={false} onImport={onImportMock} />,
		);

		// Act

		await typeUrlAndImport(user);

		// Assert

		await waitFor(() => expect(onImportMock).toHaveBeenCalled());
		expect(onImportMock).toHaveBeenCalledWith(
			expect.objectContaining({ title: null, content: null }),
		);
	});

	it("Should show an error message and not call onImport when the response is not successful", async () => {
		// Arrange

		const user = userEvent.setup();
		const onImportMock = vi.fn<(value: IncrementalReading) => void>();
		mockFetchResponse(404, "Not found");

		renderWithProviders(
			<ImportContainer autofocus={false} onImport={onImportMock} />,
		);

		// Act

		await typeUrlAndImport(user);

		// Assert

		expect(await screen.findByText("Error: Not found")).toBeInTheDocument();
		expect(onImportMock).not.toHaveBeenCalled();
	});

	it("Should show an error message when fetch rejects", async () => {
		// Arrange

		const user = userEvent.setup();
		const onImportMock = vi.fn<(value: IncrementalReading) => void>();
		vi.mocked(fetch).mockRejectedValue(new Error("Network down"));

		renderWithProviders(
			<ImportContainer autofocus={false} onImport={onImportMock} />,
		);

		// Act

		await typeUrlAndImport(user);

		// Assert

		expect(await screen.findByText("Network down")).toBeInTheDocument();
		expect(onImportMock).not.toHaveBeenCalled();
	});
});
