/**
 * @file
 * @source ./test/integration/static-props.test.js
 * @description Integración de staticProps en dev (in-process) y producción
 * (child_process). La página JSX renderiza el title en el HTML servido (app.jsx
 * y app.views); la página HTML lo crea en cliente, así que se comprueba que el
 * title viaje en el HTML (payload inyectado). Prueba solo la API pública; nace
 * en rojo hasta implementar la feature.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const { getFreePort, waitForListening } = require("../helpers/http.js");

/**
 * Title inyectado vía el canal app.jsx(route, page, layout, { staticProps }).
 * @type {string}
 */
const TITLE_APP_JSX = "STATIC-JSX-VIA-APP-JSX";

/**
 * Title inyectado vía el canal app.views(dir, { staticProps }).
 * @type {string}
 */
const TITLE_APP_VIEWS = "STATIC-JSX-VIA-APP-VIEWS";

/**
 * Title inyectado vía el canal app.html(route, page, { staticProps }).
 * @type {string}
 */
const TITLE_APP_HTML = "STATIC-HTML-VIA-APP-HTML";

/**
 * Levanta el entry del fixture en modo desarrollo (sin --build) en un puerto
 * efímero y espera a que esté escuchando.
 * @returns {Promise<{ child: import("node:child_process").ChildProcess; base: string }>}
 */
const startDevServer = async() =>
{
	const port = await getFreePort();
	const child = spawn("node", ["fixtures/static-props/index.js"], {
		env: { ...process.env, PORT: String(port) },
		stdio: ["ignore", "pipe", "pipe"],
	});
	await waitForListening(child, /escuchando el puerto/, 30000);

	return { child, base: `http://127.0.0.1:${port}` };
};

/**
 * Levanta el server de producción ya compilado (.lex-press-app/server.js) en un
 * puerto efímero y espera a que esté escuchando.
 * @returns {Promise<{ child: import("node:child_process").ChildProcess; base: string }>}
 */
const startProdServer = async() =>
{
	const port = await getFreePort();
	const child = spawn("node", [".lex-press-app/server.js"], {
		env: { ...process.env, PORT: String(port) },
		stdio: ["ignore", "pipe", "pipe"],
	});
	await waitForListening(child, /escuchando el puerto/);

	return { child, base: `http://127.0.0.1:${port}` };
};

/**
 * Pide las tres páginas de la app de staticProps y verifica que cada respuesta
 * traiga 200 y el title del canal que la registró (app.jsx, app.views,
 * app.html). Para la página HTML el title no se renderiza en servidor (lo crea
 * el script en cliente), así que el assert comprueba que el payload inyectado
 * viaje dentro del html servido.
 * @param {string} base Base URL del server (ej: "http://127.0.0.1:1234").
 * @returns {Promise<void>}
 */
const assertStaticPropsServed = async(base) =>
{
	const viaJsx = await fetch(base + "/static-jsx");
	assert.strictEqual(viaJsx.status, 200, "canal app.jsx: GET /static-jsx no responde 200");
	assert.ok(
		(await viaJsx.text()).includes(TITLE_APP_JSX),
		`canal app.jsx: el html de /static-jsx no incluye el title ${TITLE_APP_JSX}`
	);

	const viaViews = await fetch(base + "/");
	assert.strictEqual(viaViews.status, 200, "canal app.views: GET / no responde 200");
	assert.ok(
		(await viaViews.text()).includes(TITLE_APP_VIEWS),
		`canal app.views: el html de / no incluye el title ${TITLE_APP_VIEWS}`
	);

	const viaHtml = await fetch(base + "/static-html");
	assert.strictEqual(viaHtml.status, 200, "canal app.html: GET /static-html no responde 200");
	assert.ok(
		(await viaHtml.text()).includes(TITLE_APP_HTML),
		`canal app.html: el html de /static-html no incluye el title ${TITLE_APP_HTML} (payload inyectado)`
	);
};

/**
 * @returns {void}
 */
describe("integración staticProps", () =>
{
	/**
	 * @returns {void}
	 */
	describe("dev server (child_process)", () =>
	{
		/**@type {import("node:child_process").ChildProcess}*/
		let devChild;
		/**@type {string}*/
		let base;

		/**
		 * @returns {Promise<void>}
		 */
		before(async() =>
		{
			const started = await startDevServer();
			devChild = started.child;
			base = started.base;
		});

		/**
		 * @returns {void}
		 */
		after(() =>
		{
			if(devChild && !devChild.killed)
			{
				devChild.kill();
			}
		});

		/**
		 * @returns {Promise<void>}
		 */
		it("los tres canales sirven su staticProps (app.jsx, app.views, app.html)", async() =>
		{
			await assertStaticPropsServed(base);
		});
	});

	/**
	 * @returns {void}
	 */
	describe("producción compilada (child_process)", () =>
	{
		/**@type {import("node:child_process").ChildProcess}*/
		let prodChild;
		/**@type {string}*/
		let base;

		/**
		 * Limpia el output de builds previos y compila el fixture con el builder
		 * (node fixtures/static-props/index.js --build).
		 * @returns {void}
		 */
		before(() =>
		{
			const outDir = path.resolve(process.cwd(), ".lex-press-app");
			if(fs.existsSync(outDir))
			{
				fs.rmSync(outDir, { recursive: true, force: true });
			}

			const build = spawnSync("node", ["fixtures/static-props/index.js", "--build"], {
				encoding: "utf8",
				timeout: 120000,
				// El builder enlaza el puerto REAL incluso con --build; PORT=0 pide
				// uno efímero y evita el EADDRINUSE contra el 3000 del fixture.
				env: { ...process.env, PORT: "0" },
			});
			assert.strictEqual(build.status, 0, `falló el build de producción: ${build.stderr || build.stdout}`);
		});

		/**
		 * @returns {Promise<void>}
		 */
		before(async() =>
		{
			const started = await startProdServer();
			prodChild = started.child;
			base = started.base;
		});

		/**
		 * @returns {void}
		 */
		after(() =>
		{
			if(prodChild && !prodChild.killed)
			{
				prodChild.kill();
			}
			fs.rmSync(path.resolve(process.cwd(), ".lex-press-app"), { recursive: true, force: true });
		});

		/**
		 * @returns {Promise<void>}
		 */
		it("el build de producción sirve los staticProps de los tres canales", async() =>
		{
			await assertStaticPropsServed(base);
		});
	});
});
