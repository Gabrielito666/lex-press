/**
 * @file
 * @source ./test/integration/build-server.test.js
 * @description Test de integración que verifica que app.listen() en modo build
 * no falla cuando se usa el server retornado para otras operaciones (como
 * montar sockets, obtener address, cerrar manualmente, etc).
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

/**
 * Path absoluto del directorio de output del builder.
 * @type {string}
 */
const outputDir = path.resolve(process.cwd(), ".lex-press-app");

/**
 * Path absoluto del server.js compilado por el builder.
 * @type {string}
 */
const outputServerFile = path.resolve(outputDir, "server.js");

/**
 * @returns {void}
 */
describe("build no falla al usar app.listen() para otras operaciones", () =>
{
	/**
	 * @returns {void}
	 */
	before(() =>
	{
		if(fs.existsSync(outputDir))
		{
			fs.rmSync(outputDir, { recursive: true, force: true });
		}
	});

	/**
	 * @returns {void}
	 */
	after(() =>
	{
		if(fs.existsSync(outputDir))
		{
			fs.rmSync(outputDir, { recursive: true, force: true });
		}
	});

	/**
	 * @returns {void}
	 */
	it("el fixture corre con --build sin errores y genera el server.js", () =>
	{
		const result = spawnSync("node", ["fixtures/build-server/index.js", "--build"], {
			encoding: "utf8",
			timeout: 30000,
		});

		assert.strictEqual(result.status, 0, `build falló:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);

		assert.ok(
			result.stdout.includes("server address:"),
			"el stdout debe incluir 'server address:' (app.listen retornó un server válido)"
		);

		assert.ok(
			result.stdout.includes("server listening: true"),
			"el stdout debe incluir 'server listening: true'"
		);

		assert.ok(
			result.stdout.includes("server closed manually"),
			"el stdout debe incluir 'server closed manually' (el server se pudo cerrar)"
		);

		assert.ok(
			fs.existsSync(outputServerFile),
			"el archivo server.js debe existir en .lex-press-app/"
		);
	});
});
