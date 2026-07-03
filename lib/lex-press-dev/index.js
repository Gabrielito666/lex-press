const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('../views');
const buildFRONT = require('../build-front');
const routesHandler = require('../routes-handler');
const path = require("path");
/**
 * @import { Routes, RouteProps } from "#lib/routes-handler"
 * @import {Application} from "express"
 */

/**
 * @typedef {Application & {
 *   public: (path: string) => LexpressDevApp;
 *   views: (viewsDir: string) => LexpressDevApp;
 *   html: (route: string, page: string) => LexpressDevApp;
 *   jsx: (route: string, page: string, layout: string|null) => LexpressDevApp;
 *   lexpress: { cache: Routes }
 * }} LexpressDevApp
 */


/**
 * @returns {LexpressDevApp}
 */
const lexpress = () =>
{
	const app = /**@type {LexpressDevApp}*/(/**@type {unknown}*/(express()));
	const routes = routesHandler();
	const assetsRoutes = /**@type {string[]}*/([]);

	app.use(express.json());
	app.use(cookieParser());

	/**
	 * @param {string} route
	 * @param {RouteProps} routeProps
	 */
	const buildAndServe = async(route, routeProps) =>
	{
		if(routes.hasRoute(route)) return;
		routes.setRoute(route, routeProps);

		const buildOutput = await buildFRONT(routeProps, false);
		app.get(route, (req, res) => res.send(buildOutput.htmlText));
		
		buildOutput.assets.forEach(asset =>
		{

			const assetRouteStr = "/lex-assets/" + path.basename(asset.path);
			if(assetsRoutes.includes(assetRouteStr)) return;

			assetsRoutes.push(assetRouteStr);
			app.get(assetRouteStr, (req, res) => res.send(Buffer.from(asset.contents)));
		});
	}


	app.public = (path) => app.use(express.static(path));
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
	
	app.html = (route, page) =>
	{
		buildAndServe(route, { ext: "html", page, layout: null });
		return app;
	};

	app.jsx = (route, page, layout) =>
	{
		buildAndServe(route, { ext: "jsx", page, layout });
		return app;
	};
	
	return app;
};

module.exports = lexpress;
