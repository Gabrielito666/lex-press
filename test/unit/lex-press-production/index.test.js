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
 * Simula que las carpetas de inicialización (.lex-press-app/N/) existen para
 * que el constructor de HTMLTree valide OK. statSync marca isDirectory solo
 * para paths que NO terminan en .js: el loader CJS hace statSync del archivo
 * al re-requerir el módulo y un isDirectory:true lo rompería. readdirSync
 * devuelve vacío para public y un placeholder para el resto.
 * @param {any} t
 * @returns {void}
 */
const mockInitDirs = (t) =>
{
	t.mock.method(fs, "existsSync", () => true);
	t.mock.method(fs, "statSync", (p) => ({ isDirectory: () => !p.endsWith(".js") }));
	t.mock.method(fs, "readdirSync", (dir) => (dir.includes("public") ? [] : ["index.html"]));
};

describe("lexpress-production", () =>
{
	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("public: es no-op y retorna la misma app", (t) =>
	{
		mockInitDirs(t);

		const app = lexpress();

		const result = app.public("x");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("views: es no-op y retorna la misma app", (t) =>
	{
		mockInitDirs(t);

		const app = lexpress();

		const result = app.views("x");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("jsx: es no-op y retorna la misma app", (t) =>
	{
		mockInitDirs(t);

		const app = lexpress();

		const result = app.jsx("r", "p", "l");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("html: es no-op y retorna la misma app", (t) =>
	{
		mockInitDirs(t);

		const app = lexpress();

		const result = app.html("r", "p");

		assert.strictEqual(result, app);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("factory: monta static de assetsDir bajo /__assets/ (views lo sirve HTMLTree)", (t) =>
	{
		mockInitDirs(t);
		t.mock.method(express, "static", staticPassThrough);

		const tag = "x";
		const tagAssetsDir = path.resolve(process.cwd(), ".lex-press-app", tag, "assets");
		const tagViewsDir = path.resolve(process.cwd(), ".lex-press-app", tag, "views");

		const freshLexpress = reRequireLexpress();
		freshLexpress({ tag });

		const staticDirs = express.static.mock.calls.map(call => call.arguments[0]);

		// La realidad actual: viewsDir se sirve vía HTMLTree (middleware propio),
		// NO con express.static. El único static de la factory es /__assets/ (y
		// los public dirs, cubiertos en el test siguiente).
		assert.equal(staticDirs[0], tagAssetsDir);
		assert.equal(staticDirs.includes(tagViewsDir), false);
	});

	/**
	 * @param {any} t
	 * @returns {void}
	 */
	it("factory: monta public dirs ordenados numéricamente (mock readdirSync)", (t) =>
	{
		mockInitDirs(t);
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
