/**
 * @file
 * @source ./test/unit/lex-press-production/index.test.js
 * @description Tests unitarios para lib/lex-press-production
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const lexpress = require("#lib/lex-press-production");

const viewsDir = path.resolve(process.cwd(), ".lex-press-app", "views");
const assetsDir = path.resolve(process.cwd(), ".lex-press-app", "assets");

/**
 * @returns {any}
 */
const reRequireLexpress = () =>
{
	delete require.cache[require.resolve("#lib/lex-press-production")];
	return require("#lib/lex-press-production");
};

/**
 * @param {string} dir
 * @returns {(req: unknown, res: unknown, next: (err?: unknown) => void) => void}
 */
const staticPassThrough = (dir) =>
{
	return (req, res, next) => next();
};

describe("lexpress-production", () =>
{
	/**
	 * @param {any} t
	 * @returns {Promise<void>}
	 */
	it("factory: retorna app express con json y cookie parser", async (t) =>
	{
		t.mock.method(express, "static", staticPassThrough);

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress();

		app.get("/ping", (req, res) =>
		{
			res.json({ ok: true });
		});
		app.post("/echo", (req, res) =>
		{
			res.json(req.body);
		});

		const server = app.listen(0);
		try
		{
			const port = server.address().port;
			const echoResponse = await fetch("http://127.0.0.1:" + port + "/echo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ a: 1 })
			});
			const echoBody = await echoResponse.json();

			assert.deepEqual(echoBody, { a: 1 });

			const pingResponse = await fetch("http://127.0.0.1:" + port + "/ping");

			assert.equal(pingResponse.status, 200);
			const pingBody = await pingResponse.json();

			assert.deepEqual(pingBody, { ok: true });
		}
		finally
		{
			await new Promise(resolve => server.close(resolve));
		}
	});

	/**
	 * @returns {void}
	 */
	it("public: es no-op y retorna la misma app", () =>
	{
		const app = lexpress();

		const result = app.public("x");

		assert.strictEqual(result, app);
	});

	/**
	 * @returns {void}
	 */
	it("views: es no-op y retorna la misma app", () =>
	{
		const app = lexpress();

		const result = app.views("x");

		assert.strictEqual(result, app);
	});

	/**
	 * @returns {void}
	 */
	it("jsx: es no-op y retorna la misma app", () =>
	{
		const app = lexpress();

		const result = app.jsx("r", "p", "l");

		assert.strictEqual(result, app);
	});

	/**
	 * @returns {void}
	 */
	it("html: es no-op y retorna la misma app", () =>
	{
		const app = lexpress();

		const result = app.html("r", "p");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("factory: monta static de viewsDir y assetsDir", (t) =>
	{
		t.mock.method(express, "static", staticPassThrough);

		const freshLexpress = reRequireLexpress();
		freshLexpress();

		const staticDirs = express.static.mock.calls.map(call => call.arguments[0]);

		assert.equal(staticDirs[0], viewsDir);
		assert.equal(staticDirs.some(dir => dir === assetsDir), true);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("factory: monta public dirs ordenados numéricamente (mock readdirSync)", (t) =>
	{
		t.mock.method(express, "static", staticPassThrough);
		t.mock.method(fs, "readdirSync", () => ["5", "2", "10"]);

		const freshLexpress = reRequireLexpress();
		freshLexpress();

		const publicDirs = express.static.mock.calls
			.map(call => call.arguments[0])
			.filter(dir => path.basename(path.dirname(dir)) === "public");

		assert.deepEqual(publicDirs.map(dir => path.basename(dir)), ["2", "5", "10"]);
	});
});
