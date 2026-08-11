/**
 * @file
 * @source ./test/unit/build-front/index.test.js
 * @description Tests unitarios para lib/build-front. esbuild expone su API como getters
 * no configurables (exports generado con __toCommonJS), inmunes a t.mock.method, por eso
 * se reemplaza su entrada en el cache de require por un stub con "build" como propiedad
 * plana ANTES de cargar lib/build-front, y cada test la remockea con t.mock.method.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

/**
 * @typedef {{
 *	build: (options: import("esbuild").BuildOptions) => Promise<import("esbuild").BuildResult>;
 * }} IEsbuild
 */

/**
 * Se requiere primero únicamente para poblar el cache de require. Su exports real queda
 * reemplazado abajo por el stub esbuild, así lib/build-front captura el stub al hacer
 * su propio require("esbuild").
 *
 * @type {typeof import("esbuild")}
 */
const esbuildReal = require("esbuild");

/**
 * Stub de esbuild con "build" como propiedad plana y redefinible. Reemplaza el exports
 * real (getter no configurable) en el cache de require; cada test la remockea.
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

const lexBuildHTML = require("@lek-js/lex/build-html");
const buildFRONT = require("#lib/build-front");

/**
 * Simula fs.promises.readFile: el input principal es cualquier ruta que termine en
 * "/page.html" y los scripts externos se sirven según un mapa de sufijos.
 * @param {string} pageContent
 * @param {Record<string, string>} [scripts]
 * @returns {(p: string) => Promise<string>}
 */
const createReadFileMock = (pageContent, scripts = {}) =>
{
	return async(p) =>
	{
		if(p.endsWith("/page.html")) return pageContent;

		for(const [suffix, content] of Object.entries(scripts))
		{
			if(p.endsWith(suffix)) return content;
		}

		throw new Error(`readFile no esperado: ${p}`);
	};
};

/**
 * Construye un OutputFile válido para el resultado mockeado de esbuild.
 * @param {string} filePath
 * @param {string} text
 * @returns {import("esbuild").OutputFile}
 */
const createOutputFile = (filePath, text) =>
{
	return {
		path: filePath,
		contents: new TextEncoder().encode(text),
		hash: "mock-hash",
		text,
	};
};

/**
 * Construye el BuildResult que devuelve el esbuild mockeado en el happy path.
 * @param {import("esbuild").OutputFile[]} outputFiles
 * @returns {import("esbuild").BuildResult}
 */
const createBuildResult = (outputFiles) =>
{
	return { errors: [], warnings: [], outputFiles };
};

/**
 * Construye la salida tipo BuildHTMLOutput que devuelven los builders de Lex.
 * @param {string} htmlText
 * @returns {import("@lek-js/lex/build-html").BuildHTMLOutput}
 */
const createLexOutput = (htmlText) =>
{
	return { htmlText, assets: [], error: null, warnings: [] };
};

/**
 * @returns {void}
 */
describe("buildFRONT", () =>
{
	/**
	 * @returns {Promise<void>}
	 */
	it("dispatcher: ext jsx delega a buildFRONT.jsx", async(t) =>
	{
		const page = "/virtual/p.jsx";
		const layout = "/virtual/l.jsx";

		t.mock.method(buildFRONT, "jsx", async() => ({}));
		t.mock.method(buildFRONT, "html", async() => ({}));

		await buildFRONT({ ext: "jsx", page, layout }, true);

		assert.equal(buildFRONT.jsx.mock.calls.length, 1);
		assert.deepEqual(buildFRONT.jsx.mock.calls[0].arguments, [page, layout, true]);
		assert.equal(buildFRONT.html.mock.calls.length, 0);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("dispatcher: ext html delega a buildFRONT.html", async(t) =>
	{
		const page = "/virtual/page.html";

		t.mock.method(buildFRONT, "html", async() => ({}));
		t.mock.method(buildFRONT, "jsx", async() => ({}));

		await buildFRONT({ ext: "html", page, layout: null }, false);

		assert.equal(buildFRONT.html.mock.calls.length, 1);
		assert.deepEqual(buildFRONT.html.mock.calls[0].arguments, [page, false]);
		assert.equal(buildFRONT.jsx.mock.calls.length, 0);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("html: sin scripts retorna htmlText sin script y sin assets", async(t) =>
	{
		t.mock.method(fs.promises, "readFile", createReadFileMock("<html><body>hola</body></html>"));
		t.mock.method(esbuild, "build", async() => { throw new Error("esbuild no debe llamarse"); });

		const result = await buildFRONT.html("/virtual/page.html", false);

		assert.equal(result.error, null);
		assert.deepEqual(result.assets, []);
		assert.ok(result.htmlText);
		assert.equal(result.htmlText.includes("<script"), false);
		assert.equal(esbuild.build.mock.calls.length, 0);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("html: script module con src resuelve ruta contra el dir del HTML y bundlea", async(t) =>
	{
		const pageHTML = "<html><head></head><body><script type=\"module\" src=\"./app.js\"></script></body></html>";

		t.mock.method(fs.promises, "readFile", createReadFileMock(pageHTML, { "app.js": "console.log('app')" }));
		t.mock.method(esbuild, "build", async() =>
		{
			return createBuildResult([createOutputFile("/virtual-out.js", "console.log('app')")]);
		});

		const result = await buildFRONT.html("/virtual/page.html", false);

		assert.equal(result.error, null);
		assert.equal(esbuild.build.mock.calls.length, 1);

		const buildOptions = esbuild.build.mock.calls[0].arguments[0];
		assert.deepEqual(buildOptions.entryPoints, ["virtual-main.js"]);
		assert.equal((buildOptions.plugins ?? [])[0].name, "virtual-modules");

		assert.ok(result.htmlText);
		assert.ok(result.htmlText.includes("<script type=\"module\">console.log('app')</script>"));
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("html: script module inline se convierte en virtual module", async(t) =>
	{
		const inlineScript = "import x from \"y\";";
		const pageHTML = `<html><head></head><body><script type="module">${inlineScript}</script></body></html>`;

		t.mock.method(fs.promises, "readFile", createReadFileMock(pageHTML));
		t.mock.method(esbuild, "build", async() =>
		{
			return createBuildResult([createOutputFile("/virtual-out.js", inlineScript)]);
		});

		const result = await buildFRONT.html("/virtual/page.html", false);

		assert.equal(result.error, null);
		assert.equal(esbuild.build.mock.calls.length, 1);

		const buildOptions = esbuild.build.mock.calls[0].arguments[0];
		assert.equal((buildOptions.plugins ?? [])[0].name, "virtual-modules");

		assert.ok(result.htmlText);
		assert.ok(result.htmlText.includes(`<script type="module">${inlineScript}</script>`));
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("html: script clásico con src también se bundlea como virtual module", async(t) =>
	{
		const pageHTML = "<html><head></head><body><script src=\"./app.js\"></script></body></html>";

		t.mock.method(fs.promises, "readFile", createReadFileMock(pageHTML, { "app.js": "console.log('app')" }));
		t.mock.method(esbuild, "build", async() =>
		{
			return createBuildResult([createOutputFile("/virtual-out.js", "console.log('app')")]);
		});

		const result = await buildFRONT.html("/virtual/page.html", false);

		assert.equal(result.error, null);
		assert.equal(esbuild.build.mock.calls.length, 1);

		assert.ok(result.htmlText);
		assert.ok(result.htmlText.includes("console.log('app')"));
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("html: error de esbuild.build retorna { error } en el output", async(t) =>
	{
		const pageHTML = "<html><body><script type=\"module\">const x = 1;</script></body></html>";

		t.mock.method(fs.promises, "readFile", createReadFileMock(pageHTML));
		t.mock.method(esbuild, "build", async() =>
		{
			throw new Error("sintaxis");
		});

		const result = await buildFRONT.html("/virtual/page.html", false);

		assert.ok(result.error instanceof Error);
		assert.equal(result.error.message, "sintaxis");
		assert.equal(result.htmlText, null);
		assert.equal(result.assets, null);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("html: bundle exitoso inyecta script type=module en el head", async(t) =>
	{
		const pageHTML = "<html><head></head><body><script type=\"module\">const y = 1;</script></body></html>";

		t.mock.method(fs.promises, "readFile", createReadFileMock(pageHTML));
		t.mock.method(esbuild, "build", async() =>
		{
			return createBuildResult([createOutputFile("/virtual-out.js", "var x=1")]);
		});

		const result = await buildFRONT.html("/virtual/page.html", false);

		assert.equal(result.error, null);
		assert.deepEqual(result.assets, []);
		assert.ok(result.htmlText);
		assert.match(result.htmlText, /<head><script type="module">var x=1<\/script><\/head>/);
		assert.equal(result.htmlText.includes("const y = 1;"), false);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("html: output con css inyecta style en el head", async(t) =>
	{
		const pageHTML = "<html><head></head><body><script type=\"module\">const y = 1;</script></body></html>";

		t.mock.method(fs.promises, "readFile", createReadFileMock(pageHTML));
		t.mock.method(esbuild, "build", async() =>
		{
			return createBuildResult([createOutputFile("/virtual-out.css", "body{color:red}")]);
		});

		const result = await buildFRONT.html("/virtual/page.html", false);

		assert.equal(result.error, null);
		assert.deepEqual(result.assets, []);
		assert.ok(result.htmlText);
		assert.match(result.htmlText, /<head><style>body\{color:red\}<\/style><\/head>/);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("jsx: con layout delega a lexBuildHTML.layout con (layout, page, minify)", async(t) =>
	{
		const expected = createLexOutput("<html>layout</html>");

		t.mock.method(lexBuildHTML, "layout", async() => expected);
		t.mock.method(lexBuildHTML, "standart", async() => createLexOutput("<html>standart</html>"));

		const result = await buildFRONT({ ext: "jsx", page: "/v/p.jsx", layout: "/v/l.jsx" }, false);

		assert.equal(lexBuildHTML.layout.mock.calls.length, 1);
		assert.deepEqual(lexBuildHTML.layout.mock.calls[0].arguments, ["/v/l.jsx", "/v/p.jsx", { minify: false }]);
		assert.equal(lexBuildHTML.standart.mock.calls.length, 0);
		assert.strictEqual(result, expected);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("jsx: sin layout delega a lexBuildHTML.standart con (page, minify)", async(t) =>
	{
		const expected = createLexOutput("<html>standart</html>");

		t.mock.method(lexBuildHTML, "layout", async() => createLexOutput("<html>layout</html>"));
		t.mock.method(lexBuildHTML, "standart", async() => expected);

		const result = await buildFRONT({ ext: "jsx", page: "/v/p.jsx", layout: null }, false);

		assert.equal(lexBuildHTML.standart.mock.calls.length, 1);
		assert.deepEqual(lexBuildHTML.standart.mock.calls[0].arguments, ["/v/p.jsx", { minify: false }]);
		assert.equal(lexBuildHTML.layout.mock.calls.length, 0);
		assert.strictEqual(result, expected);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("jsx: retorna el output del builder de Lex tal cual", async(t) =>
	{
		const expected = createLexOutput("<html>lex</html>");

		t.mock.method(lexBuildHTML, "standart", async() => expected);

		const result = await buildFRONT({ ext: "jsx", page: "/v/p.jsx", layout: null }, true);

		assert.strictEqual(result, expected);
	});
});
