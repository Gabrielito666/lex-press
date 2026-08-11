/**
 * @file
 * @description Tests unitarios para lib/lex-press
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

/**
 * @returns {void}
 */
describe("lex-press", () =>
{
	/**
	 * @returns {void}
	 */
	it("export: sin --build en argv exporta el módulo dev", () =>
	{
		const originalArgv = process.argv;
		try
		{
			process.argv = [...originalArgv];

			delete require.cache[require.resolve("#lib/lex-press")];
			const exported = require("#lib/lex-press");

			assert.strictEqual(exported, require("#lib/lex-press-dev"));
			assert.strictEqual(typeof exported, "function");
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve("#lib/lex-press")];
		}
	});

	/**
	 * @returns {void}
	 */
	it("export: con --build en argv exporta el módulo builder", () =>
	{
		const originalArgv = process.argv;
		try
		{
			process.argv = [...originalArgv, "--build"];

			delete require.cache[require.resolve("#lib/lex-press")];
			const exported = require("#lib/lex-press");

			assert.strictEqual(exported, require("#lib/lex-press-builder"));
			assert.strictEqual(typeof exported, "function");
		}
		finally
		{
			process.argv = originalArgv;
			delete require.cache[require.resolve("#lib/lex-press")];
		}
	});
});
