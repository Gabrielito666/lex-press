const express = require('express');
const cookieParser = require('cookie-parser');
const serverPropsHTML = require("../server-props-html");

/** @import { ServerPropsFunc } from "../server-props-html" */

/**
 * @typedef {{ [route: string]: { htmlBase64: string, serverProps: ServerPropsFunc|null } }} BuildedRoutes
 */

/**
 * @typedef {import('express').Application & {
 *   public: (path: string) => LexpressApp,
 *   views: (viewsDir: string) => LexpressApp,
 *   html: (route: string, page: string) => { serverProps: (serverPropsFunc: ServerPropsFunc) => void },
 *   jsx: (route: string, page: string, layout: string|null) => { serverProps: (serverPropsFunc: ServerPropsFunc) => void },
 *   listen: (...params: any[]) => void
 * }} LexpressApp
 */

/**
 * @callback Lexpress
 * @returns {LexpressApp}
 */

/** @type {BuildedRoutes} */
const BUILDED_ROUTES = {/*FROM BUILD*/};

/** @type {Lexpress} */
const lexpress = () =>
{
	/** @type {LexpressApp} */
	const app = express();

	app.use(express.json());
	app.use(cookieParser());

	app.public = (path) => app.use(express.static(path));
	app.views = (_viewsDir) =>
	{
		/*Ignore this method... the build process will handle it*/
	};
	
	app.jsx = (route, _page, _layout) =>
	{
		if(!BUILDED_ROUTES[route])
		{
			throw new Error(`Route ${route} not found`);
		}
		/*Ignore this method... the build process will handle it*/
		return {
			serverProps: (serverPropsFunc) =>
			{
				if(!BUILDED_ROUTES[route].serverProps && !serverPropsFunc)
				{
					throw new Error(`Server props function is required for route ${route}`);
				}
				if(!BUILDED_ROUTES[route].serverProps && serverPropsFunc)
				{
					BUILDED_ROUTES[route].serverProps = serverPropsFunc;
				}
			}
		};
	};
	app.html = (route, _page) =>
	{
		if(!BUILDED_ROUTES[route])
		{
			throw new Error(`Route ${route} not found`);
		}
		/*Ignore this method... the build process will handle it*/
		return {
			serverProps: (serverPropsFunc) =>
			{
				if(!BUILDED_ROUTES[route].serverProps && !serverPropsFunc)
				{
					throw new Error(`Server props function is required for route ${route}`);
				}
				if(!BUILDED_ROUTES[route].serverProps && serverPropsFunc)
				{
					BUILDED_ROUTES[route].serverProps = serverPropsFunc;
				}
			}
		};
	};

	const oldListen = app.listen;

	app.listen = async(...params) =>
	{
		Object.entries(BUILDED_ROUTES).forEach(([route, { htmlBase64, serverProps }]) =>
		{
			const html = Buffer.from(htmlBase64, "base64").toString("utf-8");
			if(serverProps)
			{
				app.get(route, async(req, res) =>
				{
					const dynamicHtml = await serverPropsHTML(html, serverProps, req);
					res.send(dynamicHtml);
				});
			}
			else
			{
				app.get(route, (req, res) =>
				{
					res.send(html);
				});
			}
		});

		oldListen.bind(app)(...params);
	};
	
	return app;
};

module.exports = lexpress;
