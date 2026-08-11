/**
 * @file
 * @source ../../../lib/build-error-html/index.js
 * @description Tests unitarios para lib/build-error-html
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const buildErrorHtml = require("#lib/build-error-html");

/**
 * @typedef {{ file?: string, line?: number, column?: number, lineText?: string }} MessageLocation
 */

/**
 * @typedef {{ text: string, location?: MessageLocation, notes?: Array<{ text: string }> }} TestMessage
 */

/**
 * Construye un mensaje con la forma de esbuild.Message.
 * @param {string} text Texto del mensaje
 * @param {MessageLocation} [location] Ubicación opcional del mensaje
 * @param {Array<{ text: string }>} [notes] Notas opcionales del mensaje
 * @returns {TestMessage}
 */
const makeMessage = (text, location, notes) =>
({
	text,
	location,
	notes
});

/**
 * Construye un objeto que simula esbuild.BuildFailure.
 * @param {Array<TestMessage>} [errors] Mensajes de error
 * @param {Array<TestMessage>} [warnings] Mensajes de warning
 * @returns {Error & { errors: Array<TestMessage>, warnings: Array<TestMessage> }}
 */
const makeBuildFailure = (errors = [], warnings = []) =>
	Object.assign(new Error("Build failed"), { errors, warnings });

describe("buildErrorHtml", () =>
{
	it("Error simple incluye nombre del error escapado", () =>
	{
		const err = new Error("fallo crítico");
		err.name = "Fallo &<Error>";
		const html = buildErrorHtml(err);

		assert.ok(html.includes("Fallo &amp;&lt;Error&gt;"));
		assert.match(html, /<div class="err-name">Fallo &amp;&lt;Error&gt;<\/div>/);
	});

	it("Error simple incluye mensaje escapado", () =>
	{
		const html = buildErrorHtml(new Error("mensaje de prueba"));

		assert.ok(html.includes('<div class="err-msg">mensaje de prueba</div>'));
	});

	it("Error simple incluye stack cuando existe", () =>
	{
		const err = new Error("con stack");
		const html = buildErrorHtml(err);

		assert.ok(html.includes('<div class="err-stack">'));
		assert.ok(html.includes(String(err.stack).split("\n")[0]));
	});

	it('Error sin nombre usa "Error" por defecto', () =>
	{
		const err = /** @type {Error} */ ({ message: "sin nombre" });
		const html = buildErrorHtml(err);

		assert.ok(html.includes('<div class="err-name">Error</div>'));
	});

	it("mensaje con <script> queda escapado (anti-XSS)", () =>
	{
		const html = buildErrorHtml(new Error("<script>alert(1)</script>"));

		assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
		assert.ok(!html.includes("<script>"));
	});

	it("BuildFailure con errors muestra badge con conteo", () =>
	{
		const html = buildErrorHtml(makeBuildFailure([
			makeMessage("primer mensaje"),
			makeMessage("segundo mensaje")
		]));

		assert.ok(html.includes('<div class="section-header error"><span class="badge">2</span> Errors</div>'));
	});

	it("BuildFailure renderiza el texto de cada error", () =>
	{
		const html = buildErrorHtml(makeBuildFailure([
			makeMessage("primer error"),
			makeMessage("segundo error")
		]));

		assert.ok(html.includes('<div class="msg-text error">primer error</div>'));
		assert.ok(html.includes('<div class="msg-text error">segundo error</div>'));
	});

	it("BuildFailure con warnings muestra badge de warnings", () =>
	{
		const html = buildErrorHtml(makeBuildFailure(
			[makeMessage("un error")],
			[makeMessage("un warning")]
		));

		assert.ok(html.includes('<div class="section-header warning"><span class="badge">1</span> Warnings</div>'));
		assert.ok(html.includes('<div class="msg-text warning">un warning</div>'));
	});

	it("BuildFailure sin warnings omite la sección de warnings", () =>
	{
		const html = buildErrorHtml(makeBuildFailure([makeMessage("solo errores")]));

		assert.doesNotMatch(html, /Warnings/);
	});

	it("renderMessage: con location muestra archivo y posición linea:col", () =>
	{
		const html = buildErrorHtml(makeBuildFailure([
			makeMessage("error con ubicación", { file: "src/index.js", line: 12, column: 5, lineText: "const x = 1;" })
		]));

		assert.ok(html.includes('<span class="file">src/index.js</span>'));
		assert.ok(html.includes('<span class="pos">12:5</span>'));
		assert.ok(html.includes("const x = 1;"));
	});

	it("renderMessage: sin location renderiza solo el texto del mensaje", () =>
	{
		const html = buildErrorHtml(makeBuildFailure([
			makeMessage("mensaje sin ubicación")
		]));

		assert.ok(html.includes('<div class="msg-text error">mensaje sin ubicación</div>'));
		assert.doesNotMatch(html, /class="file"/);
		assert.doesNotMatch(html, /class="msg-code"/);
	});

	it("renderMessage: con notes renderiza cada nota como causa", () =>
	{
		const html = buildErrorHtml(makeBuildFailure([
			makeMessage("error con notas", undefined, [
				{ text: "primera causa" },
				{ text: "segunda causa" }
			])
		]));

		assert.ok(html.includes('<div class="cause">primera causa</div>'));
		assert.ok(html.includes('<div class="cause">segunda causa</div>'));
	});

	it("renderCodeContext: dibuja caret solo cuando la columna es válida", () =>
	{
		const withCaret = buildErrorHtml(makeBuildFailure([
			makeMessage("columna válida", { file: "a.js", line: 3, column: 5, lineText: "abcdefgh" })
		]));
		const colCero = buildErrorHtml(makeBuildFailure([
			makeMessage("columna cero", { file: "a.js", line: 3, column: 0, lineText: "abcdefgh" })
		]));
		const colFuera = buildErrorHtml(makeBuildFailure([
			makeMessage("columna fuera de rango", { file: "a.js", line: 3, column: 99, lineText: "abcdefgh" })
		]));

		assert.ok(withCaret.includes("abcdefgh"));
		assert.ok(withCaret.includes("^"));
		assert.ok(colCero.includes("abcdefgh"));
		assert.doesNotMatch(colCero, /\^/);
		assert.ok(colFuera.includes("abcdefgh"));
		assert.doesNotMatch(colFuera, /\^/);
	});

	it("escapeHtml: escapa & < > \" ' y los devuelve como entidades", () =>
	{
		const html = buildErrorHtml(new Error('& < > " \''));
		const inner = (html.match(/<div class="err-msg">([\s\S]*?)<\/div>/) ?? ["", ""])[1];

		assert.ok(inner.includes("&amp;"));
		assert.ok(inner.includes("&lt;"));
		assert.ok(inner.includes("&gt;"));
		assert.ok(inner.includes("&quot;"));
		assert.ok(inner.includes("&#39;"));
		assert.doesNotMatch(inner, /[<>"']/);
		assert.strictEqual(inner, "&amp; &lt; &gt; &quot; &#39;");
	});
});
