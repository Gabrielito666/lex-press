const express = require('express');
const path = require("path");
const fs = require("fs");
const HTMLTree = require("#lib/production-html-tree");

const productionDir = path.resolve(process.cwd(), ".lex-press-app");

/**
 * @import {LexpressDevApp} from "#lib/lex-press-dev"
 */

let tagsCounter = 0;

/** @type {typeof import("#lib/lex-press-dev")} */
const lexpress = (options) =>
{
	const tag = options?.tag ? options.tag : String(tagsCounter);
	tagsCounter++;

	const viewsDir = path.resolve(productionDir, tag, "views");
	const publicDir = path.resolve(productionDir, tag, "public");
	const assetsDir = path.resolve(productionDir, tag, "assets");

	const htmlTree = new HTMLTree(viewsDir);

	const app = /** @type {LexpressDevApp} */(/**@type {unknown}*/(express()));

	app.use((req, res, next) =>
	{
		if(req.method !== "GET" && req.method !== "HEAD")
		{
			return next();
		}

		if(!htmlTree.ready) htmlTree.init(req.baseUrl);

		const entry = htmlTree.get(req.path);
		if(entry === undefined)
		{
			return next();
		}

		res.set("Content-Type", "text/html; charset=utf-8");
		res.set("Cache-Control", "public, max-age=0, must-revalidate");
		res.set("ETag", entry.etag);

		res.send(entry.html);
	});

	fs.readdirSync(publicDir)
		.map(folder => Number(path.basename(folder)))
		.sort((a, b) => a-b)
		.map(folderNum => path.resolve(publicDir, String(folderNum)))
		.forEach(folder => { app.use(express.static(folder)); });

	app.use("/__assets/", express.static(assetsDir));

	app.public = (path) => 
	{
		/*Ignore this method... the build process will handle it*/
		return app;
	};
	app.views = (_viewsDir) =>
	{
		/*Ignore this method... the build process will handle it*/
		return app;
	};
	
	app.jsx = (route, _page, _layout) =>
	{
		/*Ignore this method... the build process will handle it*/
		return app;
		
	};
	app.html = (route, _page) =>
	{
		/*Ignore this method... the build process will handle it*/
		return app;
	};
	
	return app;
};

module.exports = lexpress;
