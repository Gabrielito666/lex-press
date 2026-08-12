/**
 * @file
 * @source ./test/unit/lex-press-builder/index.test.js
 * @description Tests unitarios para lib/lex-press-builder. esbuild expone su API como getters
 * no configurables (exports generado con __toCommonJS), inmunes a t.mock.method, por eso
 * se reemplaza su entrada en el cache de require por un stub con "build" como propiedad
 * plana ANTES de cargar lib/lex-press-builder, y cada test la remockea con t.mock.method.
 * OJO: los mocks se configuran ANTES de loadBuilder porque el constructor de BuilderQueue
 * ejecuta el init EAGER (fsSync.existsSync / fs.rm reales) durante el require del módulo;
 * si se carga el módulo primero, el init borra .lex-press-app de verdad antes de que los
 * mocks existan (rompe rm.mock.calls y los tests de producción que leen .lex-press-app).
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * @typedef {{
 *	build: (options: import("esbuild").BuildOptions) => Promise<import("esbuild").BuildResult>;
 * }} IEsbuild
 */

/**
 * Se requiere primero únicamente para poblar el cache de require. Su exports real queda
 * reemplazado abajo por el stub esbuild, así lib/lex-press-builder captura el stub al hacer
 * su propio require("esbuild").
 *
 * @type {typeof import("esbuild")}
 */
const esbuildReal = require("esbuild");

/**
 * Stub de esbuild con "build" como propiedad plana y redefinible. Reemplaza el exports
 * real (getters no configurables, inmunes a t.mock.method) en el cache de require;
 * cada test la remockea con t.mock.method.
 *
 * @type {IEsbuild}
 */
const esbuild = {
	build: async() =>
	{
		throw new Error("esbuild.build debe mockearse en cada test");
	}
};

/** @type {NodeModule} */
const esbuildModule = require.cache[require.resolve("esbuild")];
esbuildModule.exports = esbuild;

const buildFRONT = require("#lib/build-front");

const MODULE_ID = "#lib/lex-press-builder";

/**
 * Borra del cache los 3 módulos del pipeline para que al re-requerir se re-ejecuten:
 * builder-options parsea argv al cargar y builder-helpers captura las dependencias al
 * cargar, así que ambos deben invalidarse junto con lexpress-builder (si no, el argv de
 * un test anterior queda congelado en el cache).
 * @returns {void}
 */
const resetBuilderCache = () =>
{
	delete require.cache[require.resolve(MODULE_ID)];
	delete require.cache[require.resolve("#lib/builder-options")];
	delete require.cache[require.resolve("#lib/builder-helpers")];
};

const OUT_DIR = path.resolve(process.cwd(), ".lex-press-app");
const OUT_TAG = path.resolve(OUT_DIR, "0");
const OUT_PUBLIC = path.resolve(OUT_DIR, "0", "public");
const OUT_VIEWS = path.resolve(OUT_DIR, "0", "views");
const OUT_ASSETS = path.resolve(OUT_DIR, "0", "assets");

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
	resetBuilderCache();
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
	// OJO: mockear fs.readFileSync en crudo rompe el loader CJS de Node, que lo usa
	// internamente para leer el source de cada módulo (require devolvería {}). Por eso
	// el mock delega al real salvo para server.js, el único path que el builder lee en listen.
	const realReadFileSync = fs.readFileSync.bind(fs);
	t.mock.method(fs, "readFileSync", (filePath, ...args) =>
		String(filePath).endsWith("server.js") ? "process.cwd()" : realReadFileSync(filePath, ...args));
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv, "--format", "esm"]);

			app.html("/", "/v/index.html");
			await app.listen(0, () => {});

			const options = mocks.build.mock.calls[0].arguments[0];
			assert.equal(options.format, "esm");
		}
		finally
		{
			process.argv = originalArgv;
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

			app.html("/", "/v/index.html");
			await app.listen(0, () => {});

			const options = mocks.build.mock.calls[0].arguments[0];
			assert.equal(options.format, undefined);
		}
		finally
		{
			process.argv = originalArgv;
			resetBuilderCache();
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
			resetBuilderCache();

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
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv, "--bundle", "--minify"]);

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
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

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
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

			app.html("/home", "/v/home.html");
			await app.listen(0, () => {});

			assert.equal(mocks.html.mock.calls.length, 1);
			assert.equal(mocks.html.mock.calls[0].arguments[0], "/v/home.html");
			assert.equal(mocks.html.mock.calls[0].arguments[1], true);
		}
		finally
		{
			process.argv = originalArgv;
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

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
			resetBuilderCache();
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("listen: limpia y recrea .lex-press-app con carpetas tag/views/public/assets", async (t) =>
	{
		const originalArgv = process.argv;
		try
		{
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

			app.html("/home", "/v/home.html");
			await app.listen(0, () => {});

			assert.equal(mocks.rm.mock.calls.length, 1);
			assert.equal(mocks.rm.mock.calls[0].arguments[0], OUT_DIR);
			assert.deepEqual(mocks.rm.mock.calls[0].arguments[1], { recursive: true, force: true });

			// La queue ejecuta los jobs en paralelo (intercalados en microtasks), por lo que
			// el orden de los mkdir del init no está garantizado frente a los de cada view.
			// Se verifica el CONJUNTO de directorios creados, no el orden.
			for(const dir of [OUT_DIR, OUT_TAG, OUT_PUBLIC, OUT_VIEWS, OUT_ASSETS])
			{
				assert.ok(
					mocks.mkdir.mock.calls.some(call => call.arguments[0] === dir),
					`mkdir debe crear ${dir}`
				);
			}
		}
		finally
		{
			process.argv = originalArgv;
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

			app.public("/v/pub1");
			app.public("/v/pub2");
			await app.listen(0, () => {});

			assert.equal(mocks.cp.mock.calls.length, 2);
			assert.equal(mocks.cp.mock.calls[0].arguments[0], "/v/pub1");
			assert.ok(String(mocks.cp.mock.calls[0].arguments[1]).endsWith(".lex-press-app/0/public/0"));
			assert.equal(mocks.cp.mock.calls[1].arguments[0], "/v/pub2");
			assert.ok(String(mocks.cp.mock.calls[1].arguments[1]).endsWith(".lex-press-app/0/public/1"));
		}
		finally
		{
			process.argv = originalArgv;
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

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
				assert.ok(String(call.arguments[0]).includes(".lex-press-app/0/views"));
				assert.equal(call.arguments[1], "<html>ok</html>");
			}
		}
		finally
		{
			process.argv = originalArgv;
			resetBuilderCache();
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
			const mocks = setupMocks(t);
			const app = loadBuilder([...originalArgv]);

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
			resetBuilderCache();
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
			const realReadFileSync = fs.readFileSync.bind(fs);
			t.mock.method(fs, "readFileSync", (filePath, ...args) =>
				String(filePath).endsWith("server.js") ? "process.cwd()" : realReadFileSync(filePath, ...args));
			t.mock.method(fs, "existsSync", () => true);

			const app = loadBuilder([...originalArgv]);

			app.html("/home", "/v/home.html");
			await app.listen(0, () => {});

			assert.equal(exit.mock.calls[0].arguments[0], 1);
			const lastRmCall = rm.mock.calls[rm.mock.calls.length - 1];
			assert.equal(lastRmCall.arguments[0], OUT_DIR);
		}
		finally
		{
			process.argv = originalArgv;
			resetBuilderCache();
		}
	});
});
