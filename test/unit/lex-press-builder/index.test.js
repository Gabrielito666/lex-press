/**
 * @file
 * @source ./test/unit/lex-press-builder/index.test.js
 * @description Tests unitarios para lib/lex-press-builder
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const buildFRONT = require("#lib/build-front");

const MODULE_ID = "#lib/lex-press-builder";

const OUT_DIR = path.resolve(process.cwd(), ".lex-press-app");
const OUT_PUBLIC = path.resolve(OUT_DIR, "public");
const OUT_VIEWS = path.resolve(OUT_DIR, "views");
const OUT_ASSETS = path.resolve(OUT_DIR, "assets");

/**
 * @typedef {import("#lib/lex-press-dev").LexpressDevApp} LexpressApp
 * @typedef {import("node:test").MockFunctionContext<(...args: any[]) => unknown>} MockHandle
 */

/**
 * @type {{ htmlText: string, assets: unknown[], error: null, warnings: unknown[] }}
 */
const CLEAN_HTML_OUTPUT = {
	htmlText: "<html>ok</html>",
	assets: [],
	error: null,
	warnings: [],
};

/**
 * @param {string[]} argv
 * @returns {LexpressApp}
 */
const loadBuilder = (argv) =>
{
	process.argv = argv;
	delete require.cache[require.resolve(MODULE_ID)];
	return require(MODULE_ID)();
};

/**
 * @param {import("node:test").TestContext} t
 * @returns {{ rm: MockHandle, mkdir: MockHandle, cp: MockHandle, writeFile: MockHandle, build: MockHandle, exit: MockHandle, html: MockHandle, jsx: MockHandle }}
 */
const setupMocks = (t) =>
{
	const rm = t.mock.method(fs.promises, "rm", async () => {});
	const mkdir = t.mock.method(fs.promises, "mkdir", async () => {});
	const cp = t.mock.method(fs.promises, "cp", async () => {});
	const writeFile = t.mock.method(fs.promises, "writeFile", async () => {});
	const build = t.mock.method(esbuild, "build", async () => {});
	const exit = t.mock.method(process, "exit", () => {});
	const html = t.mock.method(buildFRONT, "html", async () => ({ ...CLEAN_HTML_OUTPUT }));
	const jsx = t.mock.method(buildFRONT, "jsx", async () => ({ ...CLEAN_HTML_OUTPUT }));
	t.mock.method(console, "log", () => {});
	t.mock.method(console, "warn", () => {});
	t.mock.method(console, "error", () => {});
	t.mock.method(fs, "readFileSync", () => "process.cwd()");
	t.mock.method(fs, "existsSync", () => true);

	return { rm, mkdir, cp, writeFile, build, exit, html, jsx };
};

/**
 * @returns {void}
 */
describe("lexpress-builder", () =>
{
	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("enumValue: retorna el valor si está en allowed", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv, "--format", "esm"]);
			const mocks = setupMocks(t);

			app.html("/", "/v/index.html");
			await app.listen(0, () => {});

			const options = mocks.build.mock.calls[0].arguments[0];
			assert.equal(options.format, "esm");
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("enumValue: undefined retorna undefined", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.html("/", "/v/index.html");
			await app.listen(0, () => {});

			const options = mocks.build.mock.calls[0].arguments[0];
			assert.equal(options.format, undefined);
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @returns {void}
	 */
	it("enumValue: valor inválido lanza TypeError con nombre del flag", () =>
	{
		const originalArgv = process.argv;
		try
		{
			process.argv = [...originalArgv, "--format", "invalid"];
			delete require.cache[require.resolve(MODULE_ID)];

			assert.throws(
				() => { require(MODULE_ID); },
				/**
				 * @param {unknown} error
				 * @returns {boolean}
				 */
				(error) => error instanceof TypeError && /Invalid --format/.test(error.message)
			);
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("buildOptions: no incluye keys undefined (con argv controlado)", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv, "--bundle", "--minify"]);
			const mocks = setupMocks(t);

			app.html("/", "/v/index.html");
			await app.listen(0, () => {});

			const options = mocks.build.mock.calls[0].arguments[0];
			assert.equal(options.bundle, true);
			assert.equal(options.minify, true);
			assert.equal(options.format, undefined);
			assert.equal("format" in options, false);
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("jsx: registra ruta con ext jsx y layout en routes", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.jsx("/about", "/v/about.jsx", "/v/layout.jsx");
			await app.listen(0, () => {});

			assert.equal(mocks.jsx.mock.calls.length, 1);
			assert.equal(mocks.jsx.mock.calls[0].arguments[0], "/v/about.jsx");
			assert.equal(mocks.jsx.mock.calls[0].arguments[1], "/v/layout.jsx");
			assert.equal(mocks.jsx.mock.calls[0].arguments[2], true);
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("html: registra ruta html", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.html("/home", "/v/home.html");
			await app.listen(0, () => {});

			assert.equal(mocks.html.mock.calls.length, 1);
			assert.equal(mocks.html.mock.calls[0].arguments[0], "/v/home.html");
			assert.equal(mocks.html.mock.calls[0].arguments[1], true);
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("public: acumula directorios en publicDirs", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.public("/v/pub1");
			app.public("/v/pub2");
			await app.listen(0, () => {});

			assert.equal(mocks.cp.mock.calls.length, 2);
			assert.equal(mocks.cp.mock.calls[0].arguments[0], "/v/pub1");
			assert.equal(mocks.cp.mock.calls[1].arguments[0], "/v/pub2");
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("listen: limpia y recrea .lex-press-app con carpetas views/public/assets", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.html("/home", "/v/home.html");
			await app.listen(0, () => {});

			assert.equal(mocks.rm.mock.calls.length, 1);
			assert.equal(mocks.rm.mock.calls[0].arguments[0], OUT_DIR);
			assert.deepEqual(mocks.rm.mock.calls[0].arguments[1], { recursive: true, force: true });

			assert.equal(mocks.mkdir.mock.calls[0].arguments[0], OUT_DIR);
			assert.equal(mocks.mkdir.mock.calls[1].arguments[0], OUT_PUBLIC);
			assert.equal(mocks.mkdir.mock.calls[2].arguments[0], OUT_VIEWS);
			assert.equal(mocks.mkdir.mock.calls[3].arguments[0], OUT_ASSETS);
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("listen: copia publicDirs a public/N (mock fs.cp)", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.public("/v/pub1");
			app.public("/v/pub2");
			await app.listen(0, () => {});

			assert.equal(mocks.cp.mock.calls.length, 2);
			assert.equal(mocks.cp.mock.calls[0].arguments[0], "/v/pub1");
			assert.ok(String(mocks.cp.mock.calls[0].arguments[1]).endsWith(".lex-press-app/public/0"));
			assert.equal(mocks.cp.mock.calls[1].arguments[0], "/v/pub2");
			assert.ok(String(mocks.cp.mock.calls[1].arguments[1]).endsWith(".lex-press-app/public/1"));
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("listen: buildea cada página y escribe views/index.html (mock buildFRONT)", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.html("/home", "/v/home.html");
			app.jsx("/about", "/v/about.jsx", "/v/layout.jsx");
			await app.listen(0, () => {});

			assert.equal(mocks.html.mock.calls.length, 1);
			assert.equal(mocks.html.mock.calls[0].arguments[0], "/v/home.html");
			assert.equal(mocks.html.mock.calls[0].arguments[1], true);

			assert.equal(mocks.jsx.mock.calls.length, 1);
			assert.equal(mocks.jsx.mock.calls[0].arguments[0], "/v/about.jsx");
			assert.equal(mocks.jsx.mock.calls[0].arguments[1], "/v/layout.jsx");
			assert.equal(mocks.jsx.mock.calls[0].arguments[2], true);

			assert.equal(mocks.writeFile.mock.calls.length, 2);
			for(const call of mocks.writeFile.mock.calls)
			{
				assert.ok(String(call.arguments[0]).includes(".lex-press-app/views"));
				assert.equal(call.arguments[1], "<html>ok</html>");
			}
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("listen: buildea el servidor con esbuild y entryPoint process.argv[1]", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const mocks = setupMocks(t);

			app.html("/", "/v/index.html");
			await app.listen(0, () => {});

			assert.equal(mocks.build.mock.calls.length, 1);
			const options = mocks.build.mock.calls[0].arguments[0];
			assert.ok(Array.isArray(options.entryPoints));
			assert.ok(options.entryPoints.length >= 1);
			assert.ok(String(options.outfile).endsWith(".lex-press-app/server.js"));
			assert.equal(options.plugins[0].name, "virtual-lex-press");
			assert.equal(options.minify, true);
			assert.equal(options.bundle, true);
			assert.equal(options.platform, "node");
			assert.equal(options.treeShaking, true);
			assert.equal(options.target, "node22");
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("listen: con error hace rm de outputDir y llama process.exit(1)", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const app = loadBuilder([...originalArgv]);
			const rm = t.mock.method(fs.promises, "rm", async () => {});
			t.mock.method(fs.promises, "mkdir", async () => {});
			t.mock.method(fs.promises, "cp", async () => {});
			t.mock.method(fs.promises, "writeFile", async () => {});
			t.mock.method(esbuild, "build", async () => {});
			const exit = t.mock.method(process, "exit", () => {});
			t.mock.method(console, "log", () => {});
			t.mock.method(console, "warn", () => {});
			t.mock.method(console, "error", () => {});
			t.mock.method(buildFRONT, "html", async () => ({
				htmlText: null,
				assets: null,
				error: new Error("boom"),
				warnings: [],
			}));
			t.mock.method(buildFRONT, "jsx", async () => ({ ...CLEAN_HTML_OUTPUT }));
			t.mock.method(fs, "readFileSync", () => "process.cwd()");
			t.mock.method(fs, "existsSync", () => true);

			app.html("/home", "/v/home.html");
			await app.listen(0, () => {});

			assert.equal(exit.mock.calls[0].arguments[0], 1);
			const lastRmCall = rm.mock.calls[rm.mock.calls.length - 1];
			assert.equal(lastRmCall.arguments[0], OUT_DIR);
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve(MODULE_ID)];
		}
	});
});
