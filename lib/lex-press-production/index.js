const express = require('express');
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const normalizePath = require("../normalize-path/index.js");
const escapeAssets = require("../production-escape-assets/index.js");

const productionDir = path.resolve(process.cwd(), ".lex-press-app");
const htmlDir = path.resolve(productionDir, "html");

/**
 * @import {LexpressDevApp, LexpressFn} from "#lib/lex-press-dev"
 */

let tagsCounter = 0;

/** @type {LexpressFn} */
const lexpress = Object.assign(/**@param {{ tag?: string }} [options] @returns {LexpressDevApp}*/(options) =>
{
	const tag = options?.tag ? options.tag : String(tagsCounter);
	tagsCounter++;

	const tagDir = path.resolve(productionDir, tag);
	const publicDir = path.resolve(tagDir, "public");
	const assetsDir = path.resolve(tagDir, "assets");

	const app = /** @type {LexpressDevApp} */(/**@type {unknown}*/(express()));

	app.use("/__assets/", express.static(assetsDir));

	/**
	 * @param {string} publicPath
	 * @returns {LexpressDevApp}
	 */
	app.public = (publicPath) =>
	{
		const normalized = normalizePath(publicPath);
		const publicMapPath = path.resolve(tagDir, "public-map.json");
		const publicMap = JSON.parse(fs.readFileSync(publicMapPath, "utf-8"));
		const folder = publicMap[normalized];

		if(folder !== undefined)
		{
			app.use(express.static(path.resolve(publicDir, folder)));
		}

		return app;
	};

	/**
	 * @param {string} viewsDir
	 * @returns {LexpressDevApp}
	 */
	app.views = (viewsDir) =>
	{
		const normalized = normalizePath(viewsDir);
		const viewsMapPath = path.resolve(tagDir, "views-map.json");
		const htmlsMapPath = path.resolve(tagDir, "htmls-map.json");

		const viewsMap = JSON.parse(fs.readFileSync(viewsMapPath, "utf-8"));
		const htmlsMap = JSON.parse(fs.readFileSync(htmlsMapPath, "utf-8"));

		const routes = viewsMap[normalized];

		if(routes !== undefined)
		{
			for(const route of routes)
			{
				const hash = htmlsMap[route];
				if(hash === undefined) continue;

				const htmlPath = path.resolve(htmlDir, `${hash}.html`);
				const htmlContent = fs.readFileSync(htmlPath, "utf-8");

				app.get(route, (req, res) =>
				{
					const html = escapeAssets(req.baseUrl, htmlContent);
					const etag = `"${crypto.createHash("sha256").update(html).digest("hex")}"`;

					res.set("Content-Type", "text/html; charset=utf-8");
					res.set("Cache-Control", "public, max-age=0, must-revalidate");
					res.set("ETag", etag);
					res.send(html);
				});
			}
		}

		return app;
	};

	app.jsx = (route, _page, _layout) =>
	{
		return app;
	};

	app.html = (route, _page) =>
	{
		return app;
	};

	return app;
}, express);

module.exports = lexpress;
