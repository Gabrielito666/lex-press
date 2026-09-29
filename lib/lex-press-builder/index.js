const express = require('express');
const Views = require('#lib/views');
const BuilderQueue = require("#lib/builder-queue");
const fs = require('fs').promises;
const fsSync = require("fs");
const path = require('path');
const normalizePath = require('#lib/normalize-path');
const { buildView, buildServer } = require("#lib/builder-helpers");

/**
 * @import { LexpressDevApp, LexpressFn } from "#lib/lex-press-dev";
 */

const outputDir = path.resolve(process.cwd(), ".lex-press-app");
const outputServerFile = path.resolve(outputDir, "server.js");
const outputHtmlDir = path.resolve(outputDir, "html");

//Init de global bundle
const globalQueue = new BuilderQueue(async() =>
{
	if(fsSync.existsSync(outputDir))
	{
		await fs.rm(outputDir, { recursive:true, force: true });
	}
	await fs.mkdir(outputDir);
	await fs.mkdir(outputHtmlDir);
});

/**@type {Array<InstanceType<typeof BuilderQueue>>}*/
const localQueuesList = [];

/**@type {Array<{outputTagDir: string, publicMap: Record<string, string>, viewsMap: Record<string, string[]>, htmlsMap: Record<string, string>}>}*/
const mapsList = [];

/**@type {InstanceType<typeof BuilderQueue>}*/
let mapsQueue;

let tagsCounter = 0;

/**@type {string[]}*/
const tags = [];

/** @type {LexpressFn} */
const lexpress = Object.assign(/**@param {{ tag?: string }} [options] @returns {LexpressDevApp}*/(options) =>
{	
	const tag = options?.tag ?? String(tagsCounter);
	tagsCounter++;
	
	if(tags.includes(tag))
	{
		throw new Error("[LEX-PRESS BUILDER ERROR]: Conflicto entre los tags de las instancias de lexpress-app. evita usar el mismo tag en diferentes apps. Puede que haya un conflicto  si el nombre que pusiste es un numero o dos tienen el mismo tag.");
	}
	tags.push(tag);

	const app = /** @type {LexpressDevApp} */(/**@type {unknown}*/(express()));

	const outputTagDir = path.resolve(outputDir, tag);
	const outputPublicDir = path.resolve(outputTagDir, "public");
	const outputAssetsDir = path.resolve(outputTagDir, "assets");

	/** @type {Record<string, string>} */
	const publicMap = {};

	/** @type {Record<string, string[]>} */
	const viewsMap = {};

	/** @type {Record<string, string>} */
	const htmlsMap = {};

	const localQueue = new BuilderQueue(async() =>
	{
		await globalQueue.init;
		await fs.mkdir(outputTagDir, { recursive: true });
		await fs.mkdir(outputPublicDir, { recursive: true });
		await fs.mkdir(outputAssetsDir, { recursive: true });
	});
	localQueuesList.push(localQueue);
	mapsList.push({ outputTagDir, publicMap, viewsMap, htmlsMap });
	
	let publicDirsCounter = 0;
	/**
	 * @param {string} publicPath
	 * @param {LexpressOptions} [options]
	 * @returns {LexpressDevApp}
	 */
	app.public = (publicPath, options) =>
	{
		app.use(express.static(publicPath));

		const normalized = options?.key ?? normalizePath(publicPath);
		const folderName = String(publicDirsCounter++);
		publicMap[normalized] = folderName;

		localQueue.add(async () =>
		{
			const dirPath = path.resolve(outputPublicDir, folderName);
			await fs.cp(publicPath, dirPath, { recursive: true });
		});

		return app;
	};
	
	/**
	 * @param {string} viewsDir
	 * @param {LexpressOptions} [options]
	 * @returns {LexpressDevApp}
	 */
	app.views = (viewsDir, options) =>
	{
		const normalized = options?.key ?? normalizePath(viewsDir);
		viewsMap[normalized] = [];

		const dir = new Views(viewsDir, null);
		dir.forEachJSXFile(page =>
		{
			app.jsx(page.route, page.file, page.layout);
			viewsMap[normalized].push(page.route);
		});
		dir.forEachHTMLFile(page =>
		{
			app.html(page.route, page.file);
			viewsMap[normalized].push(page.route);
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
		localQueue.add(async () =>
		{
			const hash = await buildView(route, { ext: "html", page, layout: null }, outputHtmlDir, outputAssetsDir);
			htmlsMap[route] = hash;
		});
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
		localQueue.add(async () =>
		{
			const hash = await buildView(route, { ext: "jsx", page, layout }, outputHtmlDir, outputAssetsDir);
			htmlsMap[route] = hash;
		});
		return app;
	};

	const originalListen = app.listen;

	/**@type {import('express').Application["listen"]}*/
	app.listen = (...params) =>
	{
		(async() =>
		{
			if(!mapsQueue)
			{
				mapsQueue = new BuilderQueue(async () =>
				{
					await Promise.all(localQueuesList.map(q => q.all()));
				});
			}

			for(const maps of mapsList)
			{
				mapsQueue.add(async () =>
				{
					await fs.writeFile(
						path.resolve(maps.outputTagDir, "htmls-map.json"),
						JSON.stringify(maps.htmlsMap, null, 2),
						"utf-8"
					);
				});

				mapsQueue.add(async () =>
				{
					await fs.writeFile(
						path.resolve(maps.outputTagDir, "public-map.json"),
						JSON.stringify(maps.publicMap, null, 2),
						"utf-8"
					);
				});

				mapsQueue.add(async () =>
				{
					await fs.writeFile(
						path.resolve(maps.outputTagDir, "views-map.json"),
						JSON.stringify(maps.viewsMap, null, 2),
						"utf-8"
					);
				});
			}

			globalQueue.add(() => buildServer(outputServerFile));
			globalQueue.add(() => mapsQueue.all());

			await globalQueue.all();	
		})()
		.catch(async err =>
		{
			console.error("[LEX-PRESS BUILD ERROR]: An error occurred while building the application.");
			await fs.rm(outputDir, { recursive: true, force: true });
			console.error(err);
			process.exit(1);
		})
		.then(() =>
		{
			console.log("Builded server folder created at .lex-press-app/");

			if(fsSync.readFileSync(path.resolve(process.cwd(), ".lex-press-app/server.js"), "utf-8").includes("__dirname"))
			{
				console.info("The server file contains __dirname. Note that __dirname is a valid option for resolving paths to views or public, but it will only work if you add a key parameter to those methods. For other routes, it is recommended to use process.cwd() or an environment variable.");
			}

			process.exit(0);
		});
		return originalListen.bind(app)(...params);
	};
	
	return app;
}, express);

module.exports = lexpress;
