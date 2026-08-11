/**
 * @file
 * @source ./test/integration/index.test.js
 * @description Tests de integración para lex-press
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const buildFRONT = require("#lib/build-front");
const lexpress = require("#lib/lex-press-dev");

/**
 * Path absoluto del fixture home/page.html.
 * @type {string}
 */
const homeHtmlPath = path.resolve(process.cwd(), "fixtures/dev/views/home/page.html");

/**
 * Path absoluto del fixture about/page.jsx.
 * @type {string}
 */
const aboutPagePath = path.resolve(process.cwd(), "fixtures/dev/views/about/page.jsx");

/**
 * Path absoluto del fixture about/layout.jsx.
 * @type {string}
 */
const aboutLayoutPath = path.resolve(process.cwd(), "fixtures/dev/views/about/layout.jsx");

/**
 * Directorio raíz de vistas del fixture dev.
 * @type {string}
 */
const viewsPath = path.resolve(process.cwd(), "fixtures/dev/views");

/**
 * Ruta a un archivo de vista inexistente.
 * @type {string}
 */
const nonexistentHtmlPath = path.resolve(process.cwd(), "fixtures/dev/views/nonexistent.html");

/**
 * Path del asset homero.webp compilado por esbuild.
 * El basename es determinístico para el mismo contenido/opciones,
 * por eso se captura en el primer test y se reutiliza en el test del asset.
 * @type {{ current: string|null }}
 */
const homeroAssetPath = { current: null };

/**
 * Levanta un servidor express sobre un puerto efímero.
 * @param {ReturnType<typeof lexpress>} app
 * @returns {Promise<{ server: import("node:http").Server; port: number }>}
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
 * Cierra un servidor HTTP esperando el cierre de sus conexiones.
 * @param {import("node:http").Server} server
 * @returns {Promise<void>}
 */
const closeServer = (server) =>
{
	return new Promise(resolve => server.close(() => resolve()));
};

/**
 * Devuelve el basename del asset homero.webp compilado.
 * Usa el capturado en el primer test o recompila para obtener el mismo hash.
 * @returns {Promise<string>}
 */
const getHomeroBasename = async() =>
{
	if(homeroAssetPath.current)
	{
		return path.basename(homeroAssetPath.current);
	}

	const result = await buildFRONT({ ext: "html", page: homeHtmlPath, layout: null }, false);
	assert.strictEqual(result.error, null);

	const homero = result.assets.find(a => a.path.includes("homero") && a.path.endsWith(".webp"));
	assert.ok(homero);

	return path.basename(homero.path);
};

/**
 * @returns {void}
 */
describe("integración", () =>
{
	/**
	 * @returns {Promise<void>}
	 */
	it("buildFRONT.html real sobre fixtures home: htmlText contiene script type=module y style, y assets incluye homero.webp", async() =>
	{
		const result = await buildFRONT({ ext: "html", page: homeHtmlPath, layout: null }, false);

		assert.strictEqual(result.error, null);
		assert.match(result.htmlText, /<script type="module">/);
		assert.match(result.htmlText, /<style>/);
		assert.ok(Array.isArray(result.assets));
		assert.ok(result.assets.length > 0);

		const homero = result.assets.find(a => a.path.includes("homero") && a.path.endsWith(".webp"));
		assert.ok(homero);
		homeroAssetPath.current = homero.path;
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("buildFRONT.jsx real sobre fixtures about: htmlText contiene el layout <html> y el texto de la página con lexids", async() =>
	{
		const result = await buildFRONT({ ext: "jsx", page: aboutPagePath, layout: aboutLayoutPath }, false);

		assert.strictEqual(result.error, null);
		assert.ok(result.htmlText.includes("<html"));
		assert.ok(result.htmlText.includes("Mi super about"));
		assert.match(result.htmlText, /<img[^>]*src="[^"]*homero[^"]*"/);
	});

	/**
	 * @returns {Promise<void>}
	 */
	it('dev server real: GET /home responde 200 con "Home" e inyecta /__lexpress-reload.js', async() =>
	{
		const app = lexpress();
		app.views(viewsPath);

		const { server, port } = await startServer(app);
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/home`);
			assert.strictEqual(res.status, 200);

			const body = await res.text();
			assert.ok(body.includes("Home"));
			assert.ok(body.includes("/__lexpress-reload.js"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("dev server real: GET /about responde 200 con el HTML JSX compilado", async() =>
	{
		const app = lexpress();
		app.views(viewsPath);

		const { server, port } = await startServer(app);
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/about`);
			assert.strictEqual(res.status, 200);

			const body = await res.text();
			assert.ok(body.includes("Mi super about"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("dev server real: GET /__lexpress-reload.js responde 200 con JS de EventSource", async() =>
	{
		const app = lexpress();

		const { server, port } = await startServer(app);
		try
		{
			const res = await fetch(`http://127.0.0.1:${port}/__lexpress-reload.js`);
			assert.strictEqual(res.status, 200);

			const contentType = res.headers.get("content-type");
			assert.ok(contentType);
			assert.ok(contentType.includes("javascript"));

			const body = await res.text();
			assert.ok(body.includes("EventSource"));
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("dev server real: GET /__assets/homero.webp responde el asset compilado", async() =>
	{
		const homeroBasename = await getHomeroBasename();

		const app = lexpress();
		app.views(viewsPath);

		const { server, port } = await startServer(app);
		try
		{
			const homeRes = await fetch(`http://127.0.0.1:${port}/home`);
			assert.strictEqual(homeRes.status, 200);
			await homeRes.text();

			await new Promise(resolve => setTimeout(resolve, 50));

			const assetRes = await fetch(`http://127.0.0.1:${port}/__assets/${homeroBasename}`);
			assert.strictEqual(assetRes.status, 200);
			assert.ok(Buffer.byteLength(await assetRes.arrayBuffer()) > 0);
		}
		finally
		{
			await closeServer(server);
		}
	});

	/**
	 * @returns {Promise<void>}
	 */
	it("dev server real: ruta a archivo inexistente rechaza el build propagando ENOENT", async() =>
	{
		await assert.rejects(
			buildFRONT({ ext: "html", page: nonexistentHtmlPath, layout: null }, false),
			/ENOENT/
		);
	});
});
