const express = require('express');
const cookieParser = require('cookie-parser');
const path = require("path");
const fs = require("fs");

const productionDir = path.resolve(process.cwd(), ".lex-press-app");
const viewsDir = path.resolve(productionDir, "views");
const publicDir = path.resolve(productionDir, "public");
const assetsDir = path.resolve(productionDir, "assets");

/** @type {Lexpress} */
const lexpress = () =>
{
	/** @type {LexpressApp} */
	const app = express();

	app.use(express.json());
	app.use(cookieParser());

	app.use(express.static(viewsDir));
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
