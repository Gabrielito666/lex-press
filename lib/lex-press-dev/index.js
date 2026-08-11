const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('../views');
const buildFRONT = require('../build-front');
const RoutesMap = require('#lib/routes-map');
const path = require("path");
const buildErrorHTML = require("#lib/build-error-html");

const cheerio = require("cheerio");

/**
 * @import {Application} from "express";
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

/**@type {string[]}*/
const tags = [];

let tagsCounter = 0;
/**
 * @param {{ tag?: string; }} [options]
 * @returns {LexpressDevApp}
 */
const lexpress = (options) =>
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

	app.use(express.json());
	app.use(cookieParser());

	app.get("/__lexpress-reload", (req, res) =>
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

	app.get("/__lexpress-reload.js", (req, res) =>
	{
		res.type("js").send(`new EventSource("/__lexpress-reload").onmessage = (e) => { if(e.data === "reload") location.reload(); };`)
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
				const errorHTML = buildErrorHTML(out.error);
				res.send(errorHTML);
				return;
			}

			const $ = cheerio.load(out.htmlText);
			$("head").append(`<script src="/__lexpress-reload.js" type="module"></script>`)

			res.send($.html());
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
};

module.exports = lexpress;
