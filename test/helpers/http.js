/**
 * @file
 * @source ./test/helpers/http.js
 * @description Helpers HTTP compartidos por los tests de integración: levantar y cerrar
 * servers express en puertos efímeros (startServer/closeServer), conseguir un puerto libre
 * (getFreePort) y esperar a que un child process imprima su mensaje de "escuchando"
 * (waitForListening). Movidos desde test/integration/mounting.test.js para que
 * index.test.js no mantenga copias duplicadas.
 */

const net = require("node:net");

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

module.exports = { startServer, closeServer, getFreePort, waitForListening };
