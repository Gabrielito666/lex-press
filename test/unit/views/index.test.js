/**
 * @file
 * @source ./test/unit/views/index.test.js
 * @description Tests unitarios para lib/views
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Views = require("#lib/views");

/**
 * @typedef {Object<string, string[]>} FsTree
 */

/**
 * @param {import("node:test").TestContext} t
 * @param {FsTree} tree
 * @returns {void}
 */
const mountTree = (t, tree) =>
{
	const filePaths = new Set();
	for(const [dir, entries] of Object.entries(tree))
	{
		for(const entry of entries)
		{
			if(entry.includes("."))
			{
				filePaths.add(path.resolve(dir, entry));
			}
		}
	}
	t.mock.method(fs, "readdirSync", (dir) => tree[dir] ?? []);
	t.mock.method(fs, "existsSync", (p) => filePaths.has(p));
	t.mock.method(fs, "statSync", (p) => ({ isDirectory: () => !filePaths.has(p) }));
}

describe("Views", () =>
{
	it("Dir: detecta page.html y crea Page con ext html", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["home"],
			"/virtual/views/home": ["page.html"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages.length, 1);
		assert.equal(pages[0].file, path.resolve("/virtual/views/home", "page.html"));
		assert.equal(pages[0].ext, "html");
	});

	it("Dir: detecta page.jsx y prioriza sobre page.html existente", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["home"],
			"/virtual/views/home": ["page.html", "page.jsx"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages.length, 1);
		assert.equal(pages[0].file, path.resolve("/virtual/views/home", "page.jsx"));
		assert.equal(pages[0].ext, "jsx");
	});

	it("Dir: detecta layout.jsx en el directorio", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["layout.jsx"],
		});
		const views = new Views("/virtual/views");
		assert.equal(views.layoutPath, path.resolve("/virtual/views", "layout.jsx"));
	});

	it("Dir: detecta server-props.js en el directorio", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["server-props.js"],
		});
		const views = new Views("/virtual/views");
		assert.equal(views.serverPropsPath, path.resolve("/virtual/views", "server-props.js"));
	});

	it("Dir: registra subdirectorios recursivamente como Dir hijos", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["home", "about"],
			"/virtual/views/home": [],
			"/virtual/views/about": ["contact"],
			"/virtual/views/about/contact": [],
		});
		const views = new Views("/virtual/views");
		const about = views.dirs.find(dir => path.basename(dir.dirname) === "about");
		assert.equal(views.dirs.length, 2);
		assert.ok(about);
		assert.equal(about.dirs.length, 1);
		assert.equal(path.basename(about.dirs[0].dirname), "contact");
		assert.equal(about.dirs[0].parent, about);
	});

	it("forEachFile: visita page propia y todas las páginas anidadas", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["page.html", "home", "about"],
			"/virtual/views/home": ["page.jsx"],
			"/virtual/views/about": ["contact"],
			"/virtual/views/about/contact": ["page.html"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages.length, 3);
		assert.deepEqual(
			pages.map(page => page.file).sort(),
			[
				path.resolve("/virtual/views", "page.html"),
				path.resolve("/virtual/views/home", "page.jsx"),
				path.resolve("/virtual/views/about/contact", "page.html"),
			].sort()
		);
	});

	it("forEachJSXFile: visita solo páginas con ext jsx", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["home", "about"],
			"/virtual/views/home": ["page.html"],
			"/virtual/views/about": ["page.jsx"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachJSXFile(page => pages.push(page));
		assert.equal(pages.length, 1);
		assert.equal(pages[0].file, path.resolve("/virtual/views/about", "page.jsx"));
		assert.equal(pages[0].ext, "jsx");
	});

	it("forEachHTMLFile: visita solo páginas con ext html", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["home", "about"],
			"/virtual/views/home": ["page.html"],
			"/virtual/views/about": ["page.jsx"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachHTMLFile(page => pages.push(page));
		assert.equal(pages.length, 1);
		assert.equal(pages[0].file, path.resolve("/virtual/views/home", "page.html"));
		assert.equal(pages[0].ext, "html");
	});

	it("Page.layout: retorna layoutPath del propio directorio", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["home"],
			"/virtual/views/home": ["layout.jsx", "page.html"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages[0].layout, path.resolve("/virtual/views/home", "layout.jsx"));
	});

	it("Page.layout: sube al dir padre si el local no tiene layout", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["layout.jsx", "about"],
			"/virtual/views/about": ["contact"],
			"/virtual/views/about/contact": ["page.jsx"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages[0].layout, path.resolve("/virtual/views", "layout.jsx"));
	});

	it("Page.layout: retorna null si ninguna carpeta de la cadena tiene layout", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["about"],
			"/virtual/views/about": ["contact"],
			"/virtual/views/about/contact": ["page.html"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages[0].layout, null);
	});

	it("Page.route: arma ruta anidada desde parents (ej: /about/contact)", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["about"],
			"/virtual/views/about": ["contact"],
			"/virtual/views/about/contact": ["page.html"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages[0].route, "/about/contact");
	});

	it("Page.route: retorna \"/\" para página en la raíz de views", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["page.html"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		assert.equal(pages[0].route, "/");
	});

	it("Page.serverPropsModule: retorna path si existe server-props.js, null si no", (t) =>
	{
		mountTree(t, {
			"/virtual/views": ["withprops", "noprops"],
			"/virtual/views/withprops": ["server-props.js", "page.html"],
			"/virtual/views/noprops": ["page.html"],
		});
		const views = new Views("/virtual/views");
		const pages = [];
		views.forEachFile(page => pages.push(page));
		const withProps = pages.find(page => page.file === path.resolve("/virtual/views/withprops", "page.html"));
		const noProps = pages.find(page => page.file === path.resolve("/virtual/views/noprops", "page.html"));
		assert.equal(withProps.serverPropsModule, path.resolve("/virtual/views/withprops", "server-props.js"));
		assert.equal(noProps.serverPropsModule, null);
	});
});
