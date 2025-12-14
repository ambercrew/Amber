import userEvent from "@testing-library/user-event";
import FileTree from "../../../../features/FileTree/components/FileTree";
import UiFolder from "../../../../types/ui/uiFolder";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { fireEvent, screen } from "@testing-library/react";
import { ROOT_FOLDER_ID } from "../../../../config/constants";
import {
	createFile,
	createFolder,
	deleteFile,
	deleteFolder,
	getReviewTreeFolderForRoot,
	moveFolder,
	renameFolder,
} from "../../../../api/fileSystemApi.ts";
import UiFile from "../../../../types/ui/uiFile.ts";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
	dragFormatForFolder,
	jsonFileFilter,
} from "../../../../features/FileTree/config/constants.ts";
import {
	exportFile,
	exportFolder,
	importExportedItem,
} from "../../../../api/exportImportApi.ts";
import { act } from "react";
import fileTreeStyles from "../../../../features/FileTree/components/styles.module.css";

vi.mock(import("../../../../api/fileSystemApi.ts"));
vi.mock(import("../../../../api/exportImportApi.ts"));
vi.mock(import("@tauri-apps/plugin-dialog"));

function createTestFolder(name: string, id: string): UiFolder {
	return {
		id,
		isVisible: true,
		name,
		files: [],
		subfolders: [],
		repetitionCounts: { new: 0, learning: 0, relearning: 0, review: 0 },
	};
}

function createTestFile(name: string, id: string): UiFile {
	return {
		id,
		isVisible: true,
		name,
		repetitionCounts: { new: 0, learning: 0, relearning: 0, review: 0 },
	};
}

describe("FileTree", () => {
	it("Should delete folder when pressing DEL", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		root.subfolders[0].files.push(createTestFile("test file", "2"));

		renderWithProviders(<FileTree folder={root} />);

		// Act

		// Focusing on file inside folder.
		await userEvent.click(screen.getByText("test"));
		await userEvent.click(screen.getByText("test file"));
		// Focusing on folder.
		await userEvent.click(screen.getByText("test"));
		// Deleting the folder.
		await userEvent.keyboard("{Delete}");
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(vi.mocked(deleteFolder)).toBeCalledWith("1");
		expect(screen.getByTestId("location-display")).toHaveTextContent(
			"/home",
		);
	});

	it("Should delete file when pressing DEL", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.files.push(createTestFile("test", "1"));

		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getByText("test"));
		await userEvent.keyboard("{Delete}");
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(vi.mocked(deleteFile)).toBeCalledWith("1");
		expect(screen.getByTestId("location-display")).toHaveTextContent(
			"/home",
		);
	});
});

describe("FileTreeItem", () => {
	beforeEach(() => {
		// The file tree uses local storage to remember which folders were open,
		// which could make some trouble while testing.
		localStorage.clear();
	});

	it("Should be able create new folder using context menu", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.pointer({
			target: screen.getByText("Files"),
			keys: "[MouseRight>]",
		});
		await userEvent.click(screen.getByText("New Folder"));
		await userEvent.keyboard("test{Enter}");

		// Assert

		expect(vi.mocked(createFolder)).toBeCalledWith("test", ROOT_FOLDER_ID);
	});

	it("Should be able create new folder using shortcut", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getByText("Files"));
		await userEvent.keyboard("{Control>}{Shift>}n");
		await userEvent.keyboard("test{Enter}");

		// Assert

		expect(vi.mocked(createFolder)).toBeCalledWith("test", ROOT_FOLDER_ID);
	});

	it("Should be able create new file using shortcut", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getByText("Files"));
		await userEvent.keyboard("{Control>}n");
		await userEvent.keyboard("test{Enter}");

		// Assert

		expect(vi.mocked(createFile)).toBeCalledWith("test", ROOT_FOLDER_ID);
	});

	it("Should be able to rename using shortcut", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getByText("test"));
		await userEvent.keyboard("{F2}");
		await userEvent.keyboard("test new name{Enter}");

		// Assert

		expect(vi.mocked(renameFolder)).toBeCalledWith("1", "test new name");
	});

	it("Should be able create new file by text shown on an empty folder", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));

		renderWithProviders(<FileTree folder={root} />);

		// Act

		// Expanding the folder.
		await userEvent.click(screen.getByText("test"));
		// Creating the file.
		await userEvent.click(screen.getByText("create a file"));
		await userEvent.keyboard("test file{Enter}");

		// Assert

		expect(vi.mocked(createFile)).toBeCalledWith("test file", "1");
	});

	it("Should be able to continue writing the file name when the input is hidden then re-shown", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		// Writing first part then hiding the output.
		await userEvent.click(screen.getByText("create a file"));
		await userEvent.keyboard("test{Escape}");
		// Writing the rest.
		await userEvent.click(screen.getByText("create a file"));
		await userEvent.keyboard(" file{Enter}");

		// Assert

		expect(vi.mocked(createFile)).toBeCalledWith(
			"test file",
			ROOT_FOLDER_ID,
		);
	});

	it("Should hide sub-files when collapsed", () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		root.subfolders[0].files.push(createTestFile("test file", "2"));

		// Act

		renderWithProviders(<FileTree folder={root} />);

		// Assert

		expect(screen.queryByText("test file")).toBeNull();
	});

	it("Should be able to rename using actions menu", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getAllByTitle("Actions")[1]);
		await userEvent.click(screen.getByText("Rename"));
		await userEvent.keyboard("test new name{Enter}");

		// Assert

		expect(vi.mocked(renameFolder)).toBeCalledWith("1", "test new name");
	});

	it("Should be able to append more text to existing name when renaming", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getAllByTitle("Actions")[1]);
		await userEvent.click(screen.getByText("Rename"));
		await userEvent.keyboard("{ArrowRight} extra{Enter}");

		// Assert

		expect(vi.mocked(renameFolder)).toBeCalledWith("1", "test extra");
	});

	it("Should export folder using actions", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		vi.mocked(save).mockImplementation(options => {
			if (
				options!.filters![0] === jsonFileFilter &&
				options!.defaultPath === "test.json"
			) {
				return Promise.resolve("/usr/test/test.json");
			}
			return Promise.resolve(null);
		});

		// Act

		await userEvent.click(screen.getAllByTitle("Actions")[1]);
		await userEvent.click(screen.getByText("Export"));

		// Assert

		expect(vi.mocked(exportFolder)).toBeCalledWith(
			"1",
			"/usr/test/test.json",
		);
	});

	it("Should import folder using actions", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		vi.mocked(open).mockImplementation(options => {
			if (options!.filters![0] === jsonFileFilter) {
				return Promise.resolve("/usr/test/test.json");
			}
			return Promise.resolve(null);
		});

		// Act

		await userEvent.click(screen.getAllByTitle("Actions")[1]);
		await userEvent.click(screen.getByText("Import"));

		// Assert

		expect(vi.mocked(importExportedItem)).toBeCalledWith(
			"/usr/test/test.json",
			"1",
		);
		expect(vi.mocked(getReviewTreeFolderForRoot)).toBeCalled();
	});

	it("Should export file using actions", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.files.push(createTestFile("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		vi.mocked(save).mockImplementation(options => {
			if (
				options!.filters![0] === jsonFileFilter &&
				options!.defaultPath === "test.json"
			) {
				return Promise.resolve("/usr/test/test.json");
			}
			return Promise.resolve(null);
		});

		// Act

		await userEvent.click(screen.getAllByTitle("Actions")[1]);
		await userEvent.click(screen.getByText("Export"));

		// Assert

		expect(vi.mocked(exportFile)).toBeCalledWith(
			"1",
			"/usr/test/test.json",
		);
	});

	it("Should hide actions when pressing Escape", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getByTitle("Actions"));
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(screen.queryByText("Export")).toBeNull();
	});

	it("Should put id on drag start", () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);
		let format = "",
			data = "";

		// Act

		act(() => {
			fireEvent.dragStart(screen.getByText("test"), {
				dataTransfer: {
					setData(formatArg: string, dataArg: string) {
						format = formatArg;
						data = dataArg;
					},
				},
			});
		});

		// Assert

		expect(format).toBe(dragFormatForFolder);
		expect(data).toBe("1");
	});

	it("Should update classes on drag enter", () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		act(() => {
			fireEvent.dragEnter(screen.getByText("test"), {
				dataTransfer: {
					types: [dragFormatForFolder],
				},
			});
		});

		// Assert

		const fileTree =
			screen.getByText("test").parentElement!.parentElement!
				.parentElement!;
		expect(fileTree.classList).toContain(fileTreeStyles.dragOver);
	});

	it("Should update classes on drag drag", () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		act(() => {
			fireEvent.dragEnter(screen.getByText("test"), {
				dataTransfer: {
					types: [dragFormatForFolder],
				},
			});
			fireEvent.dragLeave(screen.getByText("test"), {
				dataTransfer: {
					types: [dragFormatForFolder],
				},
			});
		});

		// Assert

		const fileTree =
			screen.getByText("test").parentElement!.parentElement!
				.parentElement!;
		expect(fileTree.classList).not.toContain(fileTreeStyles.dragOver);
	});

	it("Should prevent default on drag over", () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// The testing library is acting weiredly when attaching preventDefault
		// as mock function, therefore spying on the prototype.
		const preventDefaultSpy = vi.spyOn(Event.prototype, "preventDefault");

		// Act

		act(() => {
			fireEvent.dragOver(screen.getByText("test"), {
				dataTransfer: {
					types: [dragFormatForFolder],
				},
			});
		});

		// Assert

		expect(preventDefaultSpy).toBeCalled();
	});

	it("Should call backend on drop", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		act(() => {
			fireEvent.drop(screen.getByText("test"), {
				dataTransfer: {
					types: [dragFormatForFolder],
					getData(format: string) {
						if (format === dragFormatForFolder) return "2";
						return null;
					},
				},
			});
		});

		// Assert

		expect(vi.mocked(moveFolder)).toBeCalledWith("2", "1");
	});

	it("Should navigate to file on click", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.files.push(createTestFile("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getByText("test"));

		// Assert

		expect(screen.getByTestId("location-display")).toHaveTextContent(
			"/editor?fileId=1",
		);
	});

	it("Should navigate to home on click on root", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.files.push(createTestFile("test", "1"));
		renderWithProviders(<FileTree folder={root} />);
		// Navigating to some file first.
		await userEvent.click(screen.getByText("test"));

		// Act

		await userEvent.click(screen.getByText("Files"));

		// Assert

		expect(screen.getByTestId("location-display")).toHaveTextContent("/");
	});
});
