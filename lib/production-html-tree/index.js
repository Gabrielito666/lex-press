/**
 * @file
 * @source ./lib/production-html-tree/index.js
 * @description Clase que recorre un directorio de forma recursiva y SÍNCRONA
 * buscando archivos index.html, les aplica un callback de transformación a su
 * contenido y guarda un map privado con la ruta relativa como clave
 * (ej: "/" y "/ruta1") y un objeto { html, etag } como valor, donde el etag
 * es el sha256 del html transformado. El constructor recibe el callback de
 * transformación y la baseUrl llega recién en init() — porque el prefijo de
 * montaje (ej: "/random-url") solo se conoce cuando la app se monta, no
 * cuando se construye el árbol.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const escapeAssets = require("#lib/production-escape-assets");

/**
 * @typedef {Object} HtmlEntry
 * @property {string} html HTML final transformado.
 * @property {string} etag ETag fuerte (sha256 del html) entre comillas.
 */

/**
 * Normaliza el pathname de un request para buscarlo en el árbol de html:
 * decodifica el URI, rechaza path traversal (segmentos "..") y colapsa el
 * trailing slash (ej: "/ruta1/" => "/ruta1"). Devuelve null si la ruta es
 * inválida (decode fallido o traversal).
 * @param {string} pathname
 * @returns {string|null}
 */
const normalizeRoute = (pathname) =>
{
	let decoded;
	try
	{
		decoded = decodeURIComponent(pathname);
	}
	catch
	{
		return null;
	}

	if(decoded.includes(".."))
	{
		return null;
	}

	if(decoded.length > 1 && decoded.endsWith("/"))
	{
		decoded = decoded.slice(0, -1);
	}

	return decoded;
};

/**
 * Árbol de HTML de producción: recibe el directorio de views ya compilado y
 * un callback opcional de transformación (por defecto el escape de assets con
 * la baseUrl que reciba init()). init(baseUrl) conforma el map guardando
 * ruta => { html, etag } y recién ahí se conoce el prefijo de montaje.
 * Solo considera archivos llamados exactamente index.html.
 */
const HTMLTree = class
{
	/**@type {Map<string, HtmlEntry>}*/
	#map = new Map();

	/**@type {boolean}*/
	#ready = false;

	/**@type {string}*/
	#dirPath;

	/**
	 * @param {string} dirPath Path absoluto o relativo al directorio raíz.
	 */
	constructor(dirPath)
	{
		const root = path.resolve(dirPath);

		if(!fs.existsSync(root) || !fs.statSync(root).isDirectory())
		{
			throw new Error(`[LEX-PRESS HTML-TREE ERROR]: "${root}" not exists or is not a directory.`);
		}

		this.#dirPath = root;
	}

	/**
	 * Indica si el map ya fue conformado con init().
	 * @returns {boolean}
	 */
	get ready()
	{
		return this.#ready;
	}

	/**
	 * Conforma el map: guarda la baseUrl, lee cada index.html, lo transforma y
	 * le calcula su etag. Solo surte efecto la primera vez (el árbol es
	 * estático). Sin callback en el constructor usa por defecto el escape de
	 * assets con la baseUrl recibida.
	 * @param {string} [baseUrl] Prefijo de montaje (ej: "/random-url") usado
	 * por el callback por defecto para reescribir los assets.
	 * @returns {void}
	 */
	init(baseUrl = "")
	{
		if(this.#ready)
		{
			return;
		}

		/**@type {(original: string) => string}*/
		const callback = (original) => escapeAssets(baseUrl, original);
		this.#walk(this.#dirPath, "/", callback);
		this.#ready = true;
	}

	/**
	 * Recorre el directorio actual: si contiene index.html lo transforma, le
	 * calcula su etag y lo guarda en el map con la ruta relativa, luego
	 * desciende a cada subdirectorio.
	 * @param {string} currentDir Directorio que se está visitando.
	 * @param {string} route Ruta relativa acumulada (ej: "/" o "/ruta1").
	 * @param {(original: string) => string} callback Transformación del HTML.
	 * @returns {void}
	 */
	#walk(currentDir, route, callback)
	{
		const indexHtmlPath = path.resolve(currentDir, "index.html");

		if(fs.existsSync(indexHtmlPath))
		{
			const htmlContent = fs.readFileSync(indexHtmlPath, "utf8");
			const html = callback(htmlContent);
			const etag = `"${crypto.createHash("sha256").update(html).digest("hex")}"`;
			this.#map.set(route, { html, etag });
		}

		const entries = fs.readdirSync(currentDir, { withFileTypes: true });

		entries.forEach(entry =>
		{
			if(entry.isDirectory())
			{
				this.#walk(
					path.resolve(currentDir, entry.name),
					path.join(route, entry.name),
					callback
				);
			}
		});
	}

	/**
	 * Busca una ruta en el árbol normalizando antes el pathname (decode URI,
	 * rechazo de traversal y colapso de trailing slash). Si la ruta termina en
	 * "/index.html" se le quita ese sufijo antes de buscar (ej:
	 * "/ruta1/index.html" => "/ruta1") y si queda vacía se normaliza a "/".
	 * @param {string} route
	 * @returns {HtmlEntry|undefined}
	 */
	get(route)
	{
		const normalized = normalizeRoute(route);
		if(normalized === null)
		{
			return undefined;
		}

		const cleanRoute = normalized.endsWith("/index.html")
			? normalized.slice(0, -"/index.html".length) || "/"
			: normalized;

		return this.#map.get(cleanRoute);
	}
};

module.exports = HTMLTree;
