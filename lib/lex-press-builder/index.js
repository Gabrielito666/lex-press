const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('#lib/views');
const BuilderQueue = require("#lib/builder-queue");
const fs = require('fs').promises;
const fsSync = require("fs");
const path = require('path');
const { buildView, buildServer } = require("#lib/builder-helpers");

/**
 * @import { LexpressDevApp } from "#lib/lex-press-dev";
 */

const outputDir = path.resolve(process.cwd(), ".lex-press-app");
const outputServerFile = path.resolve(outputDir, "server.js");

//Init de global bundle
const globalQueue = new BuilderQueue(async() =>
{
	if(fsSync.existsSync(outputDir))
	{
		await fs.rm(outputDir, { recursive:true, force: true });
	}
	await fs.mkdir(outputDir);
});

/**@type {Array<InstanceType<typeof BuilderQueue>>}*/
const localQueuesList = [];

let tagsCounter = 0;

/**@type {string[]}*/
const tags = [];

/** @type {typeof import("#lib/lex-press-dev")} */
const lexpress = (options) =>
{	
	const tag = options?.tag ?? String(tagsCounter);
	tagsCounter++;
	
	if(tags.includes(tag))
	{
		throw new Error("[LEX-PRESS BUILDER ERROR]: Conflicto entre los tags de las instancias de lexpress-app. evita usar el mismo tag en diferentes apps. Puede que haya un conflicto  si el nombre que pusiste es un numero o dos tienen el mismo tag.");
	}
	tags.push(tag);

	const app = /** @type {LexpressDevApp} */(/**@type {unknown}*/(express()));

	app.use(express.json());
	app.use(cookieParser());

	const outputTagDir = path.resolve(outputDir, tag);
	const outputPublicDir = path.resolve(outputTagDir, "public");
	const outputViewsDir = path.resolve(outputTagDir, "views");
	const outputAssetsDir = path.resolve(outputTagDir, "assets");

	const localQueue = new BuilderQueue(async() =>
	{
		await globalQueue.init;
		await fs.mkdir(outputTagDir, { recursive: true });
		await fs.mkdir(outputPublicDir, { recursive: true });
		await fs.mkdir(outputViewsDir, { recursive: true });
		await fs.mkdir(outputAssetsDir, { recursive: true });
	});
	localQueuesList.push(localQueue);
	
	let publicDirsCounter = 0;
	/**
	 * @param {string} publicPath
	 * @returns {LexpressDevApp}
	 */
	app.public = (publicPath) =>
	{
		app.use(express.static(publicPath));

		localQueue.add(async () =>
		{
			const dirPath = path.resolve(outputPublicDir, String(publicDirsCounter++));
			await fs.cp(publicPath, dirPath, { recursive: true });
		});

		return app;
	};
	
	/**
	 * @param {string} viewsDir
	 * @returns {LexpressDevApp}
	 */
	app.views = (viewsDir) =>
	{
		const dir = new Views(viewsDir, null);
		dir.forEachJSXFile(page => { app.jsx(page.route, page.file, page.layout); });
		dir.forEachHTMLFile(page => { app.html(page.route, page.file); });
		return app;
	};

	/**
	 * @param {string} route
	 * @param {string} page
	 * @returns {LexpressDevApp}
	 */
	app.html = (route, page) =>
	{
		localQueue.add(() => buildView(route, { ext: "html", page, layout: null }, outputViewsDir, outputAssetsDir));
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
		localQueue.add(() => buildView(route, { ext: "jsx", page, layout }, outputViewsDir, outputAssetsDir));
		return app;
	};

	/**@type {import('express').Application["listen"]}*/
	app.listen = async(...params) =>
	{
		try
		{
			globalQueue.add(() => buildServer(outputServerFile));
			localQueuesList.forEach(q =>
			{
				globalQueue.add(() => q.all());
			});

			await globalQueue.all();

			console.log("Builded server folder created at .lex-press-app/");

			if(fsSync.readFileSync(path.resolve(process.cwd(), ".lex-press-app/server.js"), "utf-8").includes("__dirname"))
			{
				console.warn("The server file contains __dirname, this is not supported by the production server. Please use process.cwd() instead.");
			}

		}
		catch(err)
		{
			console.error("[LEX-PRESS BUILD ERROR]: An error occurred while building the application.");
			await fs.rm(outputDir, { recursive: true, force: true });
			console.error(err);
			process.exit(1);
		}

		process.exit(0);
	};
	
	return app;
};

module.exports = lexpress;
