/**
 * @file
 * @source ./test/unit/builder-options/index.test.js
 * @description Tests unitarios para lib/builder-options: enumValue y buildOptions
 * construidos con argv controlado (recarga el módulo porque parseArgs corre al cargar).
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const MODULE_ID = "#lib/builder-options";
const modulePath = require.resolve(MODULE_ID);

// Se requiere primero solo para poblar el cache y poder restaurarlo tras cada recarga.
const realModule = require(MODULE_ID);
const originalCacheEntry = require.cache[modulePath];

const savedArgv = process.argv;

/**
 * Recarga el módulo con argv controlado. Al salir restaura argv y el cache original
 * para no contaminar los demás tests (buildOptions depende del argv del proceso).
 * @param {string[]} argv
 * @returns {typeof realModule}
 */
const reloadWithArgv = (argv) =>
{
	process.argv = ["node", "entry.js", ...argv];
	delete require.cache[modulePath];
	try
	{
		return require(modulePath);
	}
	finally
	{
		process.argv = savedArgv;
		require.cache[modulePath] = originalCacheEntry;
	}
};

/**
 * @returns {void}
 */
describe("builder-options", () =>
{
	/**
	 * @returns {void}
	 */
	it("enumValue: retorna el valor si está en allowed", () =>
	{
		assert.equal(realModule.enumValue("esm", ["esm", "cjs", "iife"], "format"), "esm");
	});

	/**
	 * @returns {void}
	 */
	it("enumValue: undefined retorna undefined", () =>
	{
		assert.equal(realModule.enumValue(undefined, ["esm"], "format"), undefined);
	});

	/**
	 * @returns {void}
	 */
	it("enumValue: valor inválido lanza TypeError con el nombre del flag", () =>
	{
		assert.throws(
			() => realModule.enumValue("umd", ["esm", "cjs"], "format"),
			(err) => err instanceof TypeError && /Invalid --format/.test(err.message)
		);
	});

	/**
	 * @returns {void}
	 */
	it("enumValue: el mensaje lista los valores permitidos", () =>
	{
		assert.throws(
			() => realModule.enumValue("x", ["esm", "cjs"], "format"),
			(err) => err instanceof TypeError && err.message.includes("esm, cjs")
		);
	});

	/**
	 * @returns {void}
	 */
	it("buildOptions: sin flags queda vacío (keys undefined eliminadas)", () =>
	{
		const { buildOptions } = reloadWithArgv([]);

		assert.deepEqual(buildOptions, {});
	});

	/**
	 * @returns {void}
	 */
	it("buildOptions: parsea flags de un solo valor", () =>
	{
		const { buildOptions } = reloadWithArgv(["--format=esm", "--platform=node", "--target=es2022"]);

		assert.deepEqual(buildOptions, { format: "esm", platform: "node", target: "es2022" });
	});

	/**
	 * @returns {void}
	 */
	it("buildOptions: flags booleanos quedan en true", () =>
	{
		const { buildOptions } = reloadWithArgv(["--bundle", "--minify", "--treeShaking"]);

		assert.deepEqual(buildOptions, { bundle: true, minify: true, treeShaking: true });
	});

	/**
	 * @returns {void}
	 */
	it("buildOptions: external acumula múltiples valores", () =>
	{
		const { buildOptions } = reloadWithArgv(["--external=dep-a", "--external=dep-b"]);

		assert.deepEqual(buildOptions, { external: ["dep-a", "dep-b"] });
	});

	/**
	 * @returns {void}
	 */
	it("buildOptions: enum inválido lanza TypeError al cargar el módulo", () =>
	{
		assert.throws(
			() => reloadWithArgv(["--format=umd"]),
			(err) => err instanceof TypeError && /Invalid --format/.test(err.message)
		);
	});
});
