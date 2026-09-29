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

/**
 * Mockea fs para simular la estructura de .lex-press-app con los maps JSON.
 * @param {any} t
 * @param {Object} options
 * @param {Record<string, string>} [options.publicMap]
 * @param {Record<string, string[]>} [options.viewsMap]
 * @param {Record<string, string>} [options.htmlsMap]
 * @param {Record<string, string>} [options.htmlFiles]
 * @returns {void}
 */
const mockFileSystem = (t, options = {}) =>
{
	const { publicMap = {}, viewsMap = {}, htmlsMap = {}, htmlFiles = {} } = options;
	const originalReadFileSync = fs.readFileSync.bind(fs);

	t.mock.method(fs, "readFileSync", (filePath, encoding) =>
	{
		const pathStr = String(filePath);

		if(pathStr.endsWith("public-map.json"))
		{
			return JSON.stringify(publicMap);
		}
		if(pathStr.endsWith("views-map.json"))
		{
			return JSON.stringify(viewsMap);
		}
		if(pathStr.endsWith("htmls-map.json"))
		{
			return JSON.stringify(htmlsMap);
		}

		for(const [hash, content] of Object.entries(htmlFiles))
		{
			if(pathStr.endsWith(`${hash}.html`))
			{
				return content;
			}
		}

		return originalReadFileSync(filePath, encoding);
	});
};

describe("lexpress-production", () =>
{
	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("public: monta express.static con la carpeta del public-map", (t) =>
	{
		mockFileSystem(t, {
			publicMap: { "public": "0" }
		});
		t.mock.method(express, "static", staticPassThrough);

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		app.public("public");

		const staticCalls = express.static.mock.calls.map(call => call.arguments[0]);
		assert.ok(staticCalls.some(dir => String(dir).includes("public/0")));
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("public: normaliza paths absolutos y relativos", (t) =>
	{
		mockFileSystem(t, {
			publicMap: { "public": "0" }
		});
		t.mock.method(express, "static", staticPassThrough);

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		const absolutePath = path.resolve(process.cwd(), "public");
		app.public(absolutePath);

		const staticCalls = express.static.mock.calls.map(call => call.arguments[0]);
		assert.ok(staticCalls.some(dir => String(dir).includes("public/0")));
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("views: registra rutas desde views-map y htmls-map", (t) =>
	{
		mockFileSystem(t, {
			viewsMap: { "views": ["/home", "/about"] },
			htmlsMap: { "/home": "abc123", "/about": "def456" },
			htmlFiles: {
				"abc123": "<html>home</html>",
				"def456": "<html>about</html>"
			}
		});

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		const result = app.views("views");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("jsx: es no-op y retorna la misma app", (t) =>
	{
		mockFileSystem(t);

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		const result = app.jsx("r", "p", "l");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("html: es no-op y retorna la misma app", (t) =>
	{
		mockFileSystem(t);

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		const result = app.html("r", "p");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("factory: monta static de assetsDir bajo /__assets/", (t) =>
	{
		mockFileSystem(t);
		t.mock.method(express, "static", staticPassThrough);

		const tag = "x";
		const tagAssetsDir = path.resolve(process.cwd(), ".lex-press-app", tag, "assets");

		const freshLexpress = reRequireLexpress();
		freshLexpress({ tag });

		const staticDirs = express.static.mock.calls.map(call => call.arguments[0]);

		assert.equal(staticDirs[0], tagAssetsDir);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("public: múltiples llamadas monta múltiples static", (t) =>
	{
		mockFileSystem(t, {
			publicMap: { "public1": "0", "public2": "1" }
		});
		t.mock.method(express, "static", staticPassThrough);

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		app.public("public1");
		app.public("public2");

		const staticCalls = express.static.mock.calls.map(call => call.arguments[0]);
		assert.ok(staticCalls.some(dir => String(dir).includes("public/0")));
		assert.ok(staticCalls.some(dir => String(dir).includes("public/1")));
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("public: con key hace lookup por key en vez de path normalizado", (t) =>
	{
		mockFileSystem(t, {
			publicMap: { "my-custom-key": "0" }
		});
		t.mock.method(express, "static", staticPassThrough);

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		app.public("/some/absolute/path/that/would/normalize/differently", { key: "my-custom-key" });

		const staticCalls = express.static.mock.calls.map(call => call.arguments[0]);
		assert.ok(staticCalls.some(dir => String(dir).includes("public/0")));
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("views: con key hace lookup por key en vez de path normalizado", (t) =>
	{
		mockFileSystem(t, {
			viewsMap: { "my-views-key": ["/home"] },
			htmlsMap: { "/home": "abc123" },
			htmlFiles: {
				"abc123": "<html>home</html>"
			}
		});

		const freshLexpress = reRequireLexpress();
		const app = freshLexpress({ tag: "test" });

		const result = app.views("/some/path/that/would/normalize/differently", { key: "my-views-key" });

		assert.strictEqual(result, app);
	});
});
