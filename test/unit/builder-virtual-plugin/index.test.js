/**
 * @file
 * @source ./test/unit/builder-virtual-plugin/index.test.js
 * @description Tests unitarios para lib/builder-virtual-plugin: el setup registra
 * onResolve/onLoad que reemplazan require("lex-press") por el template de producción real.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const plugin = require("#lib/builder-virtual-plugin");

const templateReal = fs.readFileSync(
	path.resolve(process.cwd(), "lib/lex-press-production/index.js"),
	"utf-8"
);

/**
 * @typedef {{
 *	opts: { filter: RegExp };
 *	cb: (args: { path: string }) => unknown;
 * }} OnResolveCall
 * @typedef {{
 *	opts: { filter: RegExp, namespace: string };
 *	cb: () => unknown;
 * }} OnLoadCall
 */

/**
 * Ejecuta plugin.setup con un build fake que captura los handlers registrados.
 * @returns {{
 *	onResolveCalls: OnResolveCall[];
 *	onLoadCalls: OnLoadCall[];
 * }}
 */
const captureSetup = () =>
{
	/** @type {OnResolveCall[]} */
	const onResolveCalls = [];
	/** @type {OnLoadCall[]} */
	const onLoadCalls = [];

	plugin.setup(/** @type {any} */({
		onResolve: (opts, cb) =>
		{
			onResolveCalls.push({ opts, cb });
		},
		onLoad: (opts, cb) =>
		{
			onLoadCalls.push({ opts, cb });
		},
	}));

	return { onResolveCalls, onLoadCalls };
};

/**
 * @returns {void}
 */
describe("builder-virtual-plugin", () =>
{
	/**
	 * @returns {void}
	 */
	it("name: es virtual-lex-press", () =>
	{
		assert.equal(plugin.name, "virtual-lex-press");
	});

	/**
	 * @returns {void}
	 */
	it("setup: es una función", () =>
	{
		assert.equal(typeof plugin.setup, "function");
	});

	/**
	 * @returns {void}
	 */
	it("setup: registra un onResolve y un onLoad", () =>
	{
		const { onResolveCalls, onLoadCalls } = captureSetup();

		assert.equal(onResolveCalls.length, 1);
		assert.equal(onLoadCalls.length, 1);
	});

	/**
	 * @returns {void}
	 */
	it("onResolve: el filter matchea solo el paquete lex-press exacto", () =>
	{
		const { onResolveCalls } = captureSetup();
		const filter = onResolveCalls[0].opts.filter;

		assert.equal(filter.test("lex-press"), true);
		assert.equal(filter.test("lex-press/subpath"), false);
		assert.equal(filter.test("not-lex-press"), false);
	});

	/**
	 * @returns {void}
	 */
	it("onResolve: el callback mapea al namespace virtual-lexpress", () =>
	{
		const { onResolveCalls } = captureSetup();

		const out = onResolveCalls[0].cb({ path: "lex-press" });

		assert.deepEqual(out, { path: "lex-press", namespace: "virtual-lexpress" });
	});

	/**
	 * @returns {void}
	 */
	it("onLoad: el callback sirve el template de producción real", () =>
	{
		const { onLoadCalls } = captureSetup();

		const out = /** @type {{ contents: string }} */ (onLoadCalls[0].cb());

		assert.equal(out.contents, templateReal);
	});

	/**
	 * @returns {void}
	 */
	it("onLoad: usa loader js y resolveDir apuntando a la carpeta del template", () =>
	{
		const { onLoadCalls } = captureSetup();

		const out = /** @type {{ loader: string, resolveDir: string }} */ (onLoadCalls[0].cb());

		assert.equal(out.loader, "js");
		assert.equal(
			out.resolveDir,
			path.resolve(process.cwd(), "node_modules/lex-press/lib/lex-press-production/")
		);
	});

	/**
	 * @returns {void}
	 */
	it("onLoad: el namespace filtrado es virtual-lexpress", () =>
	{
		const { onLoadCalls } = captureSetup();

		assert.equal(onLoadCalls[0].opts.namespace, "virtual-lexpress");
	});
});
