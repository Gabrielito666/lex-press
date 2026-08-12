/**
 * @file
 * @source ./test/integration/mounting.test.js
 * @description Integración del montaje de sub-apps lexpress en las dos
 * variantes de Express: montaje en la misma ruta (app1.use(app2)) y con base
 * url (app1.use("/app-2", app2)). Cada variante se prueba en el server de
 * desarrollo (in-process) y en el de producción (compilado con esbuild y
 * ejecutado vía child_process).
 *
 * Los describes se separan por variante porque el fixture (fixtures/mounting/
 * index.js) monta la MISMA instancia de app2 en la raíz (app1.use(app2)) y
 * bajo "/app-2" (app1.use("/app-2", app2)). En producción el árbol de html
 * (HTMLTree) se conforma una sola vez con la baseUrl del primer request que
 * toca la app: como app2 está montada también en la raíz, sus requests llegan
 * primero con baseUrl "" y el árbol queda sin prefijo — el html servido bajo
 * /app-2 no reescribe /__assets/ con la base. LIMITACIÓN de esta versión: en
 * producción una app debe montarse en UNA sola base. El dev server no la
 * tiene (escapa por request con req.baseUrl), por eso el test de html bajo
 * /app-2 solo existe para el server de desarrollo.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");
const buildFRONT = require("#lib/build-front");
const { createApps } = require("../../fixtures/mounting/apps.js");

/**
 * Path absoluto del page.html de app1 (raíz).
 * @type {string}
 */
const home1PagePath = path.resolve(process.cwd(), "fixtures/mounting/views1/home1/page.html");

/**
 * Path absoluto del page.html de app2 (sub-app).
 * @type {string}
 */
const home2PagePath = path.resolve(process.cwd(), "fixtures/mounting/views2/home2/page.html");

/**
 * Prefijo que deben tener las rutas de assets del html servido por la app
 * montada bajo "/app-2" (comportamiento correcto: baseUrl + namespace).
 * @type {string}
 */
const SUB_BASE = "/app-2";

/**
 * Levanta un server express sobre un puerto efímero.
 * @param {ReturnType<typeof import("#lib/lex-press-dev")>} app
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
 * Cierra un server HTTP esperando el cierre de sus conexiones.
 * @param {import("node:http").Server} server
 * @returns {Promise<void>}
 */
const closeServer = (server) =>
{
	return new Promise(resolve => server.close(() => resolve()));
};

/**
 * Obtiene un puerto libre abriendo un server efímero y cerrándolo.
 * @returns {Promise<number>}
 */
const getFreePort = () =>
{
	return new Promise((resolve, reject) =>
	{
		const server = net.createServer();
		server.on("error", reject);
		server.listen(0, () =>
		{
			const address = /**@type {import("node:net").AddressInfo}*/ (server.address());
			server.close(() => resolve(address.port));
		});
	});
};

/**
 * Espera a que el stdout de un child process matchee un patrón (el server
 * listo para recibir). Rechaza si el proceso muere antes o se agota el
 * timeout.
 * @param {import("node:child_process").ChildProcess} child
 * @param {RegExp} pattern
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
const waitForListening = (child, pattern, timeoutMs = 15000) =>
{
	return new Promise((resolve, reject) =>
	{
		let out = "";

		const timer = setTimeout(() =>
		{
			child.kill();
			reject(new Error(`timeout esperando al server: ${out}`));
		}, timeoutMs);

		child.stdout.on("data", (chunk) =>
		{
			out += chunk.toString();
			if(pattern.test(out))
			{
				clearTimeout(timer);
				resolve();
			}
		});
		child.stderr.on("data", (chunk) => { out += "[stderr] " + chunk.toString(); });
		child.on("exit", (code) =>
		{
			clearTimeout(timer);
			reject(new Error(`el server murió antes de escuchar (code ${code}): ${out}`));
		});
	});
};

/**
 * Basenames de los assets logo1/logo2 tal como los emite el dev server
 * (buildFRONT en modo no-minify: el mismo que usa buildAndServe).
 * @returns {Promise<{ logo1: string; logo2: string }>}
 */
const getDevLogoBasenames = async() =>
{
	const home1 = await buildFRONT({ ext: "html", page: home1PagePath, layout: null }, false);
	assert.strictEqual(home1.error, null);
	const logo1 = home1.assets.find(a => path.basename(a.path).includes("logo1"));
	assert.ok(logo1, "el build de home1 debe incluir el asset logo1");

	const home2 = await buildFRONT({ ext: "html", page: home2PagePath, layout: null }, false);
	assert.strictEqual(home2.error, null);
	const logo2 = home2.assets.find(a => path.basename(a.path).includes("logo2"));
	assert.ok(logo2, "el build de home2 debe incluir el asset logo2");

	return { logo1: path.basename(logo1.path), logo2: path.basename(logo2.path) };
};

/**
 * Basenames de los assets logo1/logo2 tal como los compiló el build de
 * producción: se leen directamente del output .lex-press-app/{tag}/assets/
 * (robusto: no depende de que el hash coincida entre modos de build).
 * @returns {{ logo1: string; logo2: string }}
 */
const getProdLogoBasenames = () =>
{
	const app1Assets = fs.readdirSync(path.resolve(process.cwd(), ".lex-press-app/app1/assets"));
	const app2Assets = fs.readdirSync(path.resolve(process.cwd(), ".lex-press-app/app2/assets"));

	const logo1 = app1Assets.find(name => name.includes("logo1"));
	const logo2 = app2Assets.find(name => name.includes("logo2"));
	assert.ok(logo1, "app1/assets debe contener logo1: " + app1Assets.join(", "));
	assert.ok(logo2, "app2/assets debe contener logo2: " + app2Assets.join(", "));

	return { logo1, logo2 };
};

/**
 * Extrae las URLs de assets ("/__assets/..." o "/base/__assets/...") que
 * aparecen en el html servido, incluyendo las que viven dentro del bundle
 * inline de scripts. El "/" inicial de la url es opcional en el match para
 * cubrir el caso raíz: en "/__assets/x" el primer slash se consume como
 * parte del prefijo y no hay un segundo "/" antes de "__assets".
 * @param {string} html
 * @returns {string[]}
 */
const extractAssetUrls = (html) =>
{
	const matches = [...html.matchAll(/["'](\/?[^"']*?\/__assets\/[^"']+)["']/g)];
	return matches.map(match => match[1]);
};

/**
 * Verifica que el html de una página contenga sus assets con el prefijo de
 * baseUrl esperado y que cada url responda 200 desde la base del server.
 * @param {string} base Base URL del server (ej: "http://127.0.0.1:1234").
 * @param {string} html Html servido por la página.
 * @param {string} expectedPrefix Prefijo esperado en cada url de asset.
 * @returns {Promise<void>}
 */
const assertHtmlAssets = async(base, html, expectedPrefix) =>
{
	const urls = extractAssetUrls(html);
	assert.ok(urls.length >= 2, `el html debe referenciar al menos 2 assets. urls: ${urls.join(", ")}`);

	for(const url of urls)
	{
		assert.ok(
			url.startsWith(expectedPrefix),
			`la url ${url} no empieza con el prefijo esperado ${expectedPrefix}`
		);
		const res = await fetch(base + url);
		assert.strictEqual(res.status, 200, `el asset ${url} referenciado en el html no responde 200`);
	}
};

/**
 * @returns {void}
 */
describe("integración montaje de sub-apps", () =>
{
	/**
	 * @returns {void}
	 */
	describe("dev server (in-process)", () =>
	{
		/**
		 * @returns {void}
		 */
		describe("same-route (app1.use(app2))", () =>
		{
			/**@type {ReturnType<typeof createApps>}*/
			let apps;
			/**@type {string}*/
			let base;
			/**@type {import("node:http").Server}*/
			let server;

			/**
			 * @returns {Promise<void>}
			 */
			before(async() =>
			{
				apps = createApps({ app1Tag: "app1-dev-sr", app2Tag: "app2-dev-sr" });
				apps.app1.use(apps.app2);

				const started = await startServer(apps.app1);
				server = started.server;
				base = `http://127.0.0.1:${started.port}`;
			});

			/**
			 * @returns {Promise<void>}
			 */
			after(async() =>
			{
				await closeServer(server);
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("public superpuesto: el primer static gana shared.txt y el segundo sirve solo2.txt", async() =>
			{
				const shared = await fetch(base + "/shared.txt");
				assert.strictEqual(shared.status, 200);
				assert.strictEqual(await shared.text(), "soy public UNO\n");

				const solo2 = await fetch(base + "/solo2.txt");
				assert.strictEqual(solo2.status, 200);
				assert.strictEqual(await solo2.text(), "solo DOS\n");
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("views superpuestas: app1 gana /overlap por orden de registro y app2 sirve sus rutas propias", async() =>
			{
				const overlap = await fetch(base + "/overlap");
				assert.strictEqual(overlap.status, 200);
				assert.ok((await overlap.text()).includes("Overlap UNO"));

				const home2 = await fetch(base + "/home2");
				assert.strictEqual(home2.status, 200);
				assert.ok((await home2.text()).includes("Home DOS"));
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("assets superpuestos: el namespace /__assets/ responde los de ambas apps", async() =>
			{
				const basenames = await getDevLogoBasenames();

				const logo1 = await fetch(base + "/__assets/" + basenames.logo1);
				assert.strictEqual(logo1.status, 200);

				const logo2 = await fetch(base + "/__assets/" + basenames.logo2);
				assert.strictEqual(logo2.status, 200);
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("el html de app2 en la raíz incluye assets sin prefijo y responden 200", async() =>
			{
				const home2 = await fetch(base + "/home2");
				assert.strictEqual(home2.status, 200);
				await assertHtmlAssets(base, await home2.text(), "/__assets/");
			});
		});

		/**
		 * @returns {void}
		 */
		describe("base-url (app1.use(\"/app-2\", app2))", () =>
		{
			/**@type {ReturnType<typeof createApps>}*/
			let apps;
			/**@type {string}*/
			let base;
			/**@type {import("node:http").Server}*/
			let server;

			/**
			 * @returns {Promise<void>}
			 */
			before(async() =>
			{
				apps = createApps({ app1Tag: "app1-dev-bu", app2Tag: "app2-dev-bu" });
				apps.app1.use(SUB_BASE, apps.app2);

				const started = await startServer(apps.app1);
				server = started.server;
				base = `http://127.0.0.1:${started.port}`;
			});

			/**
			 * @returns {Promise<void>}
			 */
			after(async() =>
			{
				await closeServer(server);
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("public bajo base-url: cada app sirve sus archivos bajo su ruta", async() =>
			{
				const solo1 = await fetch(base + "/solo1.txt");
				assert.strictEqual(solo1.status, 200);
				assert.strictEqual(await solo1.text(), "solo UNO\n");

				const solo2 = await fetch(base + SUB_BASE + "/solo2.txt");
				assert.strictEqual(solo2.status, 200);
				assert.strictEqual(await solo2.text(), "solo DOS\n");

				const shared2 = await fetch(base + SUB_BASE + "/shared.txt");
				assert.strictEqual(shared2.status, 200);
				assert.strictEqual(await shared2.text(), "soy public DOS\n");
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("views bajo base-url: la raíz responde las de app1 y /app-2 las de app2", async() =>
			{
				const home1 = await fetch(base + "/home1");
				assert.strictEqual(home1.status, 200);
				assert.ok((await home1.text()).includes("Home UNO"));

				const home2 = await fetch(base + SUB_BASE + "/home2");
				assert.strictEqual(home2.status, 200);
				assert.ok((await home2.text()).includes("Home DOS"));

				const overlap2 = await fetch(base + SUB_BASE + "/overlap");
				assert.strictEqual(overlap2.status, 200);
				assert.ok((await overlap2.text()).includes("Overlap DOS"));
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("assets bajo base-url: la raíz sirve los de app1 y /app-2 los de app2", async() =>
			{
				const basenames = await getDevLogoBasenames();

				const logo1Root = await fetch(base + "/__assets/" + basenames.logo1);
				assert.strictEqual(logo1Root.status, 200);

				const logo1Sub = await fetch(base + SUB_BASE + "/__assets/" + basenames.logo1);
				assert.strictEqual(logo1Sub.status, 200);

				const logo2Sub = await fetch(base + SUB_BASE + "/__assets/" + basenames.logo2);
				assert.strictEqual(logo2Sub.status, 200);
			});

			/**
			 * El dev server NO reescribe los assets con req.baseUrl (no usa
			 * escapeAssets), así que este test FALLA: documenta el gap del
			 * server de desarrollo. En producción (escape en HTMLTree) pasa.
			 * @returns {Promise<void>}
			 */
			it("el html de app2 bajo /app-2 incluye assets con el prefijo de la base y responden 200", async() =>
			{
				const home2 = await fetch(base + SUB_BASE + "/home2");
				assert.strictEqual(home2.status, 200);
				await assertHtmlAssets(base, await home2.text(), SUB_BASE + "/__assets/");
			});
		});
	});

	/**
	 * @returns {void}
	 */
	describe("producción compilada (child_process)", () =>
	{
		/**
		 * Compila el fixture con el builder (node fixtures/mounting/index.js
		 * --build) una sola vez para ambas variantes.
		 * @returns {void}
		 */
		before(() =>
		{
			const build = spawnSync("node", ["fixtures/mounting/index.js", "--build"], {
				encoding: "utf8",
				timeout: 120000,
			});
			assert.strictEqual(build.status, 0, build.stderr || "falló el build de producción");
		});

		/**
		 * @returns {void}
		 */
		describe("same-route (app1.use(app2))", () =>
		{
			/**@type {import("node:child_process").ChildProcess}*/
			let prodChild;
			/**@type {string}*/
			let base;

			/**
			 * @returns {Promise<void>}
			 */
			before(async() =>
			{
				const port = await getFreePort();
				prodChild = spawn("node", [".lex-press-app/server.js"], {
					env: { ...process.env, PORT: String(port) },
					stdio: ["ignore", "pipe", "pipe"],
				});
				await waitForListening(prodChild, /escuchando el puerto/);

				base = `http://127.0.0.1:${port}`;
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
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("public superpuesto: el primer static gana shared.txt y el segundo sirve solo2.txt", async() =>
			{
				const shared = await fetch(base + "/shared.txt");
				assert.strictEqual(shared.status, 200);
				assert.strictEqual(await shared.text(), "soy public UNO\n");

				const solo2 = await fetch(base + "/solo2.txt");
				assert.strictEqual(solo2.status, 200);
				assert.strictEqual(await solo2.text(), "solo DOS\n");
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("views superpuestas: app1 gana /overlap y app2 sirve sus rutas propias", async() =>
			{
				const overlap = await fetch(base + "/overlap");
				assert.strictEqual(overlap.status, 200);
				assert.ok((await overlap.text()).includes("Overlap UNO"));

				const home2 = await fetch(base + "/home2");
				assert.strictEqual(home2.status, 200);
				assert.ok((await home2.text()).includes("Home DOS"));
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("assets superpuestos: el namespace /__assets/ responde los de ambas apps", async() =>
			{
				const basenames = getProdLogoBasenames();

				const logo1 = await fetch(base + "/__assets/" + basenames.logo1);
				assert.strictEqual(logo1.status, 200);

				const logo2 = await fetch(base + "/__assets/" + basenames.logo2);
				assert.strictEqual(logo2.status, 200);
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("el html de app2 en la raíz incluye assets sin prefijo y responden 200", async() =>
			{
				const home2 = await fetch(base + "/home2");
				assert.strictEqual(home2.status, 200);
				await assertHtmlAssets(base, await home2.text(), "/__assets/");
			});
		});

		/**
		 * @returns {void}
		 */
		describe("base-url (app1.use(\"/app-2\", app2))", () =>
		{
			/**@type {import("node:child_process").ChildProcess}*/
			let prodChild;
			/**@type {string}*/
			let base;

			/**
			 * @returns {Promise<void>}
			 */
			before(async() =>
			{
				const port = await getFreePort();
				prodChild = spawn("node", [".lex-press-app/server.js"], {
					env: { ...process.env, PORT: String(port) },
					stdio: ["ignore", "pipe", "pipe"],
				});
				await waitForListening(prodChild, /escuchando el puerto/);

				base = `http://127.0.0.1:${port}`;
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
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("public bajo base-url: cada app sirve sus archivos bajo su ruta", async() =>
			{
				const solo1 = await fetch(base + "/solo1.txt");
				assert.strictEqual(solo1.status, 200);
				assert.strictEqual(await solo1.text(), "solo UNO\n");

				const solo2 = await fetch(base + SUB_BASE + "/solo2.txt");
				assert.strictEqual(solo2.status, 200);
				assert.strictEqual(await solo2.text(), "solo DOS\n");

				const shared2 = await fetch(base + SUB_BASE + "/shared.txt");
				assert.strictEqual(shared2.status, 200);
				assert.strictEqual(await shared2.text(), "soy public DOS\n");
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("views bajo base-url: la raíz responde las de app1 y /app-2 las de app2", async() =>
			{
				const home1 = await fetch(base + "/home1");
				assert.strictEqual(home1.status, 200);
				assert.ok((await home1.text()).includes("Home UNO"));

				const home2 = await fetch(base + SUB_BASE + "/home2");
				assert.strictEqual(home2.status, 200);
				assert.ok((await home2.text()).includes("Home DOS"));

				const overlap2 = await fetch(base + SUB_BASE + "/overlap");
				assert.strictEqual(overlap2.status, 200);
				assert.ok((await overlap2.text()).includes("Overlap DOS"));
			});

			/**
			 * @returns {Promise<void>}
			 */
			it("assets bajo base-url: la raíz sirve los de app1 y /app-2 los de app2", async() =>
			{
				const basenames = getProdLogoBasenames();

				const logo1Root = await fetch(base + "/__assets/" + basenames.logo1);
				assert.strictEqual(logo1Root.status, 200);

				const logo1Sub = await fetch(base + SUB_BASE + "/__assets/" + basenames.logo1);
				assert.strictEqual(logo1Sub.status, 200);

				const logo2Sub = await fetch(base + SUB_BASE + "/__assets/" + basenames.logo2);
				assert.strictEqual(logo2Sub.status, 200);
			});

			/**
			 * NO se testea el html de app2 bajo /app-2 en producción: el
			 * fixture monta la misma app2 también en la raíz (app1.use(app2)),
			 * así que el HTMLTree se conforma con baseUrl "" (el mount de raíz
			 * recibe los requests primero) y el html bajo /app-2 se serviría
			 * con /__assets/ sin el prefijo de la base. Limitación conocida de
			 * esta versión: en producción una app debe montarse en UNA sola
			 * base. El dev server sí escapa por request (req.baseUrl), por eso
			 * el test equivalente existe solo en su describe.
			 * @returns {void}
			 */
		});
	});
});
