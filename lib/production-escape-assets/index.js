/**
 * @file
 * @source ./lib/production-escape-assets/index.js
 * @description Reescribe las URLs de assets ("__assets/..." o "/__assets/...")
 * del html compilado anteponiéndoles un baseUrl, para que las páginas de una
 * app montada bajo app.use("/random-url", otraApp) sigan encontrando sus
 * recursos. Solo toca atributos y contenido de <script>/<style>; el texto
 * visible (ej: <h1>mis /__assets</h1>) nunca se modifica.
 */

const cheerio = require("cheerio");

/**
 * Reemplaza en un string cada ruta de asset ("__assets/algo" o "/__assets/algo")
 * anteponiéndole el baseUrl. No toca: URLs absolutas (https://host/__assets/...),
 * referencias sin nombre de archivo ("/__assets" o "/__assets/" sueltos),
 * data URIs ni texto arbitrario que contenga la subcadena.
 * @param {string} value
 * @param {string} baseUrl
 * @returns {string}
 */
const replaceAssets = (value, baseUrl) =>
{
	// Caso con slash inicial: se valida el carácter anterior al slash, así
	// https://host/__assets/... queda intacto (antes del slash hay una letra).
	const withSlash = value.replace(
		/(?<![\w:/])\/__assets\/([^\s'"()<>,]+)/g,
		(_, rest) => `${baseUrl}/__assets/${rest}`
	);
	// Caso sin slash inicial: el carácter anterior no puede ser /, : ni \w.
	// Ese mismo guardián impide re-tocar lo ya reescrito por el paso anterior.
	return withSlash.replace(
		/(?<![\w:/])__assets\/([^\s'"()<>,]+)/g,
		(_, rest) => `${baseUrl}/__assets/${rest}`
	);
};

/**
 * @param {string} baseUrl Prefijo bajo el cual está montada la app (ej: "/random-url").
 * @param {string} html HTML compilado de una página.
 * @returns {string} El html con las rutas de assets reescritas.
 */
const escapeAssets = (baseUrl, html) =>
{
	if(!html.includes("__assets"))
	{
		return html;
	}

	const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
	const $ = cheerio.load(html);

	$("*").each((_, el) =>
	{
		const element = $(el);
		const attribs = element.attr() ?? {};
		for(const [name, value] of Object.entries(attribs))
		{
			if(typeof value !== "string")
			{
				continue;
			}
			const replaced = replaceAssets(value, normalizedBaseUrl);
			if(replaced !== value)
			{
				element.attr(name, replaced);
			}
		}
	});

	$("script, style").each((_, el) =>
	{
		const children = /** @type {Array<{type: string, data?: string}>} */(el.children ?? []);
		for(const child of children)
		{
			if(child.type !== "text" || typeof child.data !== "string")
			{
				continue;
			}
			const replaced = replaceAssets(child.data, normalizedBaseUrl);
			if(replaced !== child.data)
			{
				child.data = replaced;
			}
		}
	});

	return $.html();
};

module.exports = escapeAssets;
