/**
 * @file
 * @source ./test/unit/production-html-tree/index.test.js
 * @description Tests unitarios para lib/production-html-tree
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const HTMLTree = require("#lib/production-html-tree");

/**
 * @typedef {Object<string, string[]>} FsTree
 */

/**
 * Monta un fs virtual sobre el singleton node:fs (patrón de test/unit/views).
 * Toda entrada con "." se trata como archivo (con contenido simulado único
 * basado en su path por defecto, o el que entregue contentFor), el resto como
 * directorio. IMPORTANTE: el require del módulo bajo test va al top-level
 * porque mockear fs.readFileSync rompe el loader CJS si ocurre un require()
 * posterior.
 * @param {import("node:test").TestContext} t
 * @param {FsTree} tree Mapa de directorio absoluto => entradas.
 * @param {(filePath: string) => string} [contentFor] Genera el contenido de cada archivo.
 * @returns {void}
 */
const mountTree = (t, tree, contentFor = (filePath) => `<html><h1>${filePath}</h1></html>`) =>
{
	const dirPaths = new Set(Object.keys(tree));
	const filePaths = new Set();
	const contents = new Map();

	for(const [dir, entries] of Object.entries(tree))
	{
		for(const entry of entries)
		{
			if(entry.includes("."))
			{
				const filePath = path.resolve(dir, entry);
				filePaths.add(filePath);
				contents.set(filePath, contentFor(filePath));
			}
		}
	}

	t.mock.method(fs, "readdirSync", (dir) =>
	{
		const entries = tree[dir] ?? [];
		return entries.map(entry => ({
			name: entry,
			isDirectory: () => !entry.includes("."),
		}));
	});
	t.mock.method(fs, "existsSync", (p) => dirPaths.has(p) || filePaths.has(p));
	t.mock.method(fs, "statSync", (p) => ({ isDirectory: () => dirPaths.has(p) }));
	t.mock.method(fs, "readFileSync", (p) => contents.get(p));
};

describe("HTMLTree", () =>
{
	it("ready es false antes de init y true después", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["index.html"],
		});
		const tree = new HTMLTree("/virtual/views");

		assert.equal(tree.ready, false);

		tree.init("/random-url");

		assert.equal(tree.ready, true);
	});

	it("recorre recursivamente guardando ruta => { html, etag } (ej: \"/\" y \"/ruta1\")", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["index.html", "ruta1"],
			"/virtual/views/ruta1": ["index.html"],
		});
		const tree = new HTMLTree("/virtual/views");
		tree.init("/random-url");

		// Contenido simulado sin "__assets": escapeAssets lo deja intacto.
		const rootHtml = `<html><h1>${path.resolve("/virtual/views", "index.html")}</h1></html>`;
		const ruta1Html = `<html><h1>${path.resolve("/virtual/views/ruta1", "index.html")}</h1></html>`;

		assert.deepEqual(tree.get("/"), {
			html: rootHtml,
			etag: `"${createHash("sha256").update(rootHtml).digest("hex")}"`,
		});
		assert.deepEqual(tree.get("/ruta1"), {
			html: ruta1Html,
			etag: `"${createHash("sha256").update(ruta1Html).digest("hex")}"`,
		});
	});

	it("el callback por defecto escapa los assets con la baseUrl recibida en init()", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["index.html"],
		}, () => '<html><head></head><body><img src="/__assets/logo.png"></body></html>');
		const tree = new HTMLTree("/virtual/views");
		tree.init("/random-url");

		assert.equal(
			tree.get("/").html,
			'<html><head></head><body><img src="/random-url/__assets/logo.png"></body></html>'
		);
	});

	it("init() dos veces no re-conforma el map (árbol estático)", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["index.html"],
		}, () => '<html><body><img src="/__assets/logo.png"></body></html>');
		const tree = new HTMLTree("/virtual/views");
		tree.init("/primera");
		tree.init("/segunda");

		// La primera baseUrl gana; la segunda llamada es un no-op.
		assert.equal(
			tree.get("/").html,
			'<html><body><img src="/primera/__assets/logo.png"></body></html>'
		);
	});

	it("solo procesa archivos index.html, ignora otros html", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["index.html", "other.html", "ruta1"],
			"/virtual/views/ruta1": ["index.html", "otro.html"],
		});
		const tree = new HTMLTree("/virtual/views");
		tree.init();

		assert.equal(
			tree.get("/").html,
			`<html><h1>${path.resolve("/virtual/views", "index.html")}</h1></html>`
		);
		assert.equal(
			tree.get("/ruta1").html,
			`<html><h1>${path.resolve("/virtual/views/ruta1", "index.html")}</h1></html>`
		);
		assert.equal(fs.readFileSync.mock.calls.length, 2);
	});

	it("no agrega directorios que no contienen index.html", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["ruta1"],
			"/virtual/views/ruta1": ["sub"],
			"/virtual/views/ruta1/sub": ["index.html"],
		});
		const tree = new HTMLTree("/virtual/views");
		tree.init();

		assert.equal(tree.get("/"), undefined);
		assert.equal(tree.get("/ruta1"), undefined);
		assert.equal(
			tree.get("/ruta1/sub").html,
			`<html><h1>${path.resolve("/virtual/views/ruta1/sub", "index.html")}</h1></html>`
		);
	});

	it("get() devuelve undefined para rutas inexistentes", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["index.html"],
		});
		const tree = new HTMLTree("/virtual/views");
		tree.init();

		assert.equal(
			tree.get("/").html,
			`<html><h1>${path.resolve("/virtual/views", "index.html")}</h1></html>`
		);
		assert.equal(tree.get("/about"), undefined);
	});

	it("get() quita el sufijo /index.html y normaliza la raíz a \"/\"", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["index.html", "ruta1"],
			"/virtual/views/ruta1": ["index.html"],
		});
		const tree = new HTMLTree("/virtual/views");
		tree.init();
		const rootContent = `<html><h1>${path.resolve("/virtual/views", "index.html")}</h1></html>`;
		const ruta1Content = `<html><h1>${path.resolve("/virtual/views/ruta1", "index.html")}</h1></html>`;

		assert.equal(tree.get("/index.html").html, rootContent);
		assert.equal(tree.get("/ruta1/index.html").html, ruta1Content);
		assert.equal(tree.get("/about/index.html"), undefined);
	});

	it("get normaliza estilo express.static: decode URI, trailing slash y traversal", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["sub ruta"],
			"/virtual/views/sub ruta": ["index.html"],
		});
		const tree = new HTMLTree("/virtual/views");
		tree.init();

		assert.equal(
			tree.get("/sub%20ruta/").html, // decode %20 + trailing slash
			`<html><h1>${path.resolve("/virtual/views/sub ruta", "index.html")}</h1></html>`
		);
		assert.equal(
			tree.get("/sub%20ruta/index.html").html, // combina con sufijo index
			`<html><h1>${path.resolve("/virtual/views/sub ruta", "index.html")}</h1></html>`
		);
		assert.equal(tree.get("/../secret"), undefined); // traversal rechazado
		assert.equal(tree.get("%ZZ"), undefined);        // URI malformado rechazado
	});

	it("lanza error si el directorio no existe", (t) =>
	{
		mountTree(t, {});
		assert.throws(
			() => new HTMLTree("/virtual/views"),
			/not exists or is not a directory/
		);
	});
});
