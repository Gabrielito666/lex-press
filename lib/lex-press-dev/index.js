const express = require('express');
const Views = require('../views');
const buildFRONT = require('../build-front');
const RoutesMap = require('#lib/routes-map');
const path = require("path");
const buildErrorHTML = require("#lib/build-error-html");
const escapeAssets = require("#lib/production-escape-assets");

const cheerio = require("cheerio");

/**
 * Ruta del endpoint SSE de hot-reload (se monta con app.use en sub-apps, así
 * que el navegador debe pedirla bajo la misma base-url que la página).
 * @type {string}
 */
const RELOAD_ROUTE = "/__lexpress-reload";
/**
 * Ruta del script que abre el EventSource hacia RELOAD_ROUTE.
 * @type {string}
 */
const RELOAD_SCRIPT_ROUTE = "/__lexpress-reload.js";

/**
 * @import {Application} from "express";
 * @import * as ExpressFn from "express"
 * @import {IPage} from "#lib/routes-map";
 */

/**
 * @typedef {Application & {
 *   public: (path: string) => LexpressDevApp;
 *   views: (viewsDir: string) => LexpressDevApp;
 *   html: (route: string, page: string) => LexpressDevApp;
 *   jsx: (route: string, page: string, layout: string|null) => LexpressDevApp;
 * }} LexpressDevApp
 */
/**
 * @typedef {{ (options?: { tag?: string; }):LexpressDevApp } & ExpressFn} LexpressFn
 */

/**@type {string[]}*/
const tags = [];

let tagsCounter = 0;
/**
 * @type {LexpressFn}
 */
const lexpress = Object.assign(/**@param {{ tag?: string }} [options] @returns {LexpressDevApp}*/(options) =>
{
	const tag = options?.tag ?? String(tagsCounter);
	tagsCounter++;

	if(tags.includes(tag))
	{
		throw new Error("[LEX-PRESS BUILDER ERROR]: Conflicto entre los tags de las instancias de lexpress-app. evita usar el mismo tag en diferentes apps. Puede que haya un conflicto  si el nombre que pusiste es un numero o dos tienen el mismo tag.");
	}
	tags.push(tag);

	const app = /**@type {LexpressDevApp}*/(/**@type {unknown}*/(express()));

	const routes = new RoutesMap();

	app.get(RELOAD_ROUTE, (req, res) =>
	{
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
		});

		if(req.headers["last-event-id"] !== undefined)
		{
			res.write("id: 1\ndata: reload\n\n");
		}
		else
		{
			res.write("id: 0\n\n");
		}

		const interval = setInterval(() => res.write(": heartbeat\n\n"), 30000);
		req.on("close", () => clearInterval(interval));
	});

	app.get(RELOAD_SCRIPT_ROUTE, (req, res) =>
	{
		// req.baseUrl cambia según cómo se montó la app ("" en raíz, "/app-2"
		// bajo app1.use("/app-2", app2)): el EventSource debe apuntar al SSE
		// de ESTA app, no a la raíz.
		const baseUrl = req.baseUrl ?? "";
		res.type("js").send(`new EventSource("${baseUrl}${RELOAD_ROUTE}").onmessage = (e) => { if(e.data === "reload") location.reload(); };`)
	});

	/**
	 * @param {string} route
	 * @param {IPage} pageProps
	 */
	const buildAndServe = (route, pageProps) =>
	{
		if(routes.hasRoute(route)) return;
		routes.setRoute(route, { type: "page", ...pageProps });

		const buildOutputPromise = buildFRONT(pageProps, false);
		app.get(route, async(req, res) =>
		{
			const out = await buildOutputPromise;
			if(out.error)
			{
				const errorHTML = buildErrorHTML(out.error, req.baseUrl ?? "");
				res.send(errorHTML);
				return;
			}

			// req.baseUrl: "" para la app raíz, "/app-2" para una sub-app
			// montada bajo app1.use("/app-2", app2). El html compilado
			// referencia /__assets/... como si la app viviera en la raíz,
			// así que hay que (1) prefijar el script de hot-reload y (2)
			// reescribir las urls de assets con la base (como producción
			// hace en HTMLTree.init(req.baseUrl)).
			const baseUrl = req.baseUrl ?? "";
			const $ = cheerio.load(out.htmlText);
			$("head").append(`<script src="${baseUrl}${RELOAD_SCRIPT_ROUTE}" type="module"></script>`)

			res.send(escapeAssets(baseUrl, $.html()));
			return;
		});
		
		buildOutputPromise.then(buildOutput =>
		{
			if(buildOutput.error)
			{
				console.error(buildOutput.error);
				return;
			};

			buildOutput.assets.forEach(asset =>
			{
				const assetRouteStr = "/__assets/" + path.basename(asset.path);
				if(routes.hasRoute(assetRouteStr)) return;
	
				routes.setRoute(assetRouteStr, { type: "asset", name: path.basename(asset.path) });
				app.get(assetRouteStr, (req, res) => res.send(Buffer.from(asset.contents)));
			});
		});
	}

	/**
	 * @param {string} path
	 * @returns {LexpressDevApp}
	 */
	app.public = (path) => app.use(express.static(path));
	/**
	 * @param {string} viewsDir
	 * @returns {LexpressDevApp}
	 */
	app.views = (viewsDir) =>
	{
		const dir = new Views(viewsDir, null);
		dir.forEachJSXFile(page =>
		{
			if(!page.layout) throw new Error(`Layout not found for ${page.file}`);

			app.jsx(page.route, page.file, page.layout);
		});
		dir.forEachHTMLFile(page =>
		{
			app.html(page.route, page.file);
		});
		return app;
	};
	
	/**
	 * @param {string} route
	 * @param {string} page
	 * @returns {LexpressDevApp}
	 */
	app.html = (route, page) =>
	{
		buildAndServe(route, { ext: "html", page, layout: null });
		return app;
	};

	/**
	 * @param {string} route
	 * @param {string} page
	 * @param {string|null} layout
	 * @returns {LexpressDevApp}
	 */
	app.jsx = (route, page, layout) =>
	{
		buildAndServe(route, { ext: "jsx", page, layout });
		return app;
	};
	
	return app;
}, express);

module.exports = lexpress;
