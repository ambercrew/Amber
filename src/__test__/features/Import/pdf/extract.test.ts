import { extractPdf } from "../../../../features/Import/pdf/extract";

interface PostedMessage {
	id: number;
	bytes: ArrayBuffer;
}

class FakeWorker {
	static instances: FakeWorker[] = [];
	listeners: ((e: MessageEvent) => void)[] = [];
	posted: PostedMessage[] = [];

	constructor() {
		FakeWorker.instances.push(this);
	}

	addEventListener(_type: string, listener: (e: MessageEvent) => void) {
		this.listeners.push(listener);
	}

	removeEventListener(_type: string, listener: (e: MessageEvent) => void) {
		this.listeners = this.listeners.filter(l => l !== listener);
	}

	postMessage(message: PostedMessage) {
		this.posted.push(message);
	}

	emit(data: unknown) {
		this.listeners.forEach(l => l({ data } as MessageEvent));
	}
}

vi.stubGlobal("Worker", FakeWorker);

// extractPdf() lazily caches a single worker instance at module scope, so
// every test in this file shares the same FakeWorker — identify each call's
// request by the last posted message rather than resetting instances.
function lastRequest(): PostedMessage {
	const worker = FakeWorker.instances[0];
	return worker.posted[worker.posted.length - 1];
}

describe("extractPdf", () => {
	it("Should post the bytes to the worker with a request id", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);

		// Act

		const promise = extractPdf(bytes);
		const request = lastRequest();
		FakeWorker.instances[0].emit({
			id: request.id,
			result: { title: "T", html: "<p>h</p>", pageCount: 1 },
		});
		await promise;

		// Assert

		expect(request.bytes).toBe(bytes);
	});

	it("Should resolve with the result when the worker replies with a matching id", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);

		// Act

		const promise = extractPdf(bytes);
		const { id } = lastRequest();
		FakeWorker.instances[0].emit({
			id,
			result: { title: "Title", html: "<p>content</p>", pageCount: 3 },
		});
		const actual = await promise;

		// Assert

		expect(actual).toEqual({
			title: "Title",
			html: "<p>content</p>",
			pageCount: 3,
		});
	});

	it("Should ignore messages with a different request id", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);

		// Act

		const promise = extractPdf(bytes);
		const { id } = lastRequest();
		const worker = FakeWorker.instances[0];
		worker.emit({
			id: id + 999,
			result: { title: null, html: "<p>wrong</p>", pageCount: 0 },
		});
		worker.emit({
			id,
			result: { title: null, html: "<p>ok</p>", pageCount: 1 },
		});
		const actual = await promise;

		// Assert

		expect(actual.html).toBe("<p>ok</p>");
	});

	it("Should call onProgress for progress messages without resolving", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);
		const onProgress = vi.fn();

		// Act

		const promise = extractPdf(bytes, onProgress);
		const { id } = lastRequest();
		const worker = FakeWorker.instances[0];
		worker.emit({ id, progress: { done: 1, total: 2 } });
		worker.emit({
			id,
			result: { title: null, html: "<p>ok</p>", pageCount: 2 },
		});
		await promise;

		// Assert

		expect(onProgress).toHaveBeenCalledWith({ done: 1, total: 2 });
	});

	it("Should reject with an Error when the worker replies with an error", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);

		// Act

		const promise = extractPdf(bytes);
		const { id } = lastRequest();
		FakeWorker.instances[0].emit({ id, error: "no-text-layer" });

		// Assert

		await expect(promise).rejects.toThrow("no-text-layer");
	});

	it("Should assign a different request id to each call", () => {
		// Arrange

		const bytes1 = new ArrayBuffer(4);
		const bytes2 = new ArrayBuffer(4);

		// Act

		void extractPdf(bytes1).catch(() => undefined);
		const id1 = lastRequest().id;
		void extractPdf(bytes2).catch(() => undefined);
		const id2 = lastRequest().id;

		// Assert

		expect(id1).not.toBe(id2);
	});

	it("Should reuse the same worker across multiple calls", () => {
		// Arrange

		const bytes1 = new ArrayBuffer(4);
		const bytes2 = new ArrayBuffer(4);
		const instanceCountBefore = FakeWorker.instances.length;

		// Act

		void extractPdf(bytes1).catch(() => undefined);
		void extractPdf(bytes2).catch(() => undefined);

		// Assert

		expect(FakeWorker.instances.length).toBe(instanceCountBefore);
	});
});
