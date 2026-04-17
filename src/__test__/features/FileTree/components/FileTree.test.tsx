import userEvent from "@testing-library/user-event";
import FileTree from "../../../../features/FileTree/components/FileTree";
import UiFolder from "../../../../types/ui/uiFolder";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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
import { JSON_FILE_FILTER } from "../../../../features/FileTree/config/constants.ts";
import {
	exportFile,
	exportFolder,
	importExportedItem,
} from "../../../../api/exportImportApi.ts";
import { act } from "react";
import fileTreeStyles from "../../../../features/FileTree/components/styles.module.css";
import useAppSelector from "../../../../hooks/useAppSelector.ts";
import { selectRootFolder } from "../../../../stores/fileSystem/fileSystemSelectors.ts";
import searchFolder from "../../../../features/SideBar/utils/searchFolder.ts";
import {
	mockDndKit,
	mockDragDropProvider,
	mockUseDraggable,
	mockUseDroppable,
} from "../../../test-utils/dndMocks.tsx";
import FileItemDropContainerData, {
	FILE_ITEM_DROP_CONTAINER_TYPE,
} from "../../../../features/FileTree/types/fileItemDropContainerData.ts";
import DraggedFileItemData, {
	DRAGGED_FILE_ITEM_TYPE,
} from "../../../../features/FileTree/types/draggedFileItemData.ts";
import { DragDropEventHandlers } from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";
import { getCurrentLocation } from "../../../test-utils/locationUtils.ts";
import { Feedback } from "@dnd-kit/dom";

vi.mock(import("../../../../api/fileSystemApi.ts"));
vi.mock(import("../../../../api/exportImportApi.ts"));
vi.mock(import("../../../../utils/tauriUtils.ts"));
vi.mock(import("@tauri-apps/plugin-dialog"));
vi.mock(import("@dnd-kit/react"));

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
	beforeEach(() => {
		mockDndKit();
	});

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

		expect(vi.mocked(deleteFolder)).toHaveBeenCalledWith("1");
		expect(await getCurrentLocation()).toBe("/home");
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

		expect(vi.mocked(deleteFile)).toHaveBeenCalledWith("1");
		expect(await getCurrentLocation()).toBe("/home");
	});

	it("Should set drag and drop data correctly", () => {
		// Arrange

		const { getUseDraggableInputs } = mockUseDraggable();
		const { getUseDroppableInputs } = mockUseDroppable();

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));

		// Act

		renderWithProviders(<FileTree folder={root} />);

		// Assert

		const draggableInputs = getUseDraggableInputs();
		expect(draggableInputs[0]).toMatchObject({
			id: ROOT_FOLDER_ID,
			disabled: true,
			type: DRAGGED_FILE_ITEM_TYPE,
			data: {
				id: ROOT_FOLDER_ID,
				isFolder: true,
			} as DraggedFileItemData,
			plugins: [
				Feedback.configure({ feedback: "clone", dropAnimation: null }),
			],
		});

		expect(draggableInputs[1]).toMatchObject({
			id: "1",
			disabled: false,
			type: DRAGGED_FILE_ITEM_TYPE,
			data: {
				id: "1",
				isFolder: true,
			} as DraggedFileItemData,
			plugins: [
				Feedback.configure({ feedback: "clone", dropAnimation: null }),
			],
		});

		const draggableOutputs = getUseDroppableInputs();
		expect(draggableOutputs[0]).toStrictEqual({
			id: ROOT_FOLDER_ID,
			type: FILE_ITEM_DROP_CONTAINER_TYPE,
			disabled: false,
			collisionDetector: pointerIntersection,
			collisionPriority: 0,
			data: {
				folderId: ROOT_FOLDER_ID,
			} as FileItemDropContainerData,
		});

		expect(draggableOutputs[1]).toStrictEqual({
			id: "1",
			type: FILE_ITEM_DROP_CONTAINER_TYPE,
			disabled: false,
			collisionDetector: pointerIntersection,
			collisionPriority: 1,
			data: {
				folderId: "1",
			} as FileItemDropContainerData,
		});
	});
});

describe("FileTreeItem", () => {
	beforeEach(() => {
		// The file tree uses local storage to remember which folders were open,
		// which could make some trouble while testing.
		localStorage.clear();

		mockDndKit();
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

		expect(vi.mocked(createFolder)).toHaveBeenCalledWith(
			"test",
			ROOT_FOLDER_ID,
		);
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

		expect(vi.mocked(createFolder)).toHaveBeenCalledWith(
			"test",
			ROOT_FOLDER_ID,
		);
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

		expect(vi.mocked(createFile)).toHaveBeenCalledWith(
			"test",
			ROOT_FOLDER_ID,
		);
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

		expect(vi.mocked(renameFolder)).toHaveBeenCalledWith(
			"1",
			"test new name",
		);
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

		expect(vi.mocked(createFile)).toHaveBeenCalledWith("test file", "1");
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

		expect(vi.mocked(createFile)).toHaveBeenCalledWith(
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

		expect(vi.mocked(renameFolder)).toHaveBeenCalledWith(
			"1",
			"test new name",
		);
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

		expect(vi.mocked(renameFolder)).toHaveBeenCalledWith("1", "test extra");
	});

	it("Should export folder using actions", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		vi.mocked(save).mockImplementation(options => {
			if (
				options!.filters![0] === JSON_FILE_FILTER &&
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

		expect(vi.mocked(exportFolder)).toHaveBeenCalledWith(
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
			if (options!.filters![0] === JSON_FILE_FILTER) {
				return Promise.resolve("/usr/test/test.json");
			}
			return Promise.resolve(null);
		});

		// Act

		await userEvent.click(screen.getAllByTitle("Actions")[1]);
		await userEvent.click(screen.getByText("Import"));

		// Assert

		expect(vi.mocked(importExportedItem)).toHaveBeenCalledWith(
			"/usr/test/test.json",
			"1",
		);
		expect(vi.mocked(getReviewTreeFolderForRoot)).toHaveBeenCalled();
	});

	it("Should export file using actions", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.files.push(createTestFile("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		vi.mocked(save).mockImplementation(options => {
			if (
				options!.filters![0] === JSON_FILE_FILTER &&
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

		expect(vi.mocked(exportFile)).toHaveBeenCalledWith(
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

	it("Should update classes on dragging", () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));

		mockUseDraggable({
			isDragging: true,
		});

		// Act

		renderWithProviders(<FileTree folder={root} />);

		// Assert

		const fileTree = screen.getByText("test").parentElement!.parentElement!;
		expect(fileTree.classList).toContain(fileTreeStyles.dragging);
	});

	it("Should not contain dragging class if nothing is dragged over", () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));

		mockUseDraggable({
			isDragging: false,
		});

		// Act

		renderWithProviders(<FileTree folder={root} />);

		// Assert

		const fileTree = screen.getByText("test").parentElement!.parentElement!;
		expect(fileTree.classList).not.toContain(fileTreeStyles.dragging);
	});

	it("Should call backend on drop", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));

		const { getCapturedProviderProps } = mockDragDropProvider();

		const input = {
			operation: {
				target: {
					type: FILE_ITEM_DROP_CONTAINER_TYPE,
					data: {
						folderId: "1",
					},
				},
				source: {
					type: DRAGGED_FILE_ITEM_TYPE,
					data: {
						id: "2",
						isFolder: true,
					},
				},
			},
		};

		renderWithProviders(<FileTree folder={root} />);

		// Act

		const capturedProps = getCapturedProviderProps();
		expect(capturedProps).toHaveLength(1);
		capturedProps[0].onDragEnd!(
			input as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[0],
			null as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[1],
		);

		// Assert

		await waitFor(() => {
			expect(vi.mocked(moveFolder)).toHaveBeenCalledWith("2", "1");
		});
	});

	it("Should navigate to file on click", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.files.push(createTestFile("test", "1"));
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.click(screen.getByText("test"));

		// Assert

		expect(await getCurrentLocation()).toBe("/editor?fileId=1");
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

		expect(await getCurrentLocation()).toBe("/");
	});

	it("Should focus new folder after create", async () => {
		// Arrange

		const Component = () => {
			const root = useAppSelector(selectRootFolder);
			const rootUiFolder = searchFolder(root, "");
			return <FileTree folder={rootUiFolder} />;
		};

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<Component />, {
			preloadedState: {
				fileSystem: {
					rootFolder: root,
					errorMessage: null,
					successMessage: null,
				},
			},
		});

		vi.mocked(createFolder).mockResolvedValue("1");

		const newRoot = createTestFolder("", ROOT_FOLDER_ID);
		newRoot.subfolders.push(createTestFolder("test", "1"));
		vi.mocked(getReviewTreeFolderForRoot).mockResolvedValue(newRoot);

		// Act

		await userEvent.pointer({
			target: screen.getByText("Files"),
			keys: "[MouseRight>]",
		});
		await userEvent.click(screen.getByText("New Folder"));
		await userEvent.keyboard("test{Enter}");

		// Assert

		expect(screen.getByText("test").parentElement).toBe(
			document.activeElement,
		);
	});

	it("Should focus parent folder after delete", async () => {
		// Arrange

		const Component = () => {
			const root = useAppSelector(selectRootFolder);
			const rootUiFolder = searchFolder(root, "");
			return <FileTree folder={rootUiFolder} />;
		};

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<Component />, {
			preloadedState: {
				fileSystem: {
					rootFolder: root,
					errorMessage: null,
					successMessage: null,
				},
			},
		});

		vi.mocked(getReviewTreeFolderForRoot).mockResolvedValue(
			createTestFolder("", ROOT_FOLDER_ID),
		);

		// Act

		await userEvent.pointer({
			target: screen.getByText("test"),
			keys: "[MouseRight>]",
		});
		await userEvent.click(screen.getByText("Delete"));
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(screen.getByText("Files").parentElement).toBe(
			document.activeElement,
		);
	});

	it("Should keep focus after renaming", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		root.subfolders.push(createTestFolder("test", "1"));
		renderWithProviders(<FileTree folder={root} />, {
			preloadedState: {
				fileSystem: {
					rootFolder: root,
					errorMessage: null,
					successMessage: null,
				},
			},
		});

		vi.mocked(createFolder).mockResolvedValue("1");

		// Act

		await userEvent.pointer({
			target: screen.getByText("test"),
			keys: "[MouseRight>]",
		});
		await userEvent.click(screen.getByText("Rename"));
		await userEvent.keyboard("test{Escape}");

		// Assert

		expect(screen.getByText("test").parentElement).toBe(
			document.activeElement,
		);
	});

	it("Should hide actions menu when outside clicking", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.pointer({
			target: screen.getByText("Files"),
			keys: "[MouseRight>]",
		});

		await userEvent.click(screen.getByText("Files"));

		// Assert

		expect(screen.queryByText("New Folder")).toBeNull();
	});

	it("Should hide actions menu when double context menu event", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.pointer({
			target: screen.getByText("Files"),
			keys: "[MouseRight>]",
		});
		await userEvent.pointer({
			target: screen.getByText("Files"),
			keys: "[MouseRight>]",
		});

		// Assert

		expect(screen.queryByText("New Folder")).toBeNull();
	});

	it("Should hide actions menu when scrolling", async () => {
		// Arrange

		const root = createTestFolder("", ROOT_FOLDER_ID);
		renderWithProviders(<FileTree folder={root} />);

		// Act

		await userEvent.pointer({
			target: screen.getByText("Files"),
			keys: "[MouseRight>]",
		});
		act(() => {
			fireEvent.scroll(document.body);
		});

		// Assert

		expect(screen.queryByText("New Folder")).toBeNull();
	});
});
