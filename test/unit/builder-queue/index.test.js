/**
 * @file
 * @source ./test/unit/builder-queue/index.test.js
 * @description Tests unitarios para lib/builder-queue
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const BuilderQueue = require("#lib/builder-queue");

/**
 * @param {unknown} value
 * @param {number} ms
 * @returns {Promise<unknown>}
 */
const delayed = (value, ms) =>
{
	return new Promise(resolve => setTimeout(() => resolve(value), ms));
};

/**
 * @returns {void}
 */
describe("builder-queue", () =>
{
	/**
	 * @returns {Promise<void>}
	 */
	it("add: encola la promesa del job y retorna undefined", async() =>
	{
		const queue = new BuilderQueue();

		const result = queue.add(() => delayed("job", 1));

		assert.equal(result, undefined);
		assert.deepEqual(await queue.all(), ["job", undefined]);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("all: espera las promesas encoladas y preserva el orden", async() =>
	{
		const queue = new BuilderQueue();

		queue.add(() => delayed("first", 30));
		queue.add(() => delayed("second", 1));

		assert.deepEqual(await queue.all(), ["first", "second", undefined]);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("all: drena la cola al consumirla", async() =>
	{
		const queue = new BuilderQueue();

		queue.add(() => delayed("a", 20));

		assert.deepEqual(await queue.all(), ["a", undefined]);

		queue.add(() => delayed("b", 20));

		assert.deepEqual(await queue.all(), ["b"]);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("all: resuelve solo el init si la cola está vacía", async() =>
	{
		const queue = new BuilderQueue();

		assert.deepEqual(await queue.all(), [undefined]);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("all: rechaza si algún job rechaza y aun así vacía la cola", async() =>
	{
		const queue = new BuilderQueue();

		queue.add(async() =>
		{
			throw new Error("boom");
		});

		await assert.rejects(queue.all(), /boom/);
		assert.deepEqual(await queue.all(), []);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("init: los jobs se encadenan y no se ejecutan hasta que el init resuelve", async() =>
	{
		const queue = new BuilderQueue(() => delayed(undefined, 10));

		/**@type {string[]}*/
		const order = [];

		queue.add(async() =>
		{
			order.push("job");
		});

		assert.deepEqual(order, []);
		await queue.all();
		assert.deepEqual(order, ["job"]);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("init: si rechaza, los jobs no se ejecutan y all rechaza", async() =>
	{
		const queue = new BuilderQueue(() => Promise.reject(new Error("boom")));

		let jobExecuted = false;
		queue.add(async() =>
		{
			jobExecuted = true;
		});

		await assert.rejects(queue.all(), /boom/);
		assert.equal(jobExecuted, false);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("init: se consume en el primer all y el segundo all no lo re-espera", async() =>
	{
		const queue = new BuilderQueue(() => Promise.reject(new Error("boom")));

		await assert.rejects(queue.all(), /boom/);
		assert.deepEqual(await queue.all(), []);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("all: espera el init aun con la cola vacía", async() =>
	{
		let initDone = false;

		const queue = new BuilderQueue(async() =>
		{
			await delayed(undefined, 5);
			initDone = true;
		});

		await queue.all();
		assert.equal(initDone, true);
	});
});
