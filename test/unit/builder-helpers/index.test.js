/**
 * @file
 * @source ./test/unit/builder-helpers/index.test.js
 * @description Tests unitarios para lib/builder-helpers: buildView (buildFRONT + fs) y
 * buildServer (esbuild + buildOptions + plugin virtual). Como el módulo captura sus
 * dependencias al cargar, buildFRONT y esbuild se reemplazan en el cache de require y
 * builder-helpers se re-requiere DESPUÉS de los stubs; fs.promises se mockea con
 * t.mock.method sobre el singleton (auto-restore por test).
 */

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const buildFrontPath = require.resolve("#lib/build-front");
const esbuildPath = require.resolve("esbuild");
const helpersPath = require.resolve("#lib/builder-helpers");
const optionsPath = require.resolve("#lib/builder-options");

// Se requieren primero solo para poblar el cache y poder swapear/restaurar exports.
const buildFRONTReal = require("#lib/build-front");
const esbuildReal = require("esbuild");
const builderOptionsReal = require("#lib/builder-options");
const virtualLexPressPlugin = require("#lib/builder-virtual-plugin");

const originalBuildFrontExports = require.cache[buildFrontPath].exports;
const originalEsbuildExports = require.cache[esbuildPath].exports;
const originalOptionsExports = require.cache[optionsPath].exports;

const VIEWS_DIR = "/app/.lex-press-app/tag0/views";
const ASSETS_DIR = "/app/.lex-press-app/tag0/assets";
const SERVER_FILE = "/app/.lex-press-app/server.js";

/**
 * @typedef {{
 *	htmlText: string;
 *	assets: Array<{ path: string, contents: string }>;
 *	error: null | Error;
 *	warnings: string[];
 * }} BuildOutputMock
 */

/** @type {BuildOutputMock} */
const CLEAN_OUTPUT = {
	htmlText: "<html><h1>hola</h1></html>",
	assets: [{ path: "/__assets/img-abc.png", contents: "PNGDATA" }],
	error: null,
	warnings: [],
};

/**
 * @returns {typeof import("#lib/builder-helpers")}
 */
const loadHelpers = () =>
{
	delete require.cache[helpersPath];
	return require(helpersPath);
};

/**
 * @returns {void}
 */
afterEach(() =>
{
	require.cache[buildFrontPath].exports = originalBuildFrontExports;
	require.cache[esbuildPath].exports = originalEsbuildExports;
	require.cache[optionsPath].exports = originalOptionsExports;
	delete require.cache[helpersPath];
});

/**
 * @returns {void}
 */
describe("builder-helpers", () =>
{
	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildView: llama buildFRONT con (routeDef, true)", async(t) =>
	{
		/** @type {unknown[][]} */
		const buildCalls = [];
		require.cache[buildFrontPath].exports = async(...args) =>
		{
			buildCalls.push(args);
			return { ...CLEAN_OUTPUT };
		};
		t.mock.method(fs.promises, "mkdir", async() => {});
		t.mock.method(fs.promises, "writeFile", async() => {});

		const { buildView } = loadHelpers();

		const routeDef = { ext: "html", page: "/fake/page.html", layout: null };
		await buildView("/home", routeDef, VIEWS_DIR, ASSETS_DIR);

		assert.equal(buildCalls.length, 1);
		assert.deepEqual(buildCalls[0], [routeDef, true]);
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildView: si buildFRONT retorna error, lo propaga sin escribir", async(t) =>
	{
		require.cache[buildFrontPath].exports = async() => ({
			htmlText: null,
			assets: null,
			error: new Error("boom"),
			warnings: [],
		});
		t.mock.method(fs.promises, "mkdir", async() => {});
		t.mock.method(fs.promises, "writeFile", async() => {});

		const { buildView } = loadHelpers();

		await assert.rejects(
			buildView("/home", { ext: "html", page: "/fake/page.html", layout: null }, VIEWS_DIR, ASSETS_DIR),
			/boom/
		);
		assert.equal(fs.promises.mkdir.mock.calls.length, 0);
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildView: crea el dir de la ruta con recursive", async(t) =>
	{
		require.cache[buildFrontPath].exports = async() => ({ ...CLEAN_OUTPUT });
		t.mock.method(fs.promises, "mkdir", async() => {});
		t.mock.method(fs.promises, "writeFile", async() => {});

		const { buildView } = loadHelpers();

		await buildView("/about", { ext: "html", page: "/fake/page.html", layout: null }, VIEWS_DIR, ASSETS_DIR);

		assert.equal(fs.promises.mkdir.mock.calls.length, 1);
		assert.deepEqual(fs.promises.mkdir.mock.calls[0].arguments, [
			path.resolve(VIEWS_DIR, "./about"),
			{ recursive: true },
		]);
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildView: escribe index.html con htmlText en utf-8", async(t) =>
	{
		require.cache[buildFrontPath].exports = async() => ({ ...CLEAN_OUTPUT });
		t.mock.method(fs.promises, "mkdir", async() => {});
		t.mock.method(fs.promises, "writeFile", async() => {});

		const { buildView } = loadHelpers();

		await buildView("/home", { ext: "html", page: "/fake/page.html", layout: null }, VIEWS_DIR, ASSETS_DIR);

		assert.equal(fs.promises.writeFile.mock.calls.length, 2);
		assert.deepEqual(fs.promises.writeFile.mock.calls[0].arguments, [
			path.resolve(VIEWS_DIR, "./home/index.html"),
			CLEAN_OUTPUT.htmlText,
			"utf-8",
		]);
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildView: escribe cada asset como Buffer en assetsDir", async(t) =>
	{
		require.cache[buildFrontPath].exports = async() => ({ ...CLEAN_OUTPUT });
		t.mock.method(fs.promises, "mkdir", async() => {});
		t.mock.method(fs.promises, "writeFile", async() => {});

		const { buildView } = loadHelpers();

		await buildView("/home", { ext: "html", page: "/fake/page.html", layout: null }, VIEWS_DIR, ASSETS_DIR);

		const writeCalls = fs.promises.writeFile.mock.calls;
		assert.equal(writeCalls.length, 2);

		const assetCall = writeCalls[1].arguments;
		assert.equal(assetCall[0], path.resolve(ASSETS_DIR, "img-abc.png"));
		assert.ok(Buffer.isBuffer(assetCall[1]));
		assert.equal(assetCall[1].toString(), "PNGDATA");
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildView: loguea cada warning con console.warn", async(t) =>
	{
		require.cache[buildFrontPath].exports = async() => ({
			...CLEAN_OUTPUT,
			warnings: ["warn-a", "warn-b"],
		});
		t.mock.method(fs.promises, "mkdir", async() => {});
		t.mock.method(fs.promises, "writeFile", async() => {});
		t.mock.method(console, "warn", () => {});

		const { buildView } = loadHelpers();

		await buildView("/home", { ext: "html", page: "/fake/page.html", layout: null }, VIEWS_DIR, ASSETS_DIR);

		assert.equal(console.warn.mock.calls.length, 2);
		assert.deepEqual(
			console.warn.mock.calls.map(call => call.arguments[0]),
			["warn-a", "warn-b"]
		);
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildServer: llama esbuild.build con entryPoints, outfile y defaults", async(t) =>
	{
		/** @type {import("esbuild").BuildOptions[]} */
		const buildCalls = [];
		require.cache[esbuildPath].exports = {
			build: async(options) =>
			{
				buildCalls.push(options);
			},
		};

		const { buildServer } = loadHelpers();

		await buildServer(SERVER_FILE);

		assert.equal(buildCalls.length, 1);

		const opts = buildCalls[0];
		assert.deepEqual(opts.entryPoints, [path.resolve(process.cwd(), process.argv[1])]);
		assert.equal(opts.outfile, SERVER_FILE);
		assert.equal(opts.bundle, true);
		assert.equal(opts.minify, true);
		assert.equal(opts.treeShaking, true);
		assert.equal(opts.platform, "node");
		assert.equal(opts.target, "node22");
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildServer: incluye el plugin virtual de lex-press", async(t) =>
	{
		/** @type {import("esbuild").BuildOptions[]} */
		const buildCalls = [];
		require.cache[esbuildPath].exports = {
			build: async(options) =>
			{
				buildCalls.push(options);
			},
		};

		const { buildServer } = loadHelpers();

		await buildServer(SERVER_FILE);

		const opts = buildCalls[0];
		assert.equal(opts.plugins?.length, 1);
		assert.equal(opts.plugins?.[0], virtualLexPressPlugin);
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildServer: buildOptions se mergean sobre los defaults", async(t) =>
	{
		/** @type {import("esbuild").BuildOptions[]} */
		const buildCalls = [];
		require.cache[esbuildPath].exports = {
			build: async(options) =>
			{
				buildCalls.push(options);
			},
		};
		require.cache[optionsPath].exports = {
			buildOptions: { minify: false, sourcemap: true },
			enumValue: () => {},
		};

		const { buildServer } = loadHelpers();

		await buildServer(SERVER_FILE);

		const opts = buildCalls[0];
		assert.equal(opts.minify, false);
		assert.equal(opts.sourcemap, true);
	});
});
