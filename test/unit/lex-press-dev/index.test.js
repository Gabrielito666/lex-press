/**
 * @file
 * @description Tests unitarios para lib/lex-press-dev
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lexpress = require("#lib/lex-press-dev");
const buildFRONT = require("#lib/build-front");

/**
 * @import {BuildHTMLOutput} from "@lek-js/lex/build-html";
 */

/**
 * @typedef {object} RunningServer
 * @property {import("node:http").Server} server
 * @property {number} port
 */

/**
 * @param {import("express").Express} app
 * @returns {Promise<RunningServer>}
 */
const startServer = (app) =>
{
	return new Promise(resolve =>
	{
		const server = app.listen(0, () =>
		{
			const address = /**@type {import("node:net").AddressInfo}*/ (server.address());
			resolve({ server, port: address.port });
		});
	});
};

/**
 * @param {import("node:http").Server} server
 * @returns {Promise<void>}
 */
const closeServer = (server) => new Promise(resolve => server.close(resolve));

/**
 * @param {Record<string, string[]>} tree
 * @returns {Set<string>}
 */
const buildVirtualFilePaths = (tree) =>
{
	/**@type {Set<string>}*/
	const filePaths = new Set();

	for(const [dir, entries] of Object.entries(tree))
	{
		for(const entry of entries)
		{
			if(entry.includes(".")) filePaths.add(path.resolve(dir, entry));
		}
	}

	return filePaths;
};

/**
 * @param {import("node:test").TestContext} t
 * @param {Record<string, string[]>} tree
 * @param {Set<string>} filePaths
 * @returns {void}
 */
const mockVirtualFs = (t, tree, filePaths) =>
{
	t.mock.method(fs, "readdirSync", (dir) => tree[dir] ?? []);
	t.mock.method(fs, "existsSync", (p) => filePaths.has(p));
	t.mock.method(fs, "statSync", (p) => ({ isDirectory: () => !filePaths.has(p) }));
};

/**
 * @param {string} htmlText
 * @returns {Promise<BuildHTMLOutput>}
 */
const buildOutputResolved = async(htmlText) =>
{
	return {
		htmlText,
		assets: [],
		error: null,
		warnings: [],
	};
};

/**
 * @returns {void}
 */
describe("lex-press-dev", () =>
{
	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("jsx: registra ruta y responde el HTML compilado por buildFRONT", async(t) =>
	{
		t.mock.method(buildFRONT, "jsx", () => buildOutputResolved("<html><head></head><body>Hola</body></html>"));

		const app = lexpress();
		app.jsx("/hello", "/virtual/page.jsx", "/virtual/layout.jsx");

		const { server, port } = await startServer(app);
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/hello`);
			assert.strictEqual(res.status, 200);

			const body = await res.text();
			assert.ok(body.includes("Hola"));
			assert.ok(body.includes("/__lexpress-reload.js"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("html: registra ruta html y responde el HTML compilado", async(t) =>
	{
		t.mock.method(buildFRONT, "html", () => buildOutputResolved("<html><head></head><body>Hola</body></html>"));

		const app = lexpress();
		app.html("/hello", "/virtual/page.html");

		const { server, port } = await startServer(app);
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/hello`);
			assert.strictEqual(res.status, 200);

			const body = await res.text();
			assert.ok(body.includes("Hola"));
			assert.ok(body.includes("/__lexpress-reload.js"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("jsx: build fallido responde el HTML de error de buildErrorHtml", async(t) =>
	{
		t.mock.method(buildFRONT, "jsx", async() => ({ error: new Error("boom"), htmlText: null, assets: null }));

		const app = lexpress();
		app.jsx("/hello", "/virtual/page.jsx", "/virtual/layout.jsx");

		const { server, port } = await startServer(app);
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/hello`);
			assert.strictEqual(res.status, 200);

			const body = await res.text();
			assert.ok(body.includes("Build Error"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {void}
	 */
	it("jsx: registrar dos veces la misma ruta no duplica el build", (t) =>
	{
		t.mock.method(buildFRONT, "jsx", () => buildOutputResolved("<html><head></head><body>ok</body></html>"));

		const app = lexpress();
		app.jsx("/hello", "/virtual/page.jsx", "/virtual/layout.jsx");
		app.jsx("/hello", "/virtual/page.jsx", "/virtual/layout.jsx");

		assert.strictEqual(buildFRONT.jsx.mock.calls.length, 1);
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("assets: archivos del build se sirven bajo /__assets/", async(t) =>
	{
		t.mock.method(buildFRONT, "jsx", async() =>
		{
			return {
				htmlText: "<html><head></head><body>ok</body></html>",
				assets: [{ path: "/__assets/virtual-asset.js", contents: "code" }],
				error: null,
				warnings: [],
			};
		});

		const app = lexpress();
		app.jsx("/hello", "/virtual/page.jsx", "/virtual/layout.jsx");

		const { server, port } = await startServer(app);
		try
		{
			const pageRes = await fetch(`http://127.0.0.1:${port}/hello`);
			assert.strictEqual(pageRes.status, 200);
			await pageRes.text();

			await new Promise(resolve => setTimeout(resolve, 0));

			const assetRes = await fetch(`http://127.0.0.1:${port}/__assets/virtual-asset.js`);
			assert.strictEqual(assetRes.status, 200);
			assert.strictEqual(await assetRes.text(), "code");
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("reload: SSE con last-event-id envía \"id: 1\" y data reload", async() =>
	{
		const app = lexpress();
		const { server, port } = await startServer(app);

		const ac = new AbortController();
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/__lexpress-reload`, {
				signal: ac.signal,
				headers: { "last-event-id": "1" },
			});
			assert.strictEqual(res.status, 200);

			const reader = /**@type {ReadableStream<Uint8Array>}*/ (res.body).getReader();
			const { value } = await reader.read();
			const text = new TextDecoder().decode(/**@type {Uint8Array}*/ (value));

			assert.ok(text.includes("id: 1"));
			assert.ok(text.includes("reload"));
		}
		finally
		{
			ac.abort();
			await new Promise(resolve => setTimeout(resolve, 0));
			await closeServer(server);
		}
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("reload: SSE sin last-event-id envía \"id: 0\"", async() =>
	{
		const app = lexpress();
		const { server, port } = await startServer(app);

		const ac = new AbortController();
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/__lexpress-reload`, { signal: ac.signal });
			assert.strictEqual(res.status, 200);

			const reader = /**@type {ReadableStream<Uint8Array>}*/ (res.body).getReader();
			const { value } = await reader.read();
			const text = new TextDecoder().decode(/**@type {Uint8Array}*/ (value));

			assert.ok(text.includes("id: 0"));
		}
		finally
		{
			ac.abort();
			await new Promise(resolve => setTimeout(resolve, 0));
			await closeServer(server);
		}
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("reload.js: responde JS que instancia EventSource y recarga", async() =>
	{
		const app = lexpress();
		const { server, port } = await startServer(app);

		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/__lexpress-reload.js`);
			assert.strictEqual(res.status, 200);
			assert.ok(res.headers.get("content-type").includes("javascript"));

			const body = await res.text();
			assert.ok(body.includes("EventSource"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {Promise<void>}
	 */
	it("views: registra JSX y HTML desde estructura virtual (fs mockeado)", async(t) =>
	{
		/**@type {Record<string, string[]>}*/
		const tree = {
			"/virtual/views": ["about", "home", "layout.jsx"],
			"/virtual/views/about": ["page.jsx", "layout.jsx"],
			"/virtual/views/home": ["page.html"],
		};

		const filePaths = buildVirtualFilePaths(tree);
		mockVirtualFs(t, tree, filePaths);

		t.mock.method(buildFRONT, "jsx", () => buildOutputResolved("<html><head></head><body>About</body></html>"));
		t.mock.method(buildFRONT, "html", () => buildOutputResolved("<html><head></head><body>Home</body></html>"));

		const app = lexpress();
		app.views("/virtual/views");

		assert.strictEqual(buildFRONT.jsx.mock.calls.length, 1);
		assert.strictEqual(buildFRONT.html.mock.calls.length, 1);

		const jsxArguments = buildFRONT.jsx.mock.calls[0].arguments;
		assert.ok(jsxArguments.includes("/virtual/views/about/page.jsx"));
		assert.ok(jsxArguments.includes("/virtual/views/about/layout.jsx"));

		const htmlArguments = buildFRONT.html.mock.calls[0].arguments;
		assert.strictEqual(htmlArguments[0], "/virtual/views/home/page.html");

		const { server, port } = await startServer(app);
		try
		{
			const about = await fetch(`http://127.0.0.1:${port}/about`);
			assert.strictEqual(about.status, 200);
			assert.ok((await about.text()).includes("About"));

			const home = await fetch(`http://127.0.0.1:${port}/home`);
			assert.strictEqual(home.status, 200);
			assert.ok((await home.text()).includes("Home"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @param {import("node:test").TestContext} t
	 * @returns {void}
	 */
	it("views: página jsx sin layout lanza error de layout no encontrado", (t) =>
	{
		/**@type {Record<string, string[]>}*/
		const tree = {
			"/virtual/views": ["only"],
			"/virtual/views/only": ["page.jsx"],
		};

		const filePaths = buildVirtualFilePaths(tree);
		mockVirtualFs(t, tree, filePaths);

		const app = lexpress();
		assert.throws(() => app.views("/virtual/views"), /Layout not found/);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("public: monta express.static en la ruta dada", async() =>
	{
		const app = lexpress();
		assert.strictEqual(app.public("/virtual/public"), app);

		const { server, port } = await startServer(app);
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/`);
			assert.strictEqual(res.status, 404);
		}
		finally
		{
			await closeServer(server);
		}
	});
});
