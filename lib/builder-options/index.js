/**
 * @file
 * @source ./lib/builder-options/index.js
 * @description Opciones de build del CLI: parsea argv, valida enums y arma el objeto
 * buildOptions que consume lex-press-builder (y sus helpers).
 */

const { parseArgs } = require("util");

const cliOptions  = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: {
		build: { type: "boolean" },
		format: { type: "string", },
		platform: { type: "string", },
		target: { type: "string", },
		bundle: { type: "boolean", },
		minify: { type: "boolean", },
		sourcemap: { type: "boolean", },
		treeShaking: { type: "boolean", },
		external: { type: "string", multiple: true, },
		tsconfig: { type: "string", },
	},
});

/**
 * @template {readonly string[]} T
 * @param {string | undefined} value
 * @param {T} allowed
 * @param {string} name
 * @returns {T[number] | undefined}
 */
const enumValue = (value, allowed, name) =>
{
	if (value === undefined)
		return undefined;

	if (allowed.includes(value))
		return value;

	throw new TypeError(
		`Invalid --${name}: "${value}". Expected one of: ${allowed.join(", ")}`
	);
}

const FORMAT = /** @type {const} */ (["esm", "cjs", "iife"]);
const PLATFORM = /** @type {const} */ (["browser", "node", "neutral"]);

const buildOptions = {
	format: enumValue(cliOptions.values.format, FORMAT, "format"),
	platform: enumValue(cliOptions.values.platform, PLATFORM, "platform"),
	sourcemap: cliOptions.values.sourcemap,
	target: cliOptions.values.target,
	bundle: cliOptions.values.bundle,
	minify: cliOptions.values.minify,
	treeShaking: cliOptions.values.treeShaking,
	external: cliOptions.values.external,
	tsconfig: cliOptions.values.tsconfig,
};
Object.keys(buildOptions).forEach(key =>
{
	///@ts-ignore
	if(buildOptions[key] === undefined) delete buildOptions[key];
});

module.exports = { buildOptions, enumValue };
