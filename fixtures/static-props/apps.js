/**
 * @file
 * @source ./fixtures/static-props/apps.js
 * @description Crea una app lexpress que registra la misma vista estática por
 * los tres canales de staticProps (app.jsx, app.views y app.html), cada uno con
 * un título DISTINTO para poder identificar qué canal inyectó los props en el
 * html servido. Sirve para probar la feature staticProps en dev y en producción.
 */

const lexpress = require("lex-press");
const path = require("path");

/**
 * @typedef {ReturnType<typeof lexpress>} LexApp
 */

/**
 * @param {{ tag?: string }} [options] Tag de la app (en dev debe ser único por
 * instancia: el dev server valida tags globales).
 * @returns {{ app: LexApp }}
 */
const createStaticPropsApps = (options = {}) =>
{
	const app = lexpress({ tag: options.tag ?? "static-props" });

	app.jsx(
		"/static-jsx",
		path.resolve(process.cwd(), "fixtures/static-props/views/page.jsx"),
		path.resolve(process.cwd(), "fixtures/static-props/views/layout.jsx"),
		{ staticProps: { title: "STATIC-JSX-VIA-APP-JSX" } }
	);

	// app.views registra page.jsx bajo "/" (con layout.jsx como layout).
	app.views(path.resolve(process.cwd(), "fixtures/static-props/views"), { staticProps: { title: "STATIC-JSX-VIA-APP-VIEWS" } });

	app.html(
		"/static-html",
		path.resolve(process.cwd(), "fixtures/static-props/pages/html.html"),
		{ staticProps: { title: "STATIC-HTML-VIA-APP-HTML" } }
	);

	return { app };
};

module.exports = { createStaticPropsApps };
